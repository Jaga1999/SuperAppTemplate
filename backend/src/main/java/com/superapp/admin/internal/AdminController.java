package com.superapp.admin.internal;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import org.jspecify.annotations.Nullable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.superapp.auth.SessionRevocation;
import com.superapp.identity.IdentityDirectory;
import com.superapp.user.UserDirectory;

@RestController
@RequestMapping(path = "/api/{version}/admin", version = "1")
@PreAuthorize("hasRole('admin')")
class AdminController {

    private final UserDirectory users;
    private final IdentityDirectory identity;
    private final SessionRevocation revocation;

    AdminController(UserDirectory users, IdentityDirectory identity, SessionRevocation revocation) {
        this.users = users;
        this.identity = identity;
        this.revocation = revocation;
    }

    record Overview(long activeUsers, long keycloakUsers, long signupsLast7Days) {
    }

    record AdminUserView(UUID id, @Nullable String email, @Nullable String displayName, String status,
            Instant createdAt, @Nullable Instant lastLoginAt) {
    }

    @GetMapping("/overview")
    Overview overview() {
        return new Overview(users.countActive(), identity.countUsers(),
                users.countSignedUpSince(Instant.now().minus(Duration.ofDays(7))));
    }

    @GetMapping("/users")
    Page<AdminUserView> users(@RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        var result = users.list(PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return result.map(u -> new AdminUserView(u.id(), u.email(), u.displayName(), u.status(), u.createdAt(),
                u.lastLoginAt()));
    }

    /** Force sign-out of a user on every device, effective immediately. */
    @PostMapping("/users/{id}/sign-out")
    ResponseEntity<Void> signOut(@PathVariable UUID id) {
        identity.endAllSessions(id);
        revocation.revokeUser(id, Instant.now());
        return ResponseEntity.noContent().build();
    }
}
