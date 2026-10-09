# Keycloak

Keycloak 26.8 runs on Eclipse Temurin 25 (`keycloak/Dockerfile` copies the official distribution onto a Java 25 base
and runs `kc.sh build`). Everything is configuration as code:

| Path | What |
|---|---|
| `keycloak/realm/superapp-realm.json` | The realm: clients, roles, groups, flows, policies, IdP, SMTP, seed users |
| `keycloakify` | Login theme `superapp` (Keycloakify, React; standalone npm project) |
| `keycloak/themes/superapp-email` | Email theme (FreeMarker, branded HTML + text) |
| `keycloak/extensions/superapp-extensions` | Our providers (Java 25): event listener `superapp-kafka`, required action `superapp-legal-consent` |
| `legal/*.md` | Terms and Conditions, Privacy Policy (text and `version`) |

Placeholders like `${GOOGLE_CLIENT_ID}` in the realm JSON are resolved from the Keycloak container's environment at
import time.

> **The realm is imported only when it doesn't exist.** After changing the JSON in development, run
> `docker compose down -v` (wipes local data) and start again. In production, apply changes through the admin API or a
> migration tool; never wipe the identity database.

## Realm essentials

| Area | Setting |
|---|---|
| Clients | `superapp-bff`: confidential, standard flow only, PKCE S256, exact redirect URIs, back-channel logout to `http://backend:8081/api/auth/backchannel-logout`, `fullScopeAllowed: false` with an audience mapper |
| | `superapp-admin-api`: service account only, `realm-management` roles `view-users`, `manage-users`, `query-users` **scoped to the client** (`clientScopeMappings`; required because `fullScopeAllowed` is false) |
| Roles | `user` (default), `premium`, `admin`; groups `Admins` and `Premium` |
| Tokens | access 5 min; SSO idle 30 min, max 10 h; refresh tokens rotate with zero reuse |
| Registration | email as username, email verification, versioned legal consent (`superapp-legal-consent`) |
| Passwords | 12–128 chars, upper, lower, digit, not username or email, history 5 |
| Brute force | enabled, lock after 5 failures |
| Events | user and admin events, listeners `jboss-logging`, `email` and `superapp-kafka` |

### Registration flow (Keycloak 26.8 behaviour)

The registration form asks only for email and name. With email verification on, Keycloak 26.8 lets the user choose a
password **after** proving the address (the `always_set_password_on_register_form` option defaults to off). Order:
register → Terms → verify email (link) → set password → signed in. This stops anyone from setting a password on an
address they don't own. Keep it.

### Legal consent (Terms and Conditions, Privacy Policy)

Keycloak's built-in `TERMS_AND_CONDITIONS` action only records *that* a user accepted, so it can't tell when the
documents change. It is disabled and replaced by our required action `superapp-legal-consent`:

- `legal/terms-and-conditions.md` and `legal/privacy-policy.md` are the single source. Their front matter `version`
  is what users accept; the body is what `/legal/terms` and `/legal/privacy` show.
- The Keycloak image copies `legal/` to `/opt/keycloak/legal` (override with `SUPERAPP_LEGAL_DIR`); the action reads the
  versions at startup and refuses to start if a document is missing or has no `version`.
- On every sign-in (password, passkey, Google, new registration) it compares the versions stored on the user
  (`legal_terms_version`, `legal_privacy_version`, `legal_accepted_at`; admin-only user-profile attributes) with the
  current ones. Same versions → nothing is shown. First sign-in or a changed version → the themed `legal-consent.ftl`
  page, with both documents linked and two required checkboxes. Declining ends the sign-in.

**To publish a new version:** edit the document, change its `version` (e.g. to the new effective date), then rebuild
`keycloak` and `nginx`. Every user is asked once at their next sign-in. Fix typos without changing `version`.

### Passkeys

- Feature flags `passkeys`, `recovery-codes`, `dpop` are built into the image.
- Passwordless policy: resident key required, user verification required, any authenticator (platform, phone, Google
  Password Manager, security key).
