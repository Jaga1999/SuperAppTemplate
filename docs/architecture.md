# Architecture

How the pieces fit, how every request travels, and why it is built this way. Diagrams render on GitHub (Mermaid).

## 1. The big picture

One public entry point (nginx). Behind it, a **backend-for-frontend (BFF)** that is the only component allowed to talk
to Keycloak. The browser never holds a token and never talks to Keycloak directly.

```mermaid
flowchart LR
    browser(["Browser"])

    subgraph edge["Public: edge network"]
        nginx["nginx :8080<br/>edge proxy, rate limits"]
    end

    subgraph web["web network"]
        frontend["frontend<br/>Next.js server<br/>renders pages only"]
    end

    subgraph app["app-net: app data"]
        backend["backend (BFF)<br/>Spring Boot :8081"]
        postgres[("postgres<br/>app database")]
        redis[("redis<br/>revocation markers")]
        kafka[("kafka<br/>app events")]
    end

    subgraph identity["identity-net: identity traffic"]
        keycloak["keycloak<br/>:8080/auth"]
        kckafka[("keycloak-kafka<br/>keycloak.events")]
        mailpit["mailpit<br/>dev SMTP"]
    end

    subgraph kcdb["keycloak-db"]
        kcpostgres[("keycloak-postgres")]
    end

    browser -->|"https: pages"| nginx
    nginx -->|"/ , /_next"| frontend
    nginx -->|"/api, /oauth2, /login/oauth2, /auth"| backend
    backend --> postgres
    backend --> redis
    backend --> kafka
    backend -->|"tokens, admin API, /auth proxy"| keycloak
    backend -->|"consumes"| kckafka
    keycloak -->|"back-channel logout"| backend
    keycloak -->|"publishes events"| kckafka
    keycloak --> kcpostgres
    keycloak -->|"emails"| mailpit
```

Rules the network layout enforces (verified with connection tests):

| From | Can reach | Cannot reach |
|---|---|---|
| Browser | nginx only (port 8080) | everything else |
| nginx | frontend, backend | Keycloak, databases, Kafka, Redis |
| frontend (Next.js) | nothing (it only answers nginx) | backend, Keycloak, any data store |
| backend | its Postgres, Redis, Kafka; Keycloak; Keycloak's Kafka | Keycloak's database |
| keycloak | its Postgres and Kafka, Mailpit, the backend (back-channel logout) | frontend, the app's database |

The app and Keycloak each have their **own** Postgres and Kafka, so a migration, an outage or load on one side can't
touch the other. Keycloak has no Redis: it caches in its embedded Infinispan.

## 2. Who does what

| Component | Responsibility | Never does |
|---|---|---|
| **Keycloak** | All authentication: sign-up, sign-in, passwords, passkeys, MFA, recovery codes, Google, email verification, password reset, sessions, tokens, user and role storage | Serve the browser directly; it is private |
| **keycloakify** | The sign-in pages Keycloak renders (React, built into a theme JAR) | Run on its own in production |
| **backend (BFF)** | OAuth client for the browser, token storage in encrypted cookies, silent refresh, CSRF, the allow-listed `/auth` proxy, instant revocation, the product API, the user projection | Store sessions (no HTTP session, no Spring Session); show login forms; accept passwords |
| **frontend** | Renders the landing page, legal pages and the signed-in app; sets a strict per-request CSP | Call the BFF or Keycloak from the server; touch tokens |
| **nginx** | The only public port; routes paths; per-IP rate limits; blocks internal endpoints | Talk to Keycloak |

## 3. Signing in (Authorization Code + PKCE through the BFF)

