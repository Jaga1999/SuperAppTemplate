package com.superapp.auth;

import java.time.Instant;
import java.util.UUID;

import org.jspecify.annotations.Nullable;

/**
 * Published (in-process) every time a user completes a Keycloak login through the BFF.
 * Carries the verified ID-token profile so other features can keep a local projection up to date.
 */
public record UserSignedIn(
        UUID userId,
        @Nullable String email,
        boolean emailVerified,
        @Nullable String givenName,
        @Nullable String familyName,
        @Nullable String displayName,
        @Nullable String pictureUrl,
        Instant signedInAt) {
}
