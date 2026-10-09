package com.superapp.auth.internal.oauth;

import java.time.Instant;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.jspecify.annotations.Nullable;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizedClientRepository;

import com.superapp.auth.internal.cookie.AuthCookies;
import com.superapp.auth.internal.token.JwtPeek;
import com.superapp.auth.internal.token.TokenSet;

/**
 * Where Spring's {@code oauth2Login()} stores the tokens it obtained: straight into the encrypted HttpOnly
 * cookies. There is no server-side session, no in-memory token store, nothing to replicate across instances.
 */
public class CookieAuthorizedClientRepository implements OAuth2AuthorizedClientRepository {

    private final AuthCookies cookies;

    public CookieAuthorizedClientRepository(AuthCookies cookies) {
        this.cookies = cookies;
    }

    @Override
    public <T extends OAuth2AuthorizedClient> @Nullable T loadAuthorizedClient(String clientRegistrationId,
            @Nullable Authentication principal, HttpServletRequest request) {
        // The BFF never calls downstream APIs with the user's token via Spring's client manager.
        return null;
    }

    @Override
    public void saveAuthorizedClient(OAuth2AuthorizedClient client, @Nullable Authentication principal,
            HttpServletRequest request, HttpServletResponse response) {
        var access = client.getAccessToken();
        var refresh = client.getRefreshToken();
        var refreshValue = refresh != null ? refresh.getTokenValue() : null;
        // Keycloak refresh tokens are JWTs: their exp is the SSO-session (or remember-me) boundary.
        var refreshExpiry = refreshValue != null ? JwtPeek.expiresAt(refreshValue).orElse(null) : null;
        cookies.writeTokens(response, new TokenSet(
                access.getTokenValue(),
                access.getExpiresAt() != null ? access.getExpiresAt() : Instant.now().plusSeconds(60),
                refreshValue,
                refreshExpiry));
    }

    @Override
    public void removeAuthorizedClient(String clientRegistrationId, @Nullable Authentication principal,
            HttpServletRequest request, HttpServletResponse response) {
        cookies.clearSession(response);
    }
}
