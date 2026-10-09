# Keycloak rules (26.8 on Temurin 25)

- Configuration as code: `keycloak/realm/superapp-realm.json`. No click-ops that aren't mirrored in the JSON.
- Secrets and environment-specific values are `${ENV_VAR}` placeholders (strings only; booleans and numbers can't be
  placeholders), and each variable must be passed to the `keycloak` service in `compose.yaml`.
- The realm is imported only into an empty database. Dev: `docker compose down -v` after a change (ask first; it wipes
  data). Production: admin API or a migration tool, never a wipe.
- Clients keep `fullScopeAllowed: false`. Roles a client needs in its tokens are granted with `scopeMappings` /
  `clientScopeMappings`.
- Never enable direct access grants (ROPC) or implicit flow on any client. Redirect URIs are exact, never wildcards.
- Passkey policy keeps `webAuthnPolicyPasswordlessMediation: none` (the dialog opens only on click).
- Identity providers set their own `prompt` (Google: `select_account`); otherwise Keycloak forwards the client's prompt.
- The BFF proxy allow-list (`KeycloakProxyRoutes`) exposes only the login UI paths. Account console, admin console,
  token, userinfo and JWKS endpoints stay private.
- The event-listener SPI (`keycloak/extensions/superapp-extensions`) compiles with release 25 and uses only Keycloak's
  public SPI and bundled libraries. Its message format must match `IdentityEventMessage` in the BFF.
- Legal documents live in `legal/*.md`. Changing a document's `version` makes every user re-accept at next sign-in:
  change it only when the meaning changes, never for typo fixes. Don't re-enable the built-in `TERMS_AND_CONDITIONS`.
- Event listeners and required actions must not access the realm/user model after the transaction commits.
- Theme work: see [frontend.md](frontend.md#keycloak-theme-keycloakify) and the `change-keycloak-page` skill.
