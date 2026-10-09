package com.superapp.identity;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import org.jspecify.annotations.Nullable;

/** Read/act on users in Keycloak through its Admin REST API (service account, least privilege). */
public interface IdentityDirectory {

    record IdentityUser(
            UUID id,
            @Nullable String email,
            boolean emailVerified,
            @Nullable String firstName,
            @Nullable String lastName,
            boolean enabled,
            @Nullable Instant createdAt) {
    }

    record IdentitySession(String id, @Nullable String ipAddress, Instant startedAt, Instant lastAccessAt,
            boolean rememberMe, Set<String> clients) {
    }

    record IdentityCredential(String id, String type, @Nullable String label, @Nullable Instant createdAt) {
    }

    record LinkedProvider(String alias, @Nullable String username) {
    }

    Optional<IdentityUser> findUser(UUID userId);

    List<IdentitySession> sessions(UUID userId);

    /** Ends one session. Returns {@code false} if it does not belong to the user. */
    boolean endSession(UUID userId, String sessionId);

    /** Ends every session of the user in Keycloak (triggers back-channel logout). */
    void endAllSessions(UUID userId);

    List<IdentityCredential> credentials(UUID userId);

    List<LinkedProvider> linkedProviders(UUID userId);

    void unlinkProvider(UUID userId, String alias);

    long countUsers();
}
