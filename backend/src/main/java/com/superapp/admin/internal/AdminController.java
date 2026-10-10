package com.superapp.admin.internal;

import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.jspecify.annotations.Nullable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.superapp.auth.SessionRevocation;
import com.superapp.identity.IdentityDirectory;
import com.superapp.shared.web.DomainException;
import com.superapp.user.UserDirectory;
import com.superapp.admin.internal.docs.AdminApiDocs;

/** Admin-only user management. Authorization is enforced twice: the API filter chain and {@code @PreAuthorize}. */
@RestController
@RequestMapping(path = "/api/{version}/admin", version = "1")
@PreAuthorize("hasRole('admin')")
public class AdminController implements AdminApiDocs {

    private final UserDirectory users;
    private final IdentityDirectory identity;
    private final SessionRevocation revocation;

    AdminController(UserDirectory users, IdentityDirectory identity, SessionRevocation revocation) {
        this.users = users;
        this.identity = identity;
        this.revocation = revocation;
    }

    public record Overview(long activeUsers, long keycloakUsers, long signupsLast7Days) {
    }

    public record AdminUserView(UUID id, @Nullable String email, @Nullable String displayName, String status,
            Instant createdAt, @Nullable Instant lastLoginAt) {
    }

    public record AdminSessionView(String id, @Nullable String ipAddress, Instant startedAt, Instant lastAccessAt,
            boolean rememberMe, Set<String> clients) {
    }

    /** Keycloak's live view next to the local projection; {@code inKeycloak=false} means the account is gone there. */
    public record AdminUserDetail(AdminUserView user, boolean inKeycloak, boolean enabled, boolean emailVerified,
            @Nullable String firstName, @Nullable String lastName, List<String> credentialTypes,
            List<IdentityDirectory.LinkedProvider> linkedProviders, List<AdminSessionView> sessions) {
    }

    @GetMapping("/overview")
    @Override
    public Overview overview() {
        return new Overview(users.countActive(), identity.countUsers(),
                users.countSignedUpSince(Instant.now().minus(Duration.ofDays(7))));
    }

    @GetMapping("/users")
    @Override
    public Page<AdminUserView> users(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return users.list(PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")))
                .map(AdminController::view);
    }

    @GetMapping("/users/{id}")
    @Override
    public AdminUserDetail user(@PathVariable UUID id) {
        var local = users.find(id).orElseThrow(UserNotFound::new);
        var remote = identity.findUser(id);
        if (remote.isEmpty()) {
            return new AdminUserDetail(view(local), false, false, false, null, null, List.of(), List.of(), List.of());
        }
        var u = remote.get();
        var sessions = identity.sessions(id).stream()
                .map(s -> new AdminSessionView(s.id(), s.ipAddress(), s.startedAt(), s.lastAccessAt(), s.rememberMe(),
                        s.clients()))
                .sorted(Comparator.comparing(AdminSessionView::lastAccessAt).reversed())
                .toList();
        var credentialTypes = identity.credentials(id).stream().map(IdentityDirectory.IdentityCredential::type)
                .distinct().sorted().toList();
        return new AdminUserDetail(view(local), true, u.enabled(), u.emailVerified(), u.firstName(), u.lastName(),
                credentialTypes, identity.linkedProviders(id), sessions);
    }

    /** Ends one session of a user (that device only), effective immediately. */
    @DeleteMapping("/users/{id}/sessions/{sessionId}")
    @Override
    public ResponseEntity<Void> endSession(@PathVariable UUID id, @PathVariable String sessionId) {
        if (!identity.endSession(id, sessionId)) {
            throw new SessionNotFound();
        }
        revocation.revokeSession(sessionId);
        return ResponseEntity.noContent().build();
    }

    /** Force sign-out of a user on every device, effective immediately. */
    @PostMapping("/users/{id}/sign-out")
    @Override
    public ResponseEntity<Void> signOut(@PathVariable UUID id) {
        identity.endAllSessions(id);
        revocation.revokeUser(id, Instant.now());
        return ResponseEntity.noContent().build();
    }

    private static AdminUserView view(UserDirectory.UserSummary u) {
        return new AdminUserView(u.id(), u.email(), u.displayName(), u.status(), u.createdAt(), u.lastLoginAt());
    }

    static final class UserNotFound extends DomainException {
        UserNotFound() {
            super(HttpStatus.NOT_FOUND, "user-not-found", "User not found", "No user with that id exists.");
        }
    }

    static final class SessionNotFound extends DomainException {
        SessionNotFound() {
            super(HttpStatus.NOT_FOUND, "session-not-found", "Session not found", "That session no longer exists.");
        }
    }
}