```mermaid
sequenceDiagram
    autonumber
    actor U as Browser
    participant N as nginx
    participant B as BFF
    participant K as Keycloak

    U->>N: GET /oauth2/authorization/keycloak?returnTo=/app
    N->>B: forward
    B->>B: create state, nonce, PKCE verifier (S256)<br/>store them in encrypted cookie __Host-sa_ar (10 min)
    B-->>U: 302 to /auth/realms/superapp/protocol/openid-connect/auth?code_challenge=…
    U->>N: GET /auth/realms/superapp/…/auth
    N->>B: forward (/auth is proxied by the BFF)
    B->>K: allow-listed proxy request (BFF cookies stripped)
    K-->>U: themed sign-in page (keycloakify)
    U->>K: credentials / passkey / Google (still via nginx → BFF proxy)
    K-->>U: 302 to /login/oauth2/code/keycloak?code=…&state=…
    U->>N: GET /login/oauth2/code/keycloak
    N->>B: forward
    B->>B: check state, read PKCE verifier from __Host-sa_ar
    B->>K: POST /token (code + verifier + client secret), private network
    K-->>B: access, refresh and ID token
    B->>B: verify ID token (signature, issuer, audience, nonce)<br/>publish UserSignedIn → upsert app_user
    B-->>U: Set-Cookie __Host-sa_at, __Host-sa_rt (AES-GCM encrypted, HttpOnly, Secure, SameSite=Lax)<br/>302 to /app
```

Why it's safe:

- **PKCE (S256) + state + nonce**: a stolen authorization code is useless; the login can't be forged or replayed.
- **Confidential client**: the code exchange needs the client secret, which only the BFF has.
- **Exact redirect URIs** in the realm; the `returnTo` path is allow-listed (same-origin paths only, no `//host`).
- The browser only ever sees encrypted cookies it can't read (HttpOnly).

## 4. Every API call

```mermaid
sequenceDiagram
    autonumber
    actor U as Browser
    participant N as nginx
    participant B as BFF
    participant R as Redis
    participant K as Keycloak

    U->>N: POST /api/v1/… (cookies + X-XSRF-TOKEN)
    N->>B: forward (rate limit per IP)
    B->>B: CSRF check (cookie vs header) → 403 if missing
    alt access token expires in < 30 s
        B->>R: lock this refresh token (single flight)
        B->>K: POST /token grant_type=refresh_token
        K-->>B: new access + rotated refresh token
        B->>R: cache result 20 s for parallel requests
        B-->>U: new cookies on this response
    end
    B->>B: verify JWT locally (RS256 signature via cached JWKS, issuer, audience, azp, typ, expiry)
    B->>R: MGET revoked session / revoked-user watermark
    alt revoked
        B-->>U: 401 problem+json
    else valid
        B->>B: roles → authorities, run the endpoint
        B-->>U: 200 JSON
    end
```

- **Silent refresh** happens on the server; the frontend never notices. Refresh tokens rotate with **zero reuse**, so
  parallel requests must not refresh twice: the Redis lock makes the first request refresh and the others reuse its
  result.
