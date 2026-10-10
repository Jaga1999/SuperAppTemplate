# Auth Standard: Spring Boot 4 + Keycloak (reusable for all projects)

> Status: baseline as of 2026-10. Re-check the "Keep current" section before each new project.

## 1. The decision

| Use case | Flow | Allowed? |
|---|---|---|
| Web app / SPA user login | **Authorization Code + PKCE (S256)** through a **BFF** (Spring Boot = confidential client) | ✅ Standard |
| Mobile / desktop native app | Authorization Code + PKCE through the system browser (AppAuth) | ✅ |
| Service → service, cron jobs | **Client Credentials** | ✅ |
| Custom login form in your app that POSTs username/password to Keycloak (ROPC / "Direct Access Grants") | — | ❌ **Never.** RFC 9700 §2.4: *"MUST NOT be used"* |
| Implicit flow (tokens in URL fragment) | — | ❌ RFC 9700 §2.1.2: *SHOULD NOT* |
| Tokens stored in browser localStorage/sessionStorage | — | ❌ Exposed to XSS |
| Keycloak Admin REST API | Only for back-office admin tasks (create user, assign roles) through a dedicated service-account client | ⚠️ Never for login |

Want your own branded login page? Write a **Keycloak theme**, for example with **Keycloakify** in React. Don't build your own login form.

## 2. Architecture

> **Implemented variant (SuperApp):** instead of an HTTP session, the BFF keeps the tokens in AES-256-GCM encrypted
> `__Host-` cookies, so it is fully stateless, and Keycloak is reachable only through the BFF's allow-listed proxy.
> Details: [../architecture.md](../architecture.md). The diagram below is the generic form of the standard.

```
Browser (SPA / pages)
  │  only a session cookie: __Host-SESSION; HttpOnly; Secure; SameSite=Lax
  │  + XSRF-TOKEN cookie/header for CSRF
  ▼
BFF / Gateway  (Spring Boot 4, oauth2Login, confidential client, PKCE)
  │  tokens stored server-side (HTTP session → Spring Session Redis when >1 instance)
  │  forwards API calls with  Authorization: Bearer <access_token>
  ▼
Resource servers / microservices (Spring Boot 4, oauth2ResourceServer JWT)
  │  validate: signature (JWKS), iss, exp/nbf, aud, roles
  └─ outbound service calls → client_credentials token (own client per service)

Keycloak (own realm per product, never the master realm) ── PostgreSQL, behind reverse proxy, HTTPS
```

## 3. Attacks → mitigations

| Attack / risk | Mitigation in this standard |
|---|---|
| Password phishing / app handling raw passwords | Passwords are entered only on Keycloak pages, and ROPC is disabled |
| XSS stealing tokens | No tokens in the browser (BFF). HttpOnly session cookie, strict CSP |
| CSRF on BFF endpoints | `csrf.spa()` (double-submit cookie + header), SameSite=Lax, `state` param in the OAuth flow |
| Authorization code interception / injection | PKCE S256 on **every** client, confidential clients included (RFC 9700 §2.1.1) |
| Open redirect / code leaking via redirect_uri | **Exact** redirect URIs, no wildcards (RFC 9700 §4.1.3). No app endpoint forwards to arbitrary URLs |
| Mix-up attack (multiple IdPs) | Single issuer per client. Validate `iss` (Spring does this automatically with `issuer-uri`) |
| Stolen access token replay | Short lifetime (5 min). Optionally **DPoP** sender-constrained tokens (fully supported since Keycloak 26.4) |
| Stolen refresh token | Refresh tokens stay server-side in the BFF. Turn on **refresh token rotation** (Revoke Refresh Token, max reuse 0) |
| Token used against the wrong API (confused deputy) | Audience mapper in Keycloak. Resource server checks `aud` (RFC 9700 §2.3) |
| Over-privileged tokens | Turn off "Full Scope Allowed". Use minimal client scopes and per-client roles |
| JWT `alg=none` / key confusion | Spring validates against JWKS from the issuer with RS256/ES256 only. Never accept HS256 shared secrets from clients |
| Session fixation | Spring changes the session ID on login (default). Keep it |
| Session hijack after logout | RP-initiated logout (OIDC end_session) + invalidate the BFF session. Optionally back-channel logout |
| Brute force / credential stuffing | Keycloak Brute Force Detection on, MFA/passkeys, rate limiting at the reverse proxy |
| Account takeover via password reset | Patch Keycloak (e.g. **CVE-2026-18963**, critical reset-flow bypass). Verify-email required |
| Lockout bypass via device/CIBA grants (CVE-2026-88770, CVE-2026-9798) | Disable Device Authorization and CIBA grants on every client that doesn't need them |
| Clickjacking of login/app | `frame-ancestors 'none'` CSP + X-Frame-Options DENY (app and Keycloak) |
| Admin console takeover | Admin console on an internal hostname/network only. Strong admin MFA. Separate realm for apps |
| Secrets leakage | Client secrets in a vault/env, never in git. Rotate. Prefer `private_key_jwt` client auth for high-value clients |
| Sensitive data in logs | Never log tokens, `Authorization` headers or codes. Mask in access logs |
| CORS abuse | SPA served from the same origin as the BFF, so you need no CORS. APIs are not called directly from the browser |
| Downgrade / sniffing | HTTPS everywhere, HSTS, `Secure` cookies, TLS between internal services where possible |

