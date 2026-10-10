# Security

Every protection in the template, where it is configured, and what it defends against.

## The model in one paragraph

Keycloak does all authentication. The browser gets **no tokens**: the BFF holds Keycloak's tokens in AES-GCM encrypted,
HttpOnly `__Host-` cookies and verifies them on every request. The BFF keeps **no sessions** (no HTTP session, no Spring
Session); Keycloak owns them. When Keycloak ends a session, the BFF writes a short-lived revocation marker so tokens
already in circulation stop working on their next request. Keycloak is private; browsers reach its sign-in pages only
through an allow-listed proxy in the BFF. nginx is the only public port.

## Threats and the controls against them

| Threat | Controls |
|---|---|
| Token theft by XSS | No tokens in JavaScript: HttpOnly cookies only. Strict CSP with a per-request nonce (`script-src 'nonce-…' 'strict-dynamic'`), no `unsafe-inline` scripts |
| Stolen cookie replayed elsewhere | Cookies are AES-256-GCM encrypted with keys only the BFF has: useless against Keycloak or any other API. `__Host-` prefix: no subdomain can set or read them |
| CSRF | SameSite=Lax cookies; every write needs `X-XSRF-TOKEN` (double submit); the bearer token is read only after the CSRF check passed |
| Authorization-code interception / login CSRF | PKCE S256, `state`, `nonce`; exact redirect URIs; confidential client with a secret |
| Open redirects | `returnTo` accepts same-origin paths only (no scheme, host, `//`, backslashes) |
| Session still usable after sign-out | Back-channel logout + Keycloak events → Redis revocation markers checked on every request |
| Password guessing | Keycloak brute-force detection (lock after 5 failures, growing wait), strong password policy, nginx per-IP rate limits on sign-in paths |
| Account takeover | Passkeys, TOTP, recovery codes; email verification before a password can be set; security-alert emails |
| Reaching internal services | Private networks; only nginx publishes a port; Keycloak admin console never proxied; back-channel endpoint blocked at the edge |
| Token forgery | JWTs verified locally: RS256 signature (JWKS from the private network), issuer, audience, `azp`, `typ`, expiry |
| Information leaks | Errors are RFC 9457 problem details without stack traces; logs never contain tokens or cookies; secrets only in `.env` |
| Clickjacking, MIME sniffing | `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` |
| Container breakout impact | Non-root users, `no-new-privileges`, dropped capabilities, read-only root filesystems, memory limits |

## Why the cookies are encrypted (and why no server sessions)

Keycloak issues the tokens but has no say over how the BFF stores them. Its tokens are **signed, not secret**: anyone
holding one can read the user's email, name and roles, and can present it to any service that trusts Keycloak.

Encrypting the cookie (AES-256-GCM, a separate HKDF-derived key per cookie type) means:

1. A stolen cookie works only through this BFF, where CSRF, refresh and revocation apply. It can't be replayed against
   Keycloak or another API.
2. Nothing in it is readable by browser extensions, proxies or logs.
3. It can't be altered: GCM authenticates as well as encrypts.

Keycloak can encrypt ID tokens (JWE), but that covers only the ID token and the result is still a bearer credential.
The other common design keeps tokens in a server-side session store and gives the browser a random session id; this
template deliberately does **not** keep sessions in the app. Keycloak owns sessions; the BFF stays stateless, so any
instance can serve any request.

## Layer by layer

### Edge (nginx, `infra/nginx/`)

| Measure | Setting |
|---|---|
| Only public port | `8080` (production: put TLS in front or add a `listen 443 ssl` server) |
| Client IP | `X-Forwarded-For` is **overwritten** with `$remote_addr`, never appended, so clients can't spoof their IP |
| Rate limits per IP | API 30 r/s (burst 60); sign-in and `/auth` pages 5 r/s (burst 20–40); static assets 100 r/s; 50 connections |
| Blocked | `/api/auth/backchannel-logout` → 404 (Keycloak calls it on the private network) |
| Logs | Method, path, status, timing, request id; **no query strings or cookies** (OAuth codes live there) |
| Hardening | Unprivileged image, read-only root filesystem, `server_tokens off`, request size limit 1 MB |

### BFF (`backend/`, package `auth`)