- `webAuthnPolicyPasswordlessMediation: none`: nothing runs on page load; the browser's passkey dialog opens **only**
  when the user clicks *Sign in with a passkey*. (`conditional` would show the passkey sheet as soon as the email field
  is focused.)
- Passkeys belong to one site (RP ID = the public host). The picker lists the user's passkeys for SuperApp; it can't
  list Google accounts. Google accounts appear through *Continue with Google*.

### Google

1. Google Cloud Console → Credentials → OAuth client (Web). Authorized redirect URI:
   `${PUBLIC_URL}/auth/realms/superapp/broker/google/endpoint` (dev: `http://localhost:8080/auth/realms/superapp/broker/google/endpoint`).
2. In `.env`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SUPERAPP_GOOGLE_LOGIN_ENABLED=true`.
3. Re-import the realm (dev: `docker compose down -v && docker compose up -d --build --wait`).

The IdP sets `prompt=select_account`. Without its own prompt, Keycloak forwards the client's `prompt` to Google, and
Google rejects `prompt=create` (sent when the user starts from *Get started*) with `invalid_request`.
`SUPERAPP_GOOGLE_LOGIN_ENABLED` only controls whether the theme shows the button.

## The login theme

- Every page Keycloak can render has a themed component (`KcPage.tsx`; unknown pages fall back to a styled default).
- Preview without Keycloak: `npm --prefix keycloakify run dev`, then `http://localhost:5174/?kc=<page>.ftl`.
- Copy and server messages are overridden in `src/login/i18n.ts` (passkey errors, Terms text, titles). Keycloakify
  writes these into the theme's message bundle, so server-rendered messages use them too.
- The theme JAR is built inside the Keycloak image (`npm run build-keycloak-theme`).

## Kafka event-listener SPI

`superapp-kafka` publishes user and admin events to `keycloak.events` **after the Keycloak transaction commits**,
keyed by user id. The wire format is `IdentityEventMessage` (mirrored in the BFF; keep both in sync). Keycloak runs
Jackson 2 internally, so the SPI uses Keycloak's bundled Jackson; the BFF uses Jackson 3.

## Gotchas we hit (and their fixes)

| Symptom | Cause | Fix in this repo |
|---|---|---|
| Seed users get 403 | Imported users don't receive default roles | `realmRoles: ["default-roles-superapp"]` on each seed user |
| Healthy before the realm exists | Keycloak reports UP before the background import finishes | Healthcheck also requires the realm's `.well-known` to return 200 |
| Admin API 403 for the service account | `fullScopeAllowed: false` drops unscoped client roles from the token | `clientScopeMappings` for `realm-management` |
| Back-channel logout never applied | Spring Cloud Gateway's `FormFilter` hides form-body fields from `@RequestParam` | Bind with `@RequestBody MultiValueMap` |
| Keycloak logs the BFF's IP | The gateway strips `X-Forwarded-*` unless `trusted-proxies` is set | `spring.cloud.gateway.server.webmvc.trusted-proxies` (nginx is the only ingress) |
| 400 "Request header is too large" on passkey setup | Keycloak's cookies plus ours exceed Tomcat's 8 KB | `server.max-http-request-header-size: 32KB` (Boot 4 name) and nginx `large_client_header_buffers` |
| 429 after a few logins | Theme assets shared the strict auth rate limit | Separate nginx zone for `/auth/resources/` |
| Google `Invalid prompt: create` | Keycloak forwards the client's prompt | IdP `prompt=select_account` |
| Admin API calls sometimes 500 right after a Keycloak restart | The event SPI looked up the realm after commit, when the realm cache can't load | Build event messages inside the transaction; after commit only send |
| Validating the realm JSON through the admin API fails on `${VAR}` | Placeholders are substituted only by startup import | Substitute dummy values when validating with `kcadm create realms` |
| A `${VAR}` in a boolean field breaks import | Placeholders only work in strings | Keep the IdP `enabled: true`; the theme flag hides the button |
