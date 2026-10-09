package com.superapp.auth.internal.web;

import java.time.Instant;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.superapp.auth.SessionRevocation;
import com.superapp.auth.internal.cookie.AuthCookies;
import com.superapp.auth.internal.cookie.AuthCookies.Kind;
import com.superapp.auth.internal.token.JwtPeek;
import com.superapp.auth.internal.token.KeycloakTokenClient;
import com.superapp.auth.internal.token.LogoutTokenVerifier;

/** Session plumbing of the BFF (unversioned; not part of the product API). */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final AuthCookies cookies;
    private final KeycloakTokenClient keycloak;
    private final SessionRevocation revocation;
    private final LogoutTokenVerifier logoutTokens;

    public AuthController(AuthCookies cookies, KeycloakTokenClient keycloak, SessionRevocation revocation,
            LogoutTokenVerifier logoutTokens) {
        this.cookies = cookies;
        this.keycloak = keycloak;
        this.revocation = revocation;
        this.logoutTokens = logoutTokens;
    }

    /**
     * Logs out of this browser: ends the Keycloak SSO session server-to-server, revokes the session's still-valid
     * access tokens instantly, clears cookies. Idempotent; works even if the session already expired.
     */
    @PostMapping("/logout")
    ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response) {
        cookies.read(request, Kind.ACCESS)
                .flatMap(token -> JwtPeek.stringClaim(token, "sid"))
                .ifPresent(revocation::revokeSession);
        cookies.read(request, Kind.REFRESH).ifPresent(keycloak::logout);
        cookies.clearSession(response);
        return ResponseEntity.noContent().build();
    }

    /**
     * OIDC Back-Channel Logout (called by Keycloak on the private network, never by browsers; nginx blocks it).
     * Fired when a session ends anywhere: Keycloak admin, "sign out everywhere", password reset, idle timeout.
     */
    /**
     * OIDC Back-Channel Logout 1.0, called by Keycloak on the private network.
     * Reads the form body directly: Spring Cloud Gateway's FormFilter re-exposes form posts as a body stream for
     * proxying, so {@code @RequestParam} would only ever see query parameters here.
     */
    @PostMapping(path = "/backchannel-logout", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    ResponseEntity<Void> backchannelLogout(@RequestBody MultiValueMap<String, String> form) {
        var logoutToken = form.getFirst("logout_token");
        if (logoutToken == null || logoutToken.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        var verified = logoutTokens.verify(logoutToken);
        if (verified.isEmpty()) {
            log.warn("Rejected invalid back-channel logout token");
            return ResponseEntity.badRequest().build();
        }
        var token = verified.get();
        if (token.sessionId() != null) {
            revocation.revokeSession(token.sessionId());
        } else if (token.userId() != null) {
            revocation.revokeUser(token.userId(), Instant.now());
        }
        return ResponseEntity.ok().header("Cache-Control", "no-store").build();
    }
}