## 4. Keycloak configuration checklist

**Server**
- [ ] Use a supported, fully patched 26.x line. Keycloak has no LTS, so stay on the latest minor release
- [ ] Use PostgreSQL, not the dev H2 database. Run in `start` mode (not `start-dev`) with `hostname` set
- [ ] Put a reverse proxy in front with TLS and `proxy-headers=xforwarded`. Rate limit `/realms/*/protocol/openid-connect/token` and the login pages
- [ ] Serve the admin console on a separate internal hostname (`hostname-admin`), never exposed publicly
- [ ] Turn on metrics/health and send event logging (login errors, admin events) to your SIEM

**Realm** (one per product, never use `master` for apps)
- [ ] Brute Force Detection: ON (lockout permanent=false, with sensible wait increments)
- [ ] Password policy: length ≥ 12, `notUsername`, `passwordHistory`, optionally `passwordBlacklist`
- [ ] Verify email: ON. Offer OTP/WebAuthn (passkeys) as required actions, and require them for admin roles
- [ ] Tokens: access token 5 min. SSO Session Idle 30 min, Max 10 h (tune per app). **Revoke Refresh Token: ON, reuse 0**
- [ ] Turn off user registration unless you need it. If it's on, add reCAPTCHA/Turnstile on the registration flow
- [ ] Security headers on (realm → Security defenses): X-Frame-Options, CSP `frame-ancestors 'self'`

**BFF client** (`<app>-bff`)
- [ ] Client authentication ON (confidential), Standard flow ON
- [ ] Direct access grants **OFF**, Implicit **OFF**, Device grant **OFF**, CIBA **OFF**, Service accounts OFF
- [ ] PKCE method: **S256** (Advanced → Proof Key for Code Exchange Code Challenge Method)
- [ ] Valid redirect URIs: exact, e.g. `https://app.example.com/login/oauth2/code/keycloak`
- [ ] Valid post logout redirect URIs: exact. Web origins: `+` or exact
- [ ] Full Scope Allowed: OFF. Assign only the needed roles/scopes
- [ ] Audience mapper → each API client id the BFF calls
- [ ] Optional: client authenticator `Signed JWT` (private_key_jwt) instead of a client secret. Turn on "Require DPoP bound tokens" when the BFF sends DPoP proofs

**Service clients** (`<service>-svc`)
- [ ] Service accounts ON. Every other flow OFF
- [ ] Assign only the roles of the target API (client roles)

**API clients** (`<api>`): bearer-only style, with no flows enabled. They exist only to own roles and act as audience.

## 5. Spring Boot 4 BFF

`build.gradle` / `pom.xml`: `spring-boot-starter-oauth2-client`, `spring-boot-starter-web`, `spring-session-data-redis` (for multiple instances).

