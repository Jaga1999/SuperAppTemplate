package com.superapp.identity.internal;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.superapp.auth.CurrentUser;
import com.superapp.auth.SessionRevocation;
import com.superapp.identity.IdentityDirectory;
import com.superapp.shared.web.DomainException;

/**
 * Self-service account security, backed by Keycloak. Changing credentials (password, OTP, passkeys, recovery codes,
 * linking Google, deleting the account) happens on Keycloak's themed pages via application-initiated actions
 * ({@code /oauth2/authorization/keycloak?action=...}); this controller lists state and ends sessions.
 */
@RestController
@RequestMapping(path = "/api/{version}/account", version = "1")
class AccountController {

    private final IdentityDirectory directory;
    private final SessionRevocation revocation;
    private final IdentityProperties identity;

    AccountController(IdentityDirectory directory, SessionRevocation revocation, IdentityProperties identity) {
        this.directory = directory;
        this.revocation = revocation;
        this.identity = identity;
    }

    record SessionView(String id, @Nullable String ipAddress, Instant startedAt, Instant lastAccessAt,
            boolean rememberMe, boolean current) {
    }

    record CredentialView(String id, String type, @Nullable String label, @Nullable Instant createdAt) {
    }

    record SecurityOverview(
            boolean hasPassword,
            boolean totpEnabled,
            int passkeys,
            int securityKeys,
            boolean recoveryCodes,
            List<CredentialView> credentials,
            List<IdentityDirectory.LinkedProvider> linkedProviders,
            List<String> linkableProviders) {
    }

    @GetMapping("/sessions")
    List<SessionView> sessions(CurrentUser user) {
        return directory.sessions(user.id()).stream()
                .map(s -> new SessionView(s.id(), s.ipAddress(), s.startedAt(), s.lastAccessAt(), s.rememberMe(),
                        s.id().equals(user.sessionId())))
                .sorted(Comparator.comparing(SessionView::current).reversed()
                        .thenComparing(SessionView::lastAccessAt, Comparator.reverseOrder()))
                .toList();
    }

    @DeleteMapping("/sessions/{sessionId}")
    ResponseEntity<Void> endSession(CurrentUser user, @PathVariable String sessionId) {
        if (!directory.endSession(user.id(), sessionId)) {
            throw new SessionNotFound();
        }
        revocation.revokeSession(sessionId);
        return ResponseEntity.noContent().build();
    }

    /** Signs out every other device; this browser stays signed in. */
    @PostMapping("/sessions/sign-out-others")
    ResponseEntity<Void> signOutOthers(CurrentUser user) {
        directory.sessions(user.id()).stream()
                .filter(s -> !s.id().equals(user.sessionId()))
                .forEach(s -> {
                    directory.endSession(user.id(), s.id());
                    revocation.revokeSession(s.id());
                });
        return ResponseEntity.noContent().build();
    }

    /** Signs out everywhere, including this browser. */
    @PostMapping("/sessions/sign-out-all")
    ResponseEntity<Void> signOutAll(CurrentUser user) {
        directory.endAllSessions(user.id());
        revocation.revokeUser(user.id(), Instant.now());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/security")
    SecurityOverview security(CurrentUser user) {
        var credentials = directory.credentials(user.id());
        var linked = directory.linkedProviders(user.id());
        var linkedAliases = linked.stream().map(IdentityDirectory.LinkedProvider::alias).toList();
        var linkable = identity.googleLoginEnabled() && !linkedAliases.contains("google") ? List.of("google") : List.<String>of();
        return new SecurityOverview(
                hasType(credentials, "password"),
                hasType(credentials, "otp"),
                count(credentials, "webauthn-passwordless"),
                count(credentials, "webauthn"),
                hasType(credentials, "recovery-authn-codes"),
                credentials.stream()
                        .filter(c -> !Set.of("password").contains(c.type()))
                        .map(c -> new CredentialView(c.id(), c.type(), c.label(), c.createdAt()))
                        .toList(),
                linked,
                linkable);
    }

    @DeleteMapping("/linked-providers/{alias}")
    ResponseEntity<Void> unlink(CurrentUser user, @PathVariable String alias) {
        var hasPassword = hasType(directory.credentials(user.id()), "password");
        var linked = directory.linkedProviders(user.id());
        if (linked.stream().noneMatch(p -> p.alias().equals(alias))) {
            throw new ProviderNotLinked();
        }
        // Never strand an account without any way to sign in.
        if (!hasPassword && linked.size() == 1) {
            throw new LastSignInMethod();
        }
        directory.unlinkProvider(user.id(), alias);
        return ResponseEntity.noContent().build();
    }

    private static boolean hasType(List<IdentityDirectory.IdentityCredential> credentials, String type) {
        return credentials.stream().anyMatch(c -> c.type().equals(type));
    }

    private static int count(List<IdentityDirectory.IdentityCredential> credentials, String type) {
        return (int) credentials.stream().filter(c -> c.type().equals(type)).count();
    }

    static final class SessionNotFound extends DomainException {
        SessionNotFound() {
            super(HttpStatus.NOT_FOUND, "session-not-found", "Session not found", "That session no longer exists.");
        }
    }

    static final class ProviderNotLinked extends DomainException {
        ProviderNotLinked() {
            super(HttpStatus.NOT_FOUND, "provider-not-linked", "Not linked", "That provider isn't linked to your account.");
        }
    }

    static final class LastSignInMethod extends DomainException {
        LastSignInMethod() {
            super(HttpStatus.CONFLICT, "last-sign-in-method", "Can't unlink",
                    "Set a password first. Otherwise you'd have no way to sign in.");
        }
    }
}
