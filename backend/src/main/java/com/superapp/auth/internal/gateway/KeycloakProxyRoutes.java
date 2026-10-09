package com.superapp.auth.internal.gateway;

import java.util.Arrays;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.web.servlet.function.RequestPredicate;
import org.springframework.web.servlet.function.RouterFunction;
import org.springframework.web.servlet.function.ServerRequest;
import org.springframework.web.servlet.function.ServerResponse;

import com.superapp.auth.BffProperties;
import com.superapp.auth.internal.cookie.AuthCookies;

import static org.springframework.cloud.gateway.server.mvc.filter.BeforeFilterFunctions.uri;
import static org.springframework.cloud.gateway.server.mvc.handler.GatewayRouterFunctions.route;
import static org.springframework.cloud.gateway.server.mvc.handler.HandlerFunctions.http;
import static org.springframework.web.servlet.function.RequestPredicates.path;

/**
 * The only way a browser reaches Keycloak: an allow-listed reverse proxy (Spring Cloud Gateway Server MVC).
 *
 * <p>Exposed: the themed login UI and what it needs. Not exposed: token/introspection/userinfo/JWKS endpoints,
 * the account console, the admin console and every other realm (incl. {@code master}). Unknown paths 404.
 *
 * <ul>
 *   <li>{@code /auth/realms/<realm>/protocol/openid-connect/auth} – authorization endpoint (login entry)</li>
 *   <li>{@code /auth/realms/<realm>/login-actions/**} – every login/registration/reset/MFA/passkey/email-link step</li>
 *   <li>{@code /auth/realms/<realm>/broker/**} – identity-provider callbacks (Google)</li>
 *   <li>{@code /auth/resources/**} – theme assets (our Keycloakify bundle)</li>
 * </ul>
 */
@Configuration(proxyBeanMethods = false)
public class KeycloakProxyRoutes {

    @Bean
    RouterFunction<ServerResponse> keycloakProxy(BffProperties properties, AuthCookies cookies) {
        var realm = "/auth/realms/" + properties.keycloak().realm();
        RequestPredicate allowed = path(realm + "/protocol/openid-connect/auth")
                .or(path(realm + "/login-actions/**"))
                .or(path(realm + "/broker/**"))
                .or(path("/auth/resources/**"));

        return route("keycloak-login-ui")
                .route(allowed, http())
                .before(uri(properties.internalOrigin()))
                // X-Forwarded-* for Keycloak: added by the gateway's own filter (see application.yaml, trusted-proxies).
                .before(stripBffCookies(cookies))
                .build();
    }

    /** Our encrypted token cookies are none of Keycloak's business: never forward them. */
    private static Function<ServerRequest, ServerRequest> stripBffCookies(AuthCookies cookies) {
        return request -> {
            var header = request.headers().firstHeader(HttpHeaders.COOKIE);
            if (header == null) {
                return request;
            }
            var kept = Arrays.stream(header.split(";"))
                    .map(String::trim)
                    .filter(c -> !c.isEmpty() && !cookies.isBffCookie(c.substring(0, Math.max(0, c.indexOf('=')))))
                    .collect(Collectors.joining("; "));
            return ServerRequest.from(request)
                    .headers(h -> {
                        if (kept.isEmpty()) {
                            h.remove(HttpHeaders.COOKIE);
                        } else {
                            h.set(HttpHeaders.COOKIE, kept);
                        }
                    })
                    .build();
        };
    }
}
