package com.superapp.user.internal;

import java.time.Instant;

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
        return users.findAll(pageable).map(u -> new UserSummary(u.id(), u.email(), u.displayName(), u.status().name(),
                u.createdAt(), u.lastLoginAt()));
    }

    @Override
    public long countActive() {
        return users.countByStatus(AppUser.Status.ACTIVE);
    }

    @Override
    public long countSignedUpSince(Instant since) {
        return users.countByCreatedAtAfter(since);
    }
}
