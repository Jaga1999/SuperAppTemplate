package com.superapp.auth.internal.token;

import jakarta.servlet.http.HttpServletRequest;

import org.jspecify.annotations.Nullable;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;

import com.superapp.auth.internal.cookie.AuthCookies;
import com.superapp.auth.internal.cookie.AuthCookies.Kind;

/**
 * The access token comes from the encrypted HttpOnly cookie (or from a refresh that happened earlier in this
 * request). {@code Authorization} headers are deliberately ignored: browsers must not carry bearer tokens.
 *
 * <p><b>CSRF:</b> Spring's resource server exempts requests that carry a bearer token from CSRF protection, which
 * is right for {@code Authorization} headers but wrong for cookies (browsers attach cookies automatically).
 * This resolver therefore only yields a token once {@link #CSRF_VERIFIED} is set, which happens <i>after</i>
 * {@code CsrfFilter} has accepted the request. The exemption check (which runs inside {@code CsrfFilter}) never
 * sees a token, so every cookie-authenticated mutation must present a valid {@code X-XSRF-TOKEN}.
 */
public class CookieBearerTokenResolver implements BearerTokenResolver {

    /** Public endpoints ignore any (possibly stale) session cookie instead of failing with 401. */
    public static final String PUBLIC_API_PREFIX = "/api/v1/public/";

    /** Set by {@code CsrfCookieFilter}, which runs right after {@code CsrfFilter}. */
    public static final String CSRF_VERIFIED = CookieBearerTokenResolver.class.getName() + ".CSRF_VERIFIED";

    private final AuthCookies cookies;

    public CookieBearerTokenResolver(AuthCookies cookies) {
        this.cookies = cookies;
    }

    @Override
    public @Nullable String resolve(HttpServletRequest request) {
        if (request.getAttribute(CSRF_VERIFIED) == null) {
            return null;
        }
        // Public endpoints and session plumbing (/api/auth/logout must work even with a dead session) never
        // authenticate from cookies.
        if (request.getRequestURI().startsWith(PUBLIC_API_PREFIX)
                || request.getRequestURI().startsWith("/api/auth/")
                || request.getAttribute(TokenRefreshFilter.SESSION_ENDED) != null) {
            return null;
        }
        if (request.getAttribute(TokenRefreshFilter.REFRESHED_ACCESS_TOKEN) instanceof String refreshed) {
            return refreshed;
        }
        return cookies.read(request, Kind.ACCESS).orElse(null);
    }
}
