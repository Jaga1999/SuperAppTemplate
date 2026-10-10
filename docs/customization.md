# Customization

Recipes for the changes almost every product makes. Each one says which files to edit and what to rebuild.
Folder map: [project-structure.md](project-structure.md#where-do-i-change).

## Name and identity

| Change | Edit | Rebuild |
|---|---|---|
| Product name everywhere | Generate a project: [template.md](template.md) | — |
| Description, theme colors for metadata | `frontend/src/lib/site.ts` | `frontend` |
| Favicon | `frontend/src/app/icon.svg` | `frontend` |
| Social preview image | `frontend/src/app/opengraph-image.tsx` | `frontend` |
| Logo | `frontend/src/components/ui/brand/logo.tsx` **and** `keycloakify/src/components/ui/brand/logo.tsx` | `frontend`, `keycloak` |
| Email sender name and address | `SMTP_FROM`, `SMTP_FROM_DISPLAY_NAME` in `.env` | reset (realm import) |

## Look and feel

| Change | Edit | Rebuild |
|---|---|---|
| Colors, radius | `:root` and `.dark` tokens in `frontend/src/styles/globals.css` **and** `keycloakify/src/styles/globals.css` | `frontend`, `keycloak` |
| Font | `next/font` import in `frontend/src/app/layout.tsx`; the `@fontsource-variable/*` import and `--font-sans` in `keycloakify/src/styles/globals.css` | both |
| Landing page content | `frontend/src/views/landing.tsx` | `frontend` |
| Sign-in brand panel (headline, bullet points) | `keycloakify/src/login/i18n.ts` (`brandHeadline`, `brandSubline`, `brandPoint1..3`) | `keycloak` |
| Sign-in layout | `keycloakify/src/login/Template.tsx` | `keycloak` |
| A sign-in page | `keycloakify/src/login/pages/*` ([keycloak.md](keycloak.md#customizing-the-theme-step-by-step)) | `keycloak` |
| Email look and texts | `keycloak/themes/superapp-email/email/html/*.ftl`, `email/messages/messages_en.properties` | `keycloak` |
| App sidebar entries | `frontend/src/layout/app-shell.tsx` | `frontend` |

Tip: preview colors live with `npm --prefix frontend run dev` and `npm --prefix keycloakify run dev` side by side.

## Accounts and sign-in (realm)

All in `keycloak/realm/superapp-realm.json`. In development apply with `node scripts/start.mjs reset --yes` (deletes
local data). In production change the live realm through the admin console or Admin API ([deployment.md](deployment.md)).

| Change | Key |
|---|---|
| Password rules | `passwordPolicy` (currently 12–128 chars, upper, lower, digit, not username/email, history 5) |
| Access token lifetime | `accessTokenLifespan` (300 s; keep it short) |
| Session idle / max | `ssoSessionIdleTimeout` (30 min), `ssoSessionMaxLifespan` (10 h), `…RememberMe` variants |
| Brute-force protection | `bruteForceProtected`, `failureFactor`, `maxFailureWaitSeconds` |
| Languages | `supportedLocales`, `defaultLocale` (the language menu appears with more than one) |
| Self-registration on/off | `registrationAllowed` |
| Email verification | `verifyEmail` |
| Remove seed users | `users` array (keep the service-account user of `superapp-admin-api`) |
| Google sign-in | `.env`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SUPERAPP_GOOGLE_LOGIN_ENABLED=true` ([keycloak.md](keycloak.md#google-sign-in)) |

### Add another social login (e.g. GitHub)

1. Add an `identityProviders` entry (alias `github`, `providerId: "github"`, client id/secret as `${GITHUB_CLIENT_ID}`
   placeholders) and pass the variables to the `keycloak` service in `compose.yaml` and `.env.example`.
2. Allow the alias in the BFF: `ALLOWED_IDPS` and `LINK_IDP` in `backend/.../auth/internal/oauth/LoginOptions.java`
   (and its test). In `frontend/src/lib/auth.ts` add `withGithub: () => window.location.assign(loginUrl({ idp: 'github' }))`
   next to `withGoogle`, and a button on the landing page and the security settings.
3. Reset local data, rebuild `backend`, `frontend`, `keycloak`.

### Add a role

1. Realm JSON: add it under `roles.realm` (and a group that grants it if useful).
2. Backend: protect endpoints with `hasRole('<ROLE>')` in `SecurityConfig` or `@PreAuthorize`. Realm roles become
   `ROLE_<name>` authorities.
3. Frontend: `RequireRole` around the pages; hide links for users without it.
4. Reset local data.

### Make someone admin (development)

Keycloak admin console (<http://localhost:8180/auth>, `master` admin from `.env`) → realm `superapp` → Users → the
user → Role mapping → Assign role `admin` (or add them to group `Admins`). They get it on their next sign-in.

## Legal documents

1. Edit `keycloak/legal/terms.md` / `privacy.md` **and** the same files in `frontend/legal/`.
2. Material change: raise `version` in the front matter of both copies; every user accepts again at next sign-in.
   Typo fix: keep `version`.
3. Rebuild `keycloak` and `frontend`; the e2e suite checks both copies agree.

## Application features

| Change | How |
|---|---|
| New API endpoint or feature | [development.md](development.md#add-a-backend-feature) |
| New page | [development.md](development.md#add-a-frontend-page) |
| New table or column | Flyway migration `V<n>__*.sql` ([development.md](development.md#add-a-database-column)) |
| React to Keycloak events (login, register, delete…) | The consumer in `identity/internal/KeycloakEventsListener.java`; the listener extension already sends user and admin events |
| Publish your own events | Declare the topic in `KafkaTopicsConfig`, send with `KafkaTemplate` |
| Scheduled job | `@Scheduled` with a cron in `application.yaml` (see `UserReconciliation`) |

## Infrastructure

| Change | Edit |
|---|---|
| Ports on your machine | left side of the mappings in `compose.override.yaml` |
| Rate limits | zones in `infra/nginx/nginx.conf`, bursts in `infra/nginx/templates/superapp.conf.template` |
| Memory limits | `mem_limit` per service in `compose.yaml` |
| Database pool | `DB_POOL_MAX_SIZE` / `DB_POOL_MIN_IDLE` on the backend; `KC_DB_POOL_*` on Keycloak |
| Security headers / CSP | `frontend/next.config.ts`, `frontend/src/proxy.ts`; BFF headers in `SecurityConfig` |
| Turn off API docs | `API_DOCS_ENABLED=false` |
