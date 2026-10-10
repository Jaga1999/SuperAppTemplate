# Troubleshooting

Start with the two commands that answer most questions:

```bash
node scripts/start.mjs status          # which container is unhealthy?
node scripts/start.mjs logs <service>  # why?
```

## Starting the stack

| Symptom | Cause and fix |
|---|---|
| `Docker is not running` | Start Docker Desktop and wait until it reports *running* |
| A container stays `unhealthy` or restarts | Usually memory: give Docker ≥ 6 GB. Then read its logs |
| `port is already allocated` | Another program uses 8080/8025/8180/5432/…: stop it, or change the left side of the port in `compose.override.yaml` |
| First build very slow | Normal once (Gradle, npm, Maven, base images); later builds use the cache |
| Keycloak logs a `503` warning during start | Its health check probing while it boots; harmless once it turns healthy |
| `backend` waits forever | It waits for Keycloak's realm; check `logs keycloak` for an import error (e.g. a placeholder variable missing in `.env`) |
| Kafka: `NOT_COORDINATOR` lines in the first seconds | Normal while the broker elects itself |
| After changing `.env`, nothing changed | `docker compose up -d --wait` recreates changed containers; realm values need `node scripts/start.mjs reset --yes` |

## Signing in

| Symptom | Cause and fix |
|---|---|
| Sign-in loops back to the landing page | `PUBLIC_URL` must equal the address in the browser (scheme, host, port). Clear cookies for `localhost:8080` |
| `Invalid parameter: redirect_uri` from Keycloak | The realm was imported with another `PUBLIC_URL`; reset local data |
| Google: `redirect_uri_mismatch` ("Access blocked: This app's request is invalid") | Register `<PUBLIC_URL>/auth/realms/<realm>/broker/google/endpoint` on the Google OAuth client. Each generated project has its own realm, so each needs its own URI ([template.md](template.md#google-sign-in-in-a-new-project)) |
| Google button missing | `SUPERAPP_GOOGLE_LOGIN_ENABLED=true` and client id/secret in `.env`, then reset |
| No verification / reset email | Open Mailpit <http://localhost:8025>; else `logs keycloak` for SMTP errors |
| Passkey dialog never appears | Use `localhost` (WebAuthn needs a secure context); the dialog opens only after clicking *Sign in with a passkey* |
| *Account is temporarily disabled* | Brute-force lock after 5 failures; wait or unlock in the admin console (Users → user → *Unlock*) |
| Asked to accept the terms again | Someone raised the `version` in `keycloak/legal/*.md` |
| Signed out after rebuilding the backend | Expected only if `BFF_COOKIE_ENCRYPTION_KEY` changed; otherwise check `logs backend` |
| `401` on every API call after a while | Refresh failed: the Keycloak session ended (idle 30 min, max 10 h) or was revoked. Sign in again |
| Admin pages missing | The user lacks role `admin` ([customization.md](customization.md#make-someone-admin-development)); sign out and in again |

## Development servers

| Symptom | Cause and fix |
|---|---|
| :5173 shows the app but sign-in fails | The stack must run on :8080; the dev server forwards auth and API paths there |
| After sign-in you land on :8080, not :5173 | Expected (the public URL); open :5173 again, cookies are shared |
| Theme preview shows the wrong page | Use `?kc=<pageId>.ftl`, e.g. `?kc=register.ftl` |
| Theme change not visible in the real flow | Rebuild the `keycloak` image; Keycloak also caches themes per container |
| `biome` complains about import order | `npm run lint -- --write` |
| `typecheck` fails on routes | Typed routes: links must point at existing pages; run `npm run typecheck` (it runs `next typegen` first) |

## Tests

| Symptom | Cause and fix |
|---|---|
| All backend integration tests fail at once | Docker is not running (Testcontainers) |
| `HV000151` when the backend starts | Validation constraints on a controller method that implements an `*ApiDocs` interface; put them on the interface |
| Build fails on a warning | `-Werror`: fix the warning |
| e2e: *No email matching…* | Mailpit not reachable on :8025, or Keycloak can't send mail (`logs keycloak`) |
| e2e: Chrome not found | Install Google Chrome (the suite uses the installed browser, `channel: 'chrome'`) |
| e2e: API test expects Google enabled | Your `.env` has Google sign-in off; adjust the expectation |
| e2e: legal version mismatch | `keycloak/legal` and `frontend/legal` differ; copy the file across |

## Data

| Symptom | Cause and fix |
|---|---|
| Realm JSON change has no effect | The realm imports only into an empty database: `node scripts/start.mjs reset --yes` (deletes all local data) |
| A Keycloak user is missing in `app_user` | Check consumer lag (`docker.md`); the nightly reconciliation repairs it, or restart `backend` |
| Flyway: checksum mismatch | An applied migration was edited. Revert it and add a new `V<n>` migration instead |
| Database GUI can't connect | Use `localhost:5432` (app) / `localhost:5433` (Keycloak) with the users from `.env`; ports exist only with `compose.override.yaml` |

Still stuck? Keycloak-specific pitfalls: [keycloak.md](keycloak.md#7-pitfalls-already-solved).
