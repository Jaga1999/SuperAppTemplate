package com.superapp.auth.internal.token;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.filter.OncePerRequestFilter;

import com.superapp.auth.internal.cookie.AuthCookies;
import com.superapp.auth.internal.cookie.AuthCookies.Kind;

/**
 * Silent, server-side token refresh. Runs before bearer-token authentication on {@code /api/**}.
 *
 * <p>If the access token is missing or expires within {@link #REFRESH_SKEW}, the refresh token is exchanged with
 * Keycloak (single-flight via {@link RefreshCoordinator}), new cookies are set on <i>this</i> response, and the
 * fresh access token is handed to authentication for <i>this</i> request. The frontend never knows it happened.
 * If Keycloak refuses (session ended/revoked), cookies are cleared and the request continues unauthenticated (→ 401).
 *
 * <p>Not a Spring bean on purpose: it must only run inside the API security chain, never as a global servlet filter.
 */
public class TokenRefreshFilter extends OncePerRequestFilter {

    /** Request attribute holding a freshly refreshed access token for {@link CookieBearerTokenResolver}. */
    public static final String REFRESHED_ACCESS_TOKEN = TokenRefreshFilter.class.getName() + ".ACCESS_TOKEN";
    /** Request attribute set when Keycloak refused the refresh: the cookies in this request are dead. */
    public static final String SESSION_ENDED = TokenRefreshFilter.class.getName() + ".SESSION_ENDED";

    private static final Logger log = LoggerFactory.getLogger(TokenRefreshFilter.class);
    private static final Duration REFRESH_SKEW = Duration.ofSeconds(30);

    private final AuthCookies cookies;
    private final RefreshCoordinator refresher;

    public TokenRefreshFilter(AuthCookies cookies, RefreshCoordinator refresher) {
        this.cookies = cookies;
        this.refresher = refresher;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var access = cookies.read(request, Kind.ACCESS);
        var stillFresh = access.flatMap(JwtPeek::expiresAt)
                .map(exp -> exp.isAfter(Instant.now().plus(REFRESH_SKEW)))
                .orElse(false);
        if (!stillFresh) {
            cookies.read(request, Kind.REFRESH).ifPresent(refreshToken -> refresh(refreshToken, request, response));
        }
        chain.doFilter(request, response);
    }

    private void refresh(String refreshToken, HttpServletRequest request, HttpServletResponse response) {
        try {
            var tokens = refresher.refresh(refreshToken);
            cookies.writeTokens(response, tokens);
            request.setAttribute(REFRESHED_ACCESS_TOKEN, tokens.accessToken());
        } catch (KeycloakTokenClient.RefreshRejectedException e) {
            log.debug("Session could not be refreshed: {}", e.getMessage());
            cookies.clearSession(response);
            request.setAttribute(SESSION_ENDED, Boolean.TRUE);
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return request.getRequestURI().equals("/api/auth/backchannel-logout");
    }
}