- **CSRF**: cookies are sent automatically, so every write must carry `X-XSRF-TOKEN` copied from the `XSRF-TOKEN`
  cookie (Spring's double-submit). The bearer token is only read from the cookie *after* the CSRF check passed, so a
  cookie-authenticated write without the header gets 403.
- **Local JWT verification**: no call to Keycloak per request; the public keys are fetched once on the private network.

## 5. Signing out, and instant revocation

There are **no sessions in the BFF**. Keycloak owns sessions. The BFF only makes sure that, once Keycloak ends a
session, tokens issued for it stop working immediately instead of living out their 5 minutes.

```mermaid
sequenceDiagram
    autonumber
    actor U as Browser
    participant B as BFF
    participant R as Redis
    participant K as Keycloak

    Note over U,K: Sign out of this browser
    U->>B: POST /api/auth/logout (XSRF header)
    B->>R: SET bff:revoked:sid:<session> (15 min)
    B->>K: end the SSO session (refresh token, server-to-server)
    B-->>U: clear cookies, 204

    Note over U,K: Session ended anywhere else (admin, "sign out everywhere", password reset, idle timeout)
    K->>B: POST /api/auth/backchannel-logout (signed logout_token, private network)
    B->>B: verify logout token (signature, issuer, audience, typ=Logout, events)
    B->>R: SET bff:revoked:sid:<sid> or bff:revoked:user:<id> = now
    Note over B,R: The next API call with an old token → 401
```

Revocation also arrives through Keycloak's event stream (Kafka): user disabled, deleted, logged out by an admin. A
marker lives 15 minutes (longer than any access token), then expires on its own. Redis holds **only** these markers and
a few seconds of refresh de-duplication; no session data.

## 6. Keeping the app's user table in sync

Keycloak owns identity. The app keeps a small projection (`app_user`) for joins, admin lists and erasure.

```mermaid
flowchart TB
    subgraph KC["Keycloak"]
        ev["user + admin events"]
    end
    ev -->|"superapp-kafka SPI, after commit"| topic[("keycloak-kafka<br/>topic keycloak.events")]
    topic --> listener["KeycloakEventsListener<br/>(BFF)"]
    listener -->|"logout, disable, delete"| rev["SessionRevocation<br/>(Redis markers)"]
    listener -->|"register, profile, admin create/update"| proj["UserProjection"]
    login["sign-in callback<br/>(UserSignedIn)"] --> proj
    nightly["UserReconciliation<br/>nightly 03:30 UTC"] -->|"re-reads every user<br/>via Admin API"| proj
    proj --> db[("app_user")]
```

| Path | When | What |
|---|---|---|
| Sign-in | every sign-in | Upsert from the verified ID token (never resurrects an erased user) |
| Events | seconds after a change in Keycloak | Registration, profile and email changes, admin create/update/disable/delete |
| Reconciliation | nightly (`superapp.user.reconciliation.cron`) | Re-reads every local user from Keycloak and repairs drift; erases users Keycloak no longer has. One run per cluster (Redis lock); aborts if the realm doesn't answer; stops after 50 erasures |

The reconciliation exists because Keycloak's event producer is fire-and-forget: a sign-in never waits for Kafka, so an
event can be lost during a broker outage.

## 7. The pages

```mermaid
flowchart LR
    landing["/ landing"] -->|"Get started / Sign in"| login["/oauth2/authorization/keycloak"]
    login --> kc["Keycloak pages under /auth<br/>(keycloakify theme)"]
    kc -->|"callback"| app["/app (signed-in area)"]
    app --> settings["/app/settings<br/>profile · security · devices"]
    app --> admin["/app/admin<br/>(role admin)"]
    admin --> user["/app/admin/users/:id"]
    landing --> legal["/legal/terms · /legal/privacy"]
    settings -->|"change password, passkey, MFA…"| kc
```

Account changes (password, passkeys, authenticator app, recovery codes, linking Google, deleting the account) are not
API calls: the app navigates to `/oauth2/authorization/keycloak?action=<ACTION>`, Keycloak shows its themed page,
and the user returns with `?action=success|cancelled|error`.

## 8. Backend modules

```text
com.superapp
├── shared      error model (RFC 9457), request id, crypto (AES-GCM), Jackson policy, Kafka topics, OpenAPI, API versioning
├── auth        security chains, OAuth client, encrypted cookies, refresh, revocation, the /auth proxy
├── identity    Keycloak Admin API client, Keycloak event consumer, account endpoints, public config
├── user        local user projection (app_user), /me, nightly reconciliation
└── admin       admin overview, users, sessions (role admin)
```

A feature's root package is its public API; implementation lives in `<feature>.internal`. `ArchitectureTest`
(ArchUnit) fails the build if a feature reaches into another's `internal` package, if `shared` depends on a feature, or
if packages form a cycle. Details: [backend.md](backend.md).

## 9. Why these choices

| Choice | Reason |
|---|---|
| BFF instead of tokens in the browser | No token can be stolen by XSS; the IETF's recommendation for browser apps |
| Keycloak private, proxied by the BFF | One origin for cookies; the only reachable Keycloak paths are an allow-list |
| Encrypted cookies, no server sessions | Stateless BFF: any instance serves any request; nothing to replicate |
| Local JWT checks + Redis revocation markers | Fast requests without asking Keycloak, yet sign-out takes effect immediately |
| Separate data stores for app and Keycloak | Failure and security isolation; each side can be scaled or moved alone |
| Next.js server (not a static export) | Per-request CSP nonce: no inline script runs unless the server rendered it |
| Feature packages + ArchUnit | Modular monolith without a framework; boundaries are tested |