| Measure | Where |
|---|---|
| Filter chains in fixed order: `/auth` proxy → OAuth login → `/api/**` → actuator → API docs → **deny everything else** | `SecurityConfig` |
| Every chain stateless (`SessionCreationPolicy.STATELESS`) | `SecurityConfig` |
| Authorization Code + PKCE, allow-listed login options (`screen`, `idp`, `action`, `reauth`, `email`, `returnTo`) | `BffAuthorizationRequestResolver`, `LoginOptions` |
| Encrypted cookies `__Host-sa_at` (access), `__Host-sa_rt` (refresh), `__Host-sa_ar` (login in progress, 10 min) | `AuthCookies`, `AeadCipher` |
| Silent refresh 30 s before expiry, single flight across instances | `TokenRefreshFilter`, `RefreshCoordinator` |
| JWT checks: RS256 only, issuer, audience = client, `azp` = client, `typ` = Bearer, expiry, revocation, subject is a user id | `JwtConfig` |
| CSRF double submit + `CSRF_VERIFIED` gate | `CsrfCookieFilter`, `CookieBearerTokenResolver` |
| Back-channel logout token checks: signature, issuer, audience, `typ=Logout`, logout event, no `nonce`, `sid` or `sub` | `JwtConfig.logoutTokenVerifier`, `AuthController` |
| Instant revocation: `bff:revoked:sid:<sid>` and `bff:revoked:user:<id>` (watermark), 15 min | `RedisSessionRevocation` |
| `/auth` proxy allow-list: authorization endpoint, `login-actions/**`, `broker/**`, `resources/**`; BFF cookies stripped before forwarding | `KeycloakProxyRoutes` |
| Admin endpoints: role `admin` checked by the filter chain **and** `@PreAuthorize` | `SecurityConfig`, `AdminController` |
| Session ownership: users can only end their own sessions | `KeycloakIdentityDirectory.endSession` |
| Input: Bean Validation; JSON rejects duplicate keys, deep nesting and huge inputs | controllers, `JacksonConfig` |
| Errors: problem details, never stack traces or internal messages | `GlobalExceptionHandler` |

### Keycloak (`keycloak/realm/superapp-realm.json`)

| Area | Setting |
|---|---|
| BFF client `superapp-bff` | Confidential; standard flow only; **PKCE S256 required**; no implicit, no direct grants (ROPC), no device flow, no CIBA, no token exchange; exact redirect URIs; `fullScopeAllowed: false` |
| Admin client `superapp-admin-api` | Service account only; just `view-users`, `query-users`, `manage-users` |
| Tokens | Access 5 min; SSO idle 30 min, max 10 h; refresh tokens rotate with **zero reuse**; RS256 |
| Passwords | 12–128 chars, upper, lower, digit, not username or email, last 5 not reusable |
| Brute force | On: 5 failures, then a growing wait (max 15 min) |
| Registration | Email as username; email verified **before** a password can be set; versioned legal consent |
| MFA | TOTP, recovery codes, passkeys (user verification required), security keys |
| Headers | CSP `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer`, HSTS |
| Events | User and admin events stored and streamed (security emails, revocation, user sync) |

### Frontend (`frontend/`)

| Measure | Where |
|---|---|
| Per-request CSP nonce; `script-src 'self' 'nonce-…' 'strict-dynamic'`; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`; `frame-ancestors 'none'` | `src/proxy.ts` |
| `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`; no `X-Powered-By` | `next.config.ts` |
| Requests only to its own origin, with credentials and the XSRF header | `src/lib/api.ts` |
| The Next.js server can't reach the BFF, Keycloak or data stores (network `web` only) | `compose.yaml` |
| JSON-LD escapes `<`; legal Markdown rendered on the server | `src/app/page.tsx`, `src/views/legal.tsx` |

### Containers (`compose.yaml`)

| Measure | Applies to |
|---|---|
| `no-new-privileges`, rotated JSON logs, restart policy | every service |
| `cap_drop: [ALL]` | nginx, frontend, backend, keycloak, both Kafkas |
| Read-only root filesystem (+ small tmpfs) | nginx, frontend, backend |
| Memory limits | every service |
| Non-root users | nginx (101), frontend and backend (10001), keycloak (1000), Kafka |
| Least-privilege environment: each service gets only its own secrets | every service |
| Postgres: SCRAM passwords, `idle_in_transaction_session_timeout`, `lock_timeout`; each database owned by its own non-superuser role | both Postgres |

## Secrets

- All secrets live in `.env` (git-ignored); `.env.example` has placeholders only. `node scripts/start.mjs` generates
  random values for every `CHANGE_ME`.
- The realm JSON uses `${ENV_VAR}` placeholders, resolved when Keycloak imports it.
- `BFF_COOKIE_ENCRYPTION_KEY` must decode to exactly 32 bytes. Rotating it signs every user out.
- Production: use your platform's secret store instead of a file. See [deployment.md](deployment.md).

## Verifying it yourself

| Check | How |
|---|---|
| Login uses PKCE | `curl -sI "http://localhost:8080/oauth2/authorization/keycloak" \| grep -i location` shows `code_challenge_method=S256` |
| Keycloak is private | `curl -o /dev/null -w "%{http_code}" http://localhost:8080/auth/admin/` → 404 |
| CSRF enforced | The backend test `cookieAuthenticatedMutationsWithoutCsrfTokenAreRejected` |
| Scripts need the nonce | Every `<script>` in a page's HTML carries `nonce="…"` matching the `Content-Security-Policy` header |
| Isolation | `docker compose exec frontend node -e "require('net').connect(8081,'backend').on('error',e=>console.log(e.code))"` fails |
