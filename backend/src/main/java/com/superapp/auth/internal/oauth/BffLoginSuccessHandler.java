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
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.web.util.UriComponentsBuilder;

import com.superapp.auth.BffProperties;
import com.superapp.auth.UserSignedIn;

/**
 * After Keycloak redirects back and the code is exchanged (tokens are already in cookies):
 * <ol>
 *   <li>publish {@link UserSignedIn} so the local user projection is upserted just-in-time,</li>
 *   <li>redirect to the allow-listed return path, flagging the outcome of an application-initiated action.</li>
 * </ol>
 */
public class BffLoginSuccessHandler implements AuthenticationSuccessHandler {

    private static final Logger log = LoggerFactory.getLogger(BffLoginSuccessHandler.class);

    private final ApplicationEventPublisher events;
    private final String defaultReturnPath;

    public BffLoginSuccessHandler(ApplicationEventPublisher events, BffProperties properties) {
        this.events = events;
        this.defaultReturnPath = properties.defaultReturnPath();
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
}
