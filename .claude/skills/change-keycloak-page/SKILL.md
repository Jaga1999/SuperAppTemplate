---
name: change-keycloak-page
description: Change a Keycloak login/registration/MFA/passkey/email page, its text, or the realm configuration in SuperApp (Keycloakify theme in keycloakify, realm JSON, email theme). Use when asked to restyle or reword a sign-in page, change auth behaviour, add an identity provider or required action.
---

# Change a Keycloak page or realm setting

Rules: `.agent/rules/keycloak.md`, `.agent/rules/frontend.md`. Background and known pitfalls: `docs/keycloak.md`.

## Page look or behaviour

1. Find the page id: open the page and run `window.kcContext.pageId` in the console, or check `src/login/KcPage.tsx`.
2. Edit the component in `keycloakify/src/login/pages/` (shared layout: `Template.tsx`, building
   blocks: `components/kc-ui.tsx`). Keep Keycloak's field names and element ids.
3. Preview with mock data:
   ```bash
   npm --prefix keycloakify run dev
   ```
   then open `http://localhost:5174/?kc=<page-id>` (for example `login.ftl`, `register.ftl`, `login-otp.ftl`).

## Text

Override any Keycloak message key in `keycloakify/src/login/i18n.ts` (find keys in Keycloak's
`messages_en.properties`). Messages stay short and say what to do next. HTML messages render through `kcSanitize`.

## Realm settings

Edit `keycloak/realm/superapp-realm.json`. Secrets as `${ENV_VAR}` (strings only) and pass the variable to the
`keycloak` service in `compose.yaml`. Applying it in dev needs a fresh import, which **deletes all local data**:
ask the user before running `docker compose down -v`.

## Verify

```bash
npm --prefix keycloakify run typecheck
```
```bash
npm --prefix keycloakify run lint
```
```bash
docker compose up -d --build --wait keycloak
```
```bash
npm --prefix frontend run e2e
```

Also walk the changed flow once in a browser at http://localhost:8080 (emails arrive in Mailpit, http://localhost:8025).
