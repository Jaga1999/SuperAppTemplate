# Architecture

SuperApp is a **single-module monolith** organised as feature packages, sitting behind an nginx edge and fronting a
private Keycloak. This page explains how a request travels, where each responsibility lives, and why.

## 1. Runtime topology

| Container | Network | Role | Public? |
|---|---|---|---|
| `nginx` | edge | Serves the SPA, security headers, edge rate limits, proxies `/api`, `/oauth2`, `/login/oauth2`, `/auth` to the BFF | **yes (:8080)** |
| `backend` | edge + internal | The BFF: OAuth client, API, Keycloak proxy, event producer/consumer | no |
| `keycloak` | internal | Identity provider (realm `superapp`), runs on Temurin 25 | no |
| `postgres` | internal | Two databases with separate users: `superapp` and `keycloak` | no |
| `redis` | internal | Revocation markers, refresh single-flight, rate-limit buckets | no |
| `kafka` | internal | KRaft broker; topics declared by the BFF at startup | no |
| `mailpit` | internal | Dev SMTP sink (replace with a real SMTP relay in production) | no |

Every container gets only the environment variables it needs (see `compose.yaml`). Keycloak cannot be reached from the
internet at all; the browser reaches its login pages only through the BFF's allow-listed proxy.

## 2. The BFF pattern

The browser holds **no tokens**. After sign-in, the BFF stores Keycloak's tokens in three cookies:

| Cookie | Content | Flags |
|---|---|---|
| `__Host-sa_at` | access token | HttpOnly, Secure, SameSite=Lax, Path=/ |
| `__Host-sa_rt` | refresh token | same |
| `__Host-sa_ar` | in-flight authorization request (state, nonce, PKCE verifier, return path), 10 min | same |

Each value is AES-256-GCM encrypted; keys are derived per purpose with HKDF (Java 25 `javax.crypto.KDF`) from
`BFF_COOKIE_ENCRYPTION_KEY`, and the purpose is bound as associated data, so a cookie cannot be replayed as another kind.
No `HttpSession` exists anywhere, so any BFF instance can serve any request.

### Sign-in

```
SPA ──(full-page nav)──► /oauth2/authorization/keycloak?returnTo=/app&screen=register|idp=google|action=…
BFF  builds the request (PKCE S256, nonce, allow-listed extras) → encrypted __Host-sa_ar cookie
     302 → /auth/realms/superapp/protocol/openid-connect/auth?…            (same origin, through the BFF proxy)
Keycloak renders the themed page (Keycloakify) … user signs in / registers / does MFA …
     302 → /login/oauth2/code/keycloak?code=…&state=…
BFF  validates state, exchanges the code on the private network (client secret + PKCE verifier),
     validates the ID token (nonce), writes the token cookies, publishes UserSignedIn, 302 → returnTo
```

`returnTo`, `screen`, `idp`, `action` and `email` are validated against allow-lists in `LoginOptions`, so the login
entry point can't be abused as an open redirect or for parameter injection.

### Every API call

```
SPA fetch /api/v1/… (cookies + X-XSRF-TOKEN on writes)
  → RequestIdFilter → CsrfFilter (+ CSRF_VERIFIED gate) → TokenRefreshFilter → BearerTokenAuthenticationFilter
  → RateLimitFilter → controller
```

- **CSRF**: `csrf.spa()` (double-submit cookie). Spring skips CSRF for bearer requests, and our bearer token comes from
  a cookie, so `CookieBearerTokenResolver` yields it only after `CsrfFilter` marked the request verified.
- **Local JWT validation**: `NimbusJwtDecoder` with the internal JWKS; checks issuer (public URL), `typ=Bearer`, `azp`,
  `aud` and the Redis revocation markers. No introspection call per request.
- **Silent refresh**: if the access token expires within the skew, `TokenRefreshFilter` refreshes it. Keycloak allows
  zero refresh-token reuse, so `RefreshCoordinator` takes a Redis lock per refresh token; parallel requests (on any
  instance) wait and reuse the encrypted result.
- **Rate limits**: Redis Lua token bucket per user (or IP when anonymous) for reads, writes and auth; nginx adds
  coarse per-IP limits in front.
- **Errors**: everything leaves as `application/problem+json` (RFC 9457) with a stable `type` URI; internals never leak.

### Sign-out and instant revocation

| Trigger | Path to the BFF | Effect |
|---|---|---|
| User clicks *Sign out* | `POST /api/auth/logout` | Keycloak logout by refresh token, cookies cleared |
| Signed out elsewhere, session killed by admin | Keycloak **back-channel logout** → `POST /api/auth/backchannel-logout` (private network only; nginx returns 404 for it) | Redis `sid` marker → the access token is rejected on the next request |
| Logout, account deleted or disabled, password reset | Keycloak event → SPI → Kafka `keycloak.events` → `KeycloakEventsListener` | session or per-user watermark revocation |

