package com.superapp.identity;

import java.util.UUID;

import org.jspecify.annotations.Nullable;

/**
 * Identity lifecycle changes that happened in Keycloak (self-service or admin), published in-process after being
 * consumed from the {@code keycloak.events} Kafka topic. Sealed: listeners can switch exhaustively.
 */
public sealed interface IdentityEvent {

    UUID userId();

    record UserRegistered(UUID userId, @Nullable String email) implements IdentityEvent {
    }

    /** Profile, email or verification status changed; re-read the user from the directory. */
    record UserProfileChanged(UUID userId) implements IdentityEvent {
    }

    record UserDisabled(UUID userId) implements IdentityEvent {
    }

    /** Account deleted (self-service "delete account" or by an admin). Erase personal data. */
    record UserDeleted(UUID userId) implements IdentityEvent {
    }
}
