package com.superapp.auth.internal;

import org.springframework.boot.security.autoconfigure.actuate.web.servlet.EndpointRequest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.core.convert.converter.Converter;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.RequestAttributeSecurityContextRepository;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy;

import com.superapp.auth.BffProperties;
import com.superapp.auth.CurrentUser;
import com.superapp.auth.internal.cookie.AuthCookies;
import com.superapp.auth.internal.oauth.BffAuthorizationRequestResolver;
import com.superapp.auth.internal.oauth.CookieAuthorizedClientRepository;
import com.superapp.auth.internal.oauth.EncryptedCookieAuthorizationRequestRepository;
import com.superapp.auth.internal.oauth.LoginRedirects;
import com.superapp.auth.internal.token.CookieBearerTokenResolver;
import com.superapp.auth.internal.token.RefreshCoordinator;
import com.superapp.auth.internal.token.TokenRefreshFilter;
import com.superapp.auth.internal.web.CsrfCookieFilter;
import com.superapp.auth.internal.web.ProblemSecurityHandlers;

import tools.jackson.databind.json.JsonMapper;

/**
 * The BFF's security model, one ordered filter chain per surface. Every chain is stateless:
 * no {@code HttpSession} is ever created; state lives in encrypted cookies, Keycloak and Redis.
 *
 * <pre>
 *  1  /auth/**                    → reverse proxy to Keycloak's themed login UI (allow-listed routes)
 *  2  /oauth2/**, /login/oauth2/** → OAuth2 login: start (PKCE) + callback → tokens into encrypted cookies
 *  3  /api/**                     → resource server: cookie → silent refresh → JWT verify → revocation → roles
 *  4  actuator (port 9090)        → health / info / prometheus only
 *  5  /v3/api-docs, /swagger-ui   → API description (never routed by nginx)
 *  6  everything else             → denied
 * </pre>
 * Request rates are limited at the edge (nginx, per IP) and sign-in attempts by Keycloak's brute-force detection.
 */
@Configuration(proxyBeanMethods = false)
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    @Order(1)
    SecurityFilterChain keycloakProxyChain(HttpSecurity http) throws Exception {
        return http
                .securityMatcher("/auth/**")
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                // Keycloak protects its own forms (auth session + tab id + execution codes) and sends its own headers.
                .csrf(AbstractHttpConfigurer::disable)
                .headers(AbstractHttpConfigurer::disable)
                .requestCache(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .build();
    }

    @Bean
    @Order(2)
    SecurityFilterChain loginChain(HttpSecurity http, ClientRegistrationRepository registrations,
            EncryptedCookieAuthorizationRequestRepository authorizationRequests, AuthCookies cookies,
            ApplicationEventPublisher events, BffProperties properties) throws Exception {
        var redirects = new LoginRedirects(events, properties, cookies, authorizationRequests);
        return http
                .securityMatcher("/oauth2/**", "/login/oauth2/**")
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .oauth2Login(login -> login
                        .authorizationEndpoint(endpoint -> endpoint
                                .authorizationRequestResolver(new BffAuthorizationRequestResolver(registrations))
                                .authorizationRequestRepository(authorizationRequests))
                        .authorizedClientRepository(new CookieAuthorizedClientRepository(cookies))
                        .successHandler(redirects)
                        .failureHandler(redirects))
                // CSRF for the redirect flow is covered by state + PKCE (RFC 9700 §2.1, §4.7.1).
                .csrf(AbstractHttpConfigurer::disable)
                .requestCache(AbstractHttpConfigurer::disable)
                .securityContext(context -> context.securityContextRepository(new RequestAttributeSecurityContextRepository()))
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .build();
    }

    @Bean
    @Order(3)
    SecurityFilterChain apiChain(HttpSecurity http, AuthCookies cookies, RefreshCoordinator refresher,
            JwtDecoder jwtDecoder,
            JsonMapper json) throws Exception {
        var unauthorized = ProblemSecurityHandlers.unauthorized(json);
        var forbidden = ProblemSecurityHandlers.forbidden(json);
        return http
                .securityMatcher("/api/**")
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.POST, "/api/auth/logout", "/api/auth/backchannel-logout").permitAll()
                        .requestMatchers(HttpMethod.GET, CookieBearerTokenResolver.PUBLIC_API_PREFIX + "**").permitAll()
                        .requestMatchers("/api/v1/admin/**").hasRole(CurrentUser.ROLE_ADMIN)
                        .anyRequest().hasRole(CurrentUser.ROLE_USER))
                .oauth2ResourceServer(rs -> rs
                        .bearerTokenResolver(new CookieBearerTokenResolver(cookies))
                        .jwt(jwt -> jwt.decoder(jwtDecoder).jwtAuthenticationConverter(realmRolesAsAuthorities()))
                        .authenticationEntryPoint(unauthorized)
                        .accessDeniedHandler(forbidden))
                .exceptionHandling(ex -> ex.authenticationEntryPoint(unauthorized).accessDeniedHandler(forbidden))
                .csrf(csrf -> csrf.spa().ignoringRequestMatchers("/api/auth/backchannel-logout"))
                .requestCache(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .headers(headers -> headers
                        .contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'none'; frame-ancestors 'none'"))
                        .referrerPolicy(ref -> ref.policy(ReferrerPolicy.NO_REFERRER)))
                .addFilterAfter(new CsrfCookieFilter(), CsrfFilter.class)
                .addFilterBefore(new TokenRefreshFilter(cookies, refresher), BearerTokenAuthenticationFilter.class)
                .build();
    }

    @Bean
    @Order(4)
    SecurityFilterChain managementChain(HttpSecurity http) throws Exception {
        return http
                .securityMatcher(EndpointRequest.toAnyEndpoint())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(EndpointRequest.to("health", "info", "prometheus")).permitAll()
                        .anyRequest().denyAll())
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .build();
    }

    /**
     * API description and Swagger UI (springdoc). Read-only and unauthenticated, but never public: nginx routes no
     * such path to the BFF. Turned off entirely with {@code API_DOCS_ENABLED=false}.
     */
    @Bean
    @Order(5)
    SecurityFilterChain apiDocsChain(HttpSecurity http) throws Exception {
        return http
                .securityMatcher("/v3/api-docs/**", "/v3/api-docs", "/swagger-ui/**", "/swagger-ui.html")
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .csrf(AbstractHttpConfigurer::disable)
                .requestCache(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .build();
    }

    @Bean
    @Order(6)
    SecurityFilterChain denyEverythingElse(HttpSecurity http) throws Exception {
        return http
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/error").permitAll()
                        .anyRequest().denyAll())
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .build();
    }

    /** Keycloak realm roles become Spring authorities ({@code admin} → {@code ROLE_admin}). */
    private static Converter<Jwt, AbstractAuthenticationToken> realmRolesAsAuthorities() {
        return jwt -> new JwtAuthenticationToken(jwt, CurrentUser.realmRoles(jwt).stream()
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role)).toList(), jwt.getSubject());
    }

    @Bean
    EncryptedCookieAuthorizationRequestRepository authorizationRequestRepository(AuthCookies cookies, JsonMapper json) {
        return new EncryptedCookieAuthorizationRequestRepository(cookies, json);
    }
}