Access tokens live 5 minutes, but revocation takes effect on the very next request through the Redis markers.

## 3. Keycloak behind the BFF

`KeycloakProxyRoutes` (Spring Cloud Gateway Server WebMVC) proxies only:

- `/auth/realms/superapp/protocol/openid-connect/auth`
- `/auth/realms/superapp/login-actions/**`
- `/auth/realms/superapp/broker/**` (Google callbacks)
- `/auth/resources/**` (theme assets)

Everything else (token, userinfo, JWKS, account console, admin console, other realms) returns 404. The BFF strips its
own cookies before forwarding, and the gateway sends `X-Forwarded-*` so Keycloak sees the real client IP and host.

Keycloak uses **split-horizon URLs**: tokens are issued for `${PUBLIC_URL}/auth/realms/superapp`, while the BFF talks to
`http://keycloak:8080/auth` internally. Client registrations are explicit (no discovery at startup).

## 4. Backend modules

```
com.superapp
├── shared      crypto, web (problems, request id), config (Jackson, Kafka topics, clock, API versioning), outbox
├── auth        BFF security: chains, cookies, OAuth client, token refresh, revocation, rate limits, Keycloak proxy
├── identity    Keycloak Admin API client (@HttpExchange), Keycloak events consumer, account endpoints
├── user        local user projection (app_user), /me
├── todo        the example feature: API, service, events, quota, premium rules
├── activity    activity feed built from todo events (Kafka consumer)
└── admin       admin overview and user management (role admin)
```

Rules (enforced by `ArchitectureTest` with ArchUnit, not by Spring Modulith):

- A feature exposes a small public API in its root package; everything else lives in `<feature>.internal`.
- No feature may use another feature's `internal` package. `shared` depends on no feature. No package cycles.
- Features talk through public interfaces (e.g. `UserDirectory`, `IdentityDirectory`) or events, never through each
  other's repositories.

### Events

```
TodoService (tx) ──► Outbox.publish(...)  ──same transaction──►  outbox_event (jsonb)
OutboxRelay (@Scheduled, FOR UPDATE SKIP LOCKED) ──► Kafka superapp.todo.events ──► TodoEventsConsumer ──► activity_entry
Keycloak ──► SPI superapp-kafka (after commit) ──► Kafka keycloak.events ──► KeycloakEventsListener ──► revocation + IdentityEvent
```

- Delivery is at least once; consumers de-duplicate on `eventId` (activity) or are idempotent (revocation).
- Failed records retry 4 times with back-off, then go to `<topic>.DLT`. Unparseable JSON goes to the DLT at once.
- Consumers read their own contract records (`TodoEventMessage`, `IdentityEventMessage`), never the producer's classes.

### JSON (Jackson 3)

One Boot-managed `JsonMapper` serves HTTP, Kafka, Redis and cookies (`shared/config/JacksonConfig`): strict on
primitives, tolerant of unknown fields, rejects duplicate keys and oversized or deeply nested input. Optional request
fields are nullable wrappers; required inbound fields use `@JsonProperty(required = true)` or Bean Validation.

## 5. Frontend

`frontend/` is a pnpm workspace:

| Package | Ships in | Notes |
|---|---|---|
| `@superapp/ui` | both apps | Tailwind 4 tokens (`globals.css`), shadcn components, brand assets. Source-only package. |
| `@superapp/web` | nginx image | React Router 8 SPA, TanStack Query; talks only to `/api` on its own origin |
| `@superapp/keycloak-theme` | Keycloak image | Keycloakify 11; every login page re-implemented with `@superapp/ui` |
| `@superapp/e2e` | — | Playwright against the running stack |

The SPA never calls Keycloak. Every auth interaction (sign in, sign up, add passkey, change password, delete account)
is a full-page navigation to `/oauth2/authorization/keycloak?action=…`, which runs a Keycloak application-initiated
action on a themed page and returns to the SPA.

## 6. Why these choices

| Decision | Reason |
|---|---|
| BFF instead of tokens in the browser | XSS can't steal what JavaScript can't read; refresh tokens never leave the server side |
| Encrypted cookies instead of server sessions | Stateless horizontal scaling without sticky sessions or a session store |
| Keycloak hidden behind the BFF | One origin (no CORS, `SameSite=Lax` works), smaller attack surface, Keycloak admin never public |
| Keycloak owns identity | Passkeys, MFA, email flows, brute-force protection and Google are solved problems; don't re-implement them |
| Outbox instead of publishing in the request | A Kafka outage never loses an event or fails a user request |
| Pseudo-modular monolith | Clear boundaries (tested) without distributed-system cost; a feature can be extracted later |
