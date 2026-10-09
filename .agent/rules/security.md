# Security rules

Read with [../guardrails.md](../guardrails.md). Background: [docs/security/keycloak-auth-standard.md](../../docs/security/keycloak-auth-standard.md).

## Request path invariants

- nginx is the only ingress. It overwrites `X-Forwarded-For` with `$remote_addr` (never appends), and the BFF trusts
  forwarded headers on that basis. Don't publish the BFF port in `compose.yaml`.
- Security filter chains in `SecurityConfig` are ordered: Keycloak proxy, OAuth login, `/api/**` resource server,
  actuator, deny-all. A new path must fall into one deliberately; unknown paths are denied.
- Cookies are `__Host-` prefixed, HttpOnly, Secure (except plain-http localhost), SameSite=Lax, Path=/.
- Every mutating API request needs the XSRF header. Tests must prove a cookie-authenticated write without it gets 403.

## Input and output

- Validate all input (Bean Validation, allow-lists for redirect targets and login options). Never build redirects from
  raw parameters.
- JSON limits and duplicate-key rejection are global (`JacksonConfig`). Don't create private mappers that bypass them.
- Errors are problem details without stack traces or internal messages. Unexpected exceptions log server-side with the
  request id.
- Keycloak messages rendered as HTML go through `kcSanitize`. No `dangerouslySetInnerHTML` with other input.

## Tokens and sessions

- JWTs are validated locally (signature via internal JWKS, issuer, audience, `azp`, `typ`, expiry, revocation markers).
- Refresh tokens rotate with zero reuse; refresh goes through `RefreshCoordinator` (single flight). Never call the
  token endpoint directly from new code.
- Any event that should end access (logout, password change, disable, delete) must reach `SessionRevocation`.

## Dependencies

- Latest stable, exact pins, no deprecated packages. Check new dependencies for maintenance status and known CVEs.