```yaml
# application.yml (BFF)
server:
  forward-headers-strategy: framework          # behind a TLS-terminating proxy
  servlet:
    session:
      timeout: 30m
      cookie:
        name: __Host-SESSION
        http-only: true
        secure: true
        same-site: lax
        path: /

spring:
  security:
    oauth2:
      client:
        provider:
          keycloak:
            issuer-uri: https://auth.example.com/realms/myapp
        registration:
          keycloak:
            client-id: myapp-bff
            client-secret: ${KEYCLOAK_BFF_SECRET}
            authorization-grant-type: authorization_code
            redirect-uri: "{baseUrl}/login/oauth2/code/{registrationId}"
            scope: openid,profile,email
```

```java
@Configuration
@EnableWebSecurity
class BffSecurityConfig {

    @Bean
    SecurityFilterChain bffFilterChain(HttpSecurity http, ClientRegistrationRepository registrations) throws Exception {
        var authorizationRequestResolver =
                new DefaultOAuth2AuthorizationRequestResolver(registrations, "/oauth2/authorization");
        authorizationRequestResolver.setAuthorizationRequestCustomizer(
                OAuth2AuthorizationRequestCustomizers.withPkce());   // PKCE for confidential client too

        var oidcLogout = new OidcClientInitiatedLogoutSuccessHandler(registrations);
        oidcLogout.setPostLogoutRedirectUri("{baseUrl}/");

        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/", "/index.html", "/assets/**", "/actuator/health").permitAll()
                .anyRequest().authenticated())
            .oauth2Login(login -> login
                .authorizationEndpoint(endpoint -> endpoint.authorizationRequestResolver(authorizationRequestResolver)))
            .logout(logout -> logout.logoutSuccessHandler(oidcLogout))
            .csrf(csrf -> csrf.spa())                              // XSRF-TOKEN cookie + X-XSRF-TOKEN header
            .exceptionHandling(ex -> ex.defaultAuthenticationEntryPointFor(
                new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED),  // SPA XHR gets 401, not a 302 to Keycloak
                PathPatternRequestMatcher.withDefaults().matcher("/api/**")))
            .headers(headers -> headers
                .contentSecurityPolicy(csp -> csp.policyDirectives(
                    "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"))
                .httpStrictTransportSecurity(hsts -> hsts.includeSubDomains(true).maxAgeInSeconds(31_536_000))
                .referrerPolicy(ref -> ref.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN)));
        return http.build();
    }

    // BFF → API calls: attaches the logged-in user's access token and refreshes it automatically
    @Bean
    RestClient apiRestClient(RestClient.Builder builder, OAuth2AuthorizedClientManager authorizedClientManager) {
        return builder
            .baseUrl("https://api.internal.example.com")
            .requestInterceptor(new OAuth2ClientHttpRequestInterceptor(authorizedClientManager))
            .build();
    }
}
```

Call it with `.attributes(RequestAttributeClientRegistrationIdResolver.clientRegistrationId("keycloak"))`. Alternatively, use **Spring Cloud Gateway (Server MVC)** with the `TokenRelay` filter as the BFF and skip the hand-written proxy.

Frontend: call `/api/**` on the same origin with `credentials: 'include'`. Angular reads `XSRF-TOKEN` automatically. Elsewhere, copy the cookie into the `X-XSRF-TOKEN` header. Log in with `window.location = '/oauth2/authorization/keycloak'` and log out with a POST to `/logout`.

## 6. Spring Boot 4 Resource Server (each microservice)

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://auth.example.com/realms/myapp
          audiences: orders-api        # reject tokens not meant for this API
