package com.superapp.auth.internal.token;

import java.util.Optional;
import java.util.UUID;

import org.jspecify.annotations.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;

/** Verified content of a Keycloak back-channel logout token. */
public final class LogoutTokenVerifier {

    public record LogoutToken(@Nullable String sessionId, @Nullable UUID userId) {
    }

    private static final Logger log = LoggerFactory.getLogger(LogoutTokenVerifier.class);

    private final JwtDecoder decoder;

    LogoutTokenVerifier(JwtDecoder decoder) {
        this.decoder = decoder;
    }

    public Optional<LogoutToken> verify(String token) {
        try {
            var jwt = decoder.decode(token);
            var sub = jwt.getSubject();
            return Optional.of(new LogoutToken(jwt.getClaimAsString("sid"), sub != null ? UUID.fromString(sub) : null));
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("Back-channel logout token rejected: {}", e.getMessage()); // reason only, never the token
            return Optional.empty();
        }
    }
}
