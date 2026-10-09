package com.superapp.auth;

import java.time.Instant;
import java.util.UUID;

/**
 * Instant revocation of Keycloak access tokens that are still within their (short) lifetime.
 *
 * <p>Keycloak owns sessions: once a session is gone, refresh fails there. This service closes the remaining gap
 * (an access token that is still valid for up to its lifespan) by denying tokens of revoked sessions/users at once.
 * Markers only need to live as long as the longest access token, so they expire on their own.
 */
public interface SessionRevocation {

    /** Rejects every access token issued for this Keycloak session ({@code sid}). */
    void revokeSession(String sessionId);

    /** Rejects every access token of this user issued at or before {@code at} (sign-out everywhere, disable, delete). */
    void revokeUser(UUID userId, Instant at);

    boolean isRevoked(String sessionId, UUID userId, Instant issuedAt);
}
