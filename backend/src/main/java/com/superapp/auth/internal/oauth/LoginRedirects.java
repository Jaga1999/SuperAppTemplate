package com.superapp.auth.internal.oauth;

import java.io.IOException;
import java.time.Instant;
import java.util.UUID;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.web.util.UriComponentsBuilder;

import com.superapp.auth.BffProperties;
import com.superapp.auth.UserSignedIn;
import com.superapp.auth.internal.cookie.AuthCookies;
import com.superapp.auth.internal.cookie.AuthCookies.Kind;

/**
 * Where the browser goes after Keycloak redirects back to the BFF.
 *
 * <p><b>Success</b> (the code is exchanged, tokens are already in cookies): publish {@link UserSignedIn} so the local
 * user projection is upserted just-in-time, then redirect to the allow-listed return path, flagging the outcome of an
 * application-initiated action ({@code ?action=success|cancelled|error}).
 *
 * <p><b>Failure</b>: a clean redirect with a short, allow-listed reason; details go to the log only.
 * <ul>
 *   <li>{@code access_denied} – the user cancelled (declined terms, closed an action). Actions started from a page go
 *       back there with {@code ?action=cancelled}.</li>
 *   <li>{@code session_expired} – the login outlived the auth-request cookie, or another tab started a newer one.</li>
 *   <li>{@code login_failed} – anything else.</li>
 * </ul>
 */
public class LoginRedirects implements AuthenticationSuccessHandler, AuthenticationFailureHandler {

    private static final Logger log = LoggerFactory.getLogger(LoginRedirects.class);

    private final ApplicationEventPublisher events;
    private final String defaultReturnPath;
    private final AuthCookies cookies;
    private final EncryptedCookieAuthorizationRequestRepository authorizationRequests;

    public LoginRedirects(ApplicationEventPublisher events, BffProperties properties, AuthCookies cookies,
            EncryptedCookieAuthorizationRequestRepository authorizationRequests) {
        this.events = events;
        this.defaultReturnPath = properties.defaultReturnPath();
        this.cookies = cookies;
        this.authorizationRequests = authorizationRequests;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
            Authentication authentication) throws IOException {
        if (authentication.getPrincipal() instanceof OidcUser user) {
            events.publishEvent(new UserSignedIn(
                    UUID.fromString(user.getSubject()),
                    user.getEmail(),
                    Boolean.TRUE.equals(user.getEmailVerified()),
                    user.getGivenName(),
                    user.getFamilyName(),
                    user.getFullName(),
                    user.getPicture(),
                    Instant.now()));
            log.info("User {} signed in", user.getSubject());
        }

        var returnTo = request.getAttribute(EncryptedCookieAuthorizationRequestRepository.RETURN_TO) instanceof String path
                ? path : defaultReturnPath;
        var target = UriComponentsBuilder.fromUriString(returnTo);
        // Keycloak reports the result of kc_action flows (success | cancelled | error) on the callback.
        var actionStatus = request.getParameter("kc_action_status");
        if (actionStatus != null && actionStatus.matches("success|cancelled|error")) {
            target.queryParam("action", actionStatus);
        }
        response.setHeader("Cache-Control", "no-store");
        response.sendRedirect(target.build().toUriString());
    }

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response,
            AuthenticationException exception) throws IOException {
        var code = exception instanceof OAuth2AuthenticationException oauth ? oauth.getError().getErrorCode() : "unknown";
        log.warn("Login failed: {} ({})", code, exception.getMessage());

        var returnTo = request.getAttribute(EncryptedCookieAuthorizationRequestRepository.RETURN_TO) instanceof String p
                ? p : authorizationRequests.peekReturnTo(request);
        cookies.clear(response, Kind.AUTH_REQUEST);

        var target = switch (code) {
            case "access_denied" -> returnTo != null
                    ? UriComponentsBuilder.fromUriString(returnTo).queryParam("action", "cancelled")
                    : UriComponentsBuilder.fromPath("/").queryParam("auth_error", "access_denied");
            case "authorization_request_not_found", "invalid_state_parameter" ->
                    UriComponentsBuilder.fromPath("/").queryParam("auth_error", "session_expired");
            default -> UriComponentsBuilder.fromPath("/").queryParam("auth_error", "login_failed");
        };
        response.setHeader("Cache-Control", "no-store");
        response.sendRedirect(target.build().toUriString());
    }
}