```

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
class ResourceServerSecurityConfig {

    @Bean
    SecurityFilterChain apiFilterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health").permitAll()
                .anyRequest().authenticated())
            .oauth2ResourceServer(rs -> rs.jwt(jwt -> jwt.jwtAuthenticationConverter(keycloakRolesConverter())))
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .csrf(AbstractHttpConfigurer::disable);   // stateless bearer API, no cookies
        return http.build();
    }

    // Maps Keycloak realm_access.roles → ROLE_* authorities  (use @PreAuthorize("hasRole('admin')"))
    private JwtAuthenticationConverter keycloakRolesConverter() {
        var converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
            if (realmAccess == null) {
                return List.of();
            }
            @SuppressWarnings("unchecked")
            var roles = (Collection<String>) realmAccess.getOrDefault("roles", List.of());
            return roles.stream()
                .<GrantedAuthority>map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                .toList();
        });
        return converter;
    }
}
```

Use client roles (`resource_access.<client>.roles`) instead of realm roles if each API owns its own roles.

## 7. Service-to-service (client credentials)

```yaml
spring:
  security:
    oauth2:
      client:
        provider:
          keycloak:
            issuer-uri: https://auth.example.com/realms/myapp
        registration:
          orders-svc:
            provider: keycloak
            client-id: orders-svc
            client-secret: ${KEYCLOAK_ORDERS_SVC_SECRET}
            authorization-grant-type: client_credentials
```

Use the same `OAuth2ClientHttpRequestInterceptor` on a `RestClient` with `clientRegistrationId("orders-svc")`. Tokens are cached and renewed automatically.

## 8. Ops / keep current

- Watch the Keycloak security advisories (GitHub `keycloak/keycloak` → Security) and patch within days for critical issues. Recent examples: CVE-2026-18963 (reset takeover), CVE-2026-88770 (device grant lockout bypass), CVE-2026-90997 (replay protection bypass, fixed in 26.7.4).
- Take a database dump before every Keycloak upgrade.
- Track Spring Boot / Spring Security patch releases (Dependabot or Renovate).
- Run OWASP ZAP or a pen test against the login, logout and BFF endpoints before go-live.
- Alert on spikes in `LOGIN_ERROR`, `CODE_TO_TOKEN_ERROR` and `REFRESH_TOKEN_ERROR` events.

## 9. New-project checklist (copy into each project)

- [ ] Realm created (not master), brute force ON, verify email ON, MFA/passkeys available
- [ ] BFF client: confidential, standard flow only, PKCE S256, exact redirect URIs, full scope OFF, audience mapper
- [ ] Each API: own client for roles + `audiences` check in Spring
- [ ] Each service: own client_credentials client with minimal roles
- [ ] BFF: oauth2Login + PKCE + `csrf.spa()` + OIDC logout + `__Host-` HttpOnly Secure cookie + CSP/HSTS
- [ ] Spring Session Redis if more than one BFF instance
- [ ] No tokens in the browser, logs, or URLs
- [ ] Secrets in vault/env, rotated
- [ ] Keycloak on the latest patched 26.x, admin console internal only
- [ ] ZAP / pen test done

## Sources
- [RFC 9700 – OAuth 2.0 Security Best Current Practice](https://www.rfc-editor.org/rfc/rfc9700.html)
- [IETF draft – OAuth 2.0 for Browser-Based Applications (BFF pattern)](https://datatracker.ietf.org/doc/draft-ietf-oauth-browser-based-apps/)
- [Keycloak – DPoP fully supported in 26.4](https://www.keycloak.org/2025/10/dpop-support-26-4) · [DPoP guide](https://www.keycloak.org/securing-apps/dpop)
- [Spring Security 7 – CSRF / SPA](https://docs.spring.io/spring-security/reference/7.0/servlet/exploits/csrf.html)
- [Keycloak 26.7 + Spring Boot 4.1 tested example (phasetwo)](https://phasetwo.io/tutorials/securing-applications/spring-boot/)
- [Keycloak hardening checklist (Skycloak)](https://skycloak.io/blog/keycloak-security-audit-hardening-checklist/)
- [CVE-2026-18963 password reset takeover](https://skycloak.io/blog/keycloak-password-reset-cve-2026-18963-2/) · [CVE-2026-88770](https://stack.watch/vuln/CVE-2026-88770/) · [Advisory batch 2026-09](https://buttondown.com/keycloak-advisory-watch/archive/keycloak-advisory-batch-2026-09-16-1-advisory-1/)
