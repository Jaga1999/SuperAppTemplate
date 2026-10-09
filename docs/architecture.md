# Architecture

SuperApp is a **single-module monolith** organised as feature packages, sitting behind an nginx edge and fronting a
private Keycloak. This page explains how a request travels, where each responsibility lives, and why.

## 1. Runtime topology

| Container | Network | Role | Public? |
|---|---|---|---|
| `nginx` | edge + web | Edge rate limits; pages → `frontend`; `/api`, `/oauth2`, `/login/oauth2`, `/auth` → BFF | **yes (:8080)** |
| `frontend` | web | Next.js server: renders pages, sets the per-request nonce CSP. No route to the BFF, Keycloak or any data store | no |
| `backend` | edge + app-net + identity-net | The BFF: OAuth client, API, Keycloak proxy, event producer/consumer | no |
| `postgres` | app-net | App database (`superapp`), schema owned by Flyway | no |
| `redis` | app-net | Revocation markers, refresh single-flight, rate-limit buckets | no |
| `kafka` | app-net | App KRaft broker; topics declared by the BFF at startup (auto-create off) | no |
| `keycloak` | identity-net + keycloak-db | Identity provider (realm `superapp`), runs on Temurin 25 | no |
| `keycloak-postgres` | keycloak-db | Keycloak's own database; only Keycloak can reach it | no |
| `keycloak-kafka` | identity-net | Keycloak's own KRaft broker, carries `keycloak.events` only (created by Keycloak's event extension at startup; auto-create off) | no |
| `mailpit` | identity-net | Dev SMTP sink for Keycloak (replace with a real SMTP relay in production) | no |

The app and Keycloak share no data store: each has its own Postgres and Kafka, so a migration, outage or load spike on
one side can't touch the other. Keycloak has no Redis (it caches in its embedded Infinispan).
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
App ──(full-page nav)──► /oauth2/authorization/keycloak?returnTo=/app&screen=register|idp=google|action=…
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
Browser fetch /api/v1/… (cookies + X-XSRF-TOKEN on writes)
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
├── shared      crypto, web (problems, request id), config (Jackson, Kafka topics, OpenAPI, API versioning)
├── auth        BFF security: chains, cookies, OAuth client, token refresh, revocation, rate limits, Keycloak proxy
├── identity    Keycloak Admin API client (@HttpExchange), Keycloak events consumer, account endpoints
├── user        local user projection (app_user), /me, nightly reconciliation with Keycloak
└── admin       admin overview and user management (role admin)
```

Rules (enforced by `ArchitectureTest` with ArchUnit, not by Spring Modulith):

- A feature exposes a small public API in its root package; everything else lives in `<feature>.internal`.
- No feature may use another feature's `internal` package. `shared` depends on no feature. No package cycles.
- Features talk through public interfaces (e.g. `UserDirectory`, `IdentityDirectory`) or events, never through each
  other's repositories.

### Events

```
Keycloak ──► SPI superapp-kafka (after commit) ──► keycloak-kafka keycloak.events ──► KeycloakEventsListener ──► revocation + IdentityEvent
```

- App topics live on the app cluster and are declared in `shared/config/KafkaTopicsConfig`. The Keycloak listener
  reads from Keycloak's cluster through its own container factory (`identity/internal/KeycloakEventsKafkaConfig`).
- Delivery is at least once; consumers de-duplicate on an event id or are idempotent (revocation).
- Failed records retry 4 times with back-off, then go to `<topic>.DLT` on the app cluster (the BFF never writes to
  Keycloak's cluster). Unparseable JSON goes to the DLT at once.
- Consumers read their own contract records (e.g. `IdentityEventMessage`), never the producer's classes.

### User sync (Keycloak → `app_user`)

Keycloak owns identity; `app_user` is a projection for joins, admin lists and erasure:

1. **At sign-in**, from the verified ID token (`UserSignedIn`): race-free upsert, never resurrects an erased user.
2. **From Keycloak's events** (Kafka): registration, profile/email changes, admin create/update/disable/delete.
3. **Nightly** (`UserReconciliation`, `superapp.user.reconciliation.cron`, default 03:30 UTC): every local user is
   re-read from Keycloak; profile and enabled state are copied, users gone from Keycloak are erased. One run per
   cluster (Redis lock); aborts if the realm doesn't answer; stops after `max-erasures` (default 50) erasures.
   Needed because Keycloak's event producer is fire-and-forget: a login never waits for Kafka.

### JSON (Jackson 3)

One Boot-managed `JsonMapper` serves HTTP, Kafka, Redis and cookies (`shared/config/JacksonConfig`): strict on
primitives, tolerant of unknown fields, rejects duplicate keys and oversized or deeply nested input. Optional request
fields are nullable wrappers; required inbound fields use `@JsonProperty(required = true)` or Bean Validation.

## 5. Frontend

Two independent React projects (npm, each with its own lockfile and its own copy of the shadcn UI kit):

| Folder | Ships in | Notes |
|---|---|---|
| `frontend/` | `frontend` image | Next.js 16 App Router (standalone server). Server components for layouts, metadata and legal pages; client components fetch with TanStack Query from `/api` on the same origin; Zustand for client UI state. `frontend/e2e`: Playwright against the running stack |
| `keycloakify/` | Keycloak image | Keycloakify 11; every login page re-implemented with the same design tokens |

Neither the browser code nor the Next.js server ever calls Keycloak or holds a token. Every auth interaction (sign in, sign up, add passkey, change password, delete account)
is a full-page navigation to `/oauth2/authorization/keycloak?action=…`, which runs a Keycloak application-initiated
action on a themed page and returns to the app.

## 6. Why these choices

| Decision | Reason |
|---|---|
| BFF instead of tokens in the browser | XSS can't steal what JavaScript can't read; refresh tokens never leave the server side |
| Encrypted cookies instead of server sessions | Stateless horizontal scaling without sticky sessions or a session store |
| Keycloak hidden behind the BFF | One origin (no CORS, `SameSite=Lax` works), smaller attack surface, Keycloak admin never public |
| Keycloak owns identity | Passkeys, MFA, email flows, brute-force protection and Google are solved problems; don't re-implement them |
| Pseudo-modular monolith | Clear boundaries (tested) without distributed-system cost; a feature can be extracted later |
