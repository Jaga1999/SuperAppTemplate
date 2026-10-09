package com.superapp.auth.internal.oauth;

import java.io.IOException;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.web.util.UriComponentsBuilder;

import com.superapp.auth.internal.cookie.AuthCookies;
import com.superapp.auth.internal.cookie.AuthCookies.Kind;

/**
 * Turns every login failure into a clean, user-facing redirect with a short, allow-listed reason code.
 * Detailed causes go to the log only.
 *
 * <ul>
 *   <li>{@code access_denied} – the user cancelled (e.g. declined terms, closed an action). For actions started from
 *       a page we send them back there with {@code ?action=cancelled}.</li>
 *   <li>{@code session_expired} – the login took longer than the auth-request cookie lives, or another tab
 *       started a newer login.</li>
 *   <li>{@code login_failed} – anything else.</li>
 * </ul>
 */
public class BffLoginFailureHandler implements AuthenticationFailureHandler {

    private static final Logger log = LoggerFactory.getLogger(BffLoginFailureHandler.class);

    private final AuthCookies cookies;
    private final EncryptedCookieAuthorizationRequestRepository authorizationRequests;

    public BffLoginFailureHandler(AuthCookies cookies, EncryptedCookieAuthorizationRequestRepository authorizationRequests) {
        this.cookies = cookies;
        this.authorizationRequests = authorizationRequests;
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
