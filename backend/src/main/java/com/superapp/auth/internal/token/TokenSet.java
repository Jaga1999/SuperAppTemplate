package com.superapp.auth.internal.token;

import java.time.Instant;
import java.util.Optional;

import org.jspecify.annotations.Nullable;

/** Keycloak tokens held by the BFF on behalf of a browser (never handed to JavaScript). */
public record TokenSet(
        String accessToken,
        Instant accessExpiresAt,
        @Nullable String refresh,
        @Nullable Instant refreshExpiry) {

    public Optional<String> refreshToken() {
        return Optional.ofNullable(refresh);
    }

    public Optional<Instant> refreshExpiresAt() {
        return Optional.ofNullable(refreshExpiry);
    }
}
