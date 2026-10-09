package com.superapp.identity.internal;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import org.springframework.resilience.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;

import com.superapp.identity.IdentityDirectory;

@Service
@Retryable(includes = ResourceAccessException.class, maxRetries = 2, delay = 200, multiplier = 2)
class KeycloakIdentityDirectory implements IdentityDirectory {

    private final KeycloakAdminApi admin;

    KeycloakIdentityDirectory(KeycloakAdminApi admin) {
        this.admin = admin;
    }

    @Override
    public Optional<IdentityUser> findUser(UUID userId) {
        try {
            var u = admin.user(userId);
            return Optional.of(new IdentityUser(UUID.fromString(u.id()), u.email(), u.isEmailVerified(), u.firstName(),
                    u.lastName(), u.isEnabled(), u.createdTimestamp() != null ? Instant.ofEpochMilli(u.createdTimestamp()) : null));
        } catch (HttpClientErrorException.NotFound _) {
            return Optional.empty();
        }
    }

    @Override
    public List<IdentitySession> sessions(UUID userId) {
        return admin.sessions(userId).stream()
                .map(s -> new IdentitySession(s.id(), s.ipAddress(), Instant.ofEpochMilli(s.start()),
                        Instant.ofEpochMilli(s.lastAccess()), s.rememberMe(),
                        s.clients() != null ? Set.copyOf(s.clients().values()) : Set.of()))
                .toList();
    }

    @Override
    public boolean endSession(UUID userId, String sessionId) {
        var owned = admin.sessions(userId).stream().anyMatch(s -> s.id().equals(sessionId));
        if (owned) {
            admin.deleteSession(sessionId);
        }
        return owned;
    }

    @Override
    public void endAllSessions(UUID userId) {
        admin.logout(userId);
    }

    @Override
    public List<IdentityCredential> credentials(UUID userId) {
        return admin.credentials(userId).stream()
                .map(c -> new IdentityCredential(c.id(), c.type(), c.userLabel(),
                        c.createdDate() != null ? Instant.ofEpochMilli(c.createdDate()) : null))
                .toList();
    }

    @Override
    public List<LinkedProvider> linkedProviders(UUID userId) {
        return admin.federatedIdentities(userId).stream()
                .map(f -> new LinkedProvider(f.identityProvider(), f.userName()))
                .toList();
    }

    @Override
    public void unlinkProvider(UUID userId, String alias) {
        admin.unlink(userId, alias);
    }

    @Override
    public long countUsers() {
        return admin.countUsers();
    }
}
