package com.superapp.user;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.jspecify.annotations.Nullable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/** Read access to the local user projection for other features (e.g. admin). */
public interface UserDirectory {

    record UserSummary(UUID id, @Nullable String email, @Nullable String displayName, String status,
            Instant createdAt, @Nullable Instant lastLoginAt) {
    }

    Page<UserSummary> list(Pageable pageable);

    Optional<UserSummary> find(UUID id);

    long countActive();

    long countSignedUpSince(Instant since);
}
