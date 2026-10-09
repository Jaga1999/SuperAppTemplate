package com.superapp.user.internal;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.superapp.user.UserDirectory;

@Service
@Transactional(readOnly = true)
class JpaUserDirectory implements UserDirectory {

    private final AppUserRepository users;

    JpaUserDirectory(AppUserRepository users) {
        this.users = users;
    }

    @Override
    public Page<UserSummary> list(Pageable pageable) {
        return users.findAll(pageable).map(JpaUserDirectory::summary);
    }

    @Override
    public Optional<UserSummary> find(UUID id) {
        return users.findById(id).map(JpaUserDirectory::summary);
    }

    @Override
    public long countActive() {
        return users.countByStatus(AppUser.Status.ACTIVE);
    }

    @Override
    public long countSignedUpSince(Instant since) {
        return users.countByCreatedAtAfter(since);
    }

    private static UserSummary summary(AppUser u) {
        return new UserSummary(u.id(), u.email(), u.displayName(), u.status().name(), u.createdAt(), u.lastLoginAt());
    }
}
