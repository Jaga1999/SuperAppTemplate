package com.superapp.user.internal;

import java.time.Instant;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import com.superapp.auth.UserSignedIn;
import com.superapp.identity.IdentityDirectory;
import com.superapp.identity.IdentityDirectory.IdentityUser;
import com.superapp.identity.IdentityEvent;
import com.superapp.identity.IdentityEvent.UserDeleted;
import com.superapp.identity.IdentityEvent.UserDisabled;
import com.superapp.identity.IdentityEvent.UserProfileChanged;
import com.superapp.identity.IdentityEvent.UserRegistered;

/**
 * Keeps {@code app_user} in sync with Keycloak, the source of truth for identity:
 * <ul>
 *   <li>just-in-time on every login (verified ID-token claims),</li>
 *   <li>from Keycloak's event stream for changes outside a login (admin create/edit, profile edits, disable, delete),</li>
 *   <li>and nightly by {@link UserReconciliation}, which repairs anything a lost event left behind.</li>
 * </ul>
 * Keycloak is queried outside any transaction; each write is its own short transaction.
 */
@Component
class UserProjection {

    private static final Logger log = LoggerFactory.getLogger(UserProjection.class);

    private final AppUserRepository users;
    private final IdentityDirectory directory;
    private final TransactionTemplate tx;

    UserProjection(AppUserRepository users, IdentityDirectory directory, TransactionTemplate tx) {
        this.users = users;
        this.directory = directory;
        this.tx = tx;
    }

    @EventListener
    void on(UserSignedIn e) {
        tx.executeWithoutResult(_ -> users.upsert(e.userId(), e.email(), e.emailVerified(), e.displayName(),
                e.givenName(), e.familyName(), e.pictureUrl(), Instant.now(), e.signedInAt()));
    }

    @EventListener
    void on(IdentityEvent event) {
        switch (event) {
            case UserRegistered(var id, var email) -> tx.executeWithoutResult(_ ->
                    users.upsert(id, email, false, null, null, null, null, Instant.now(), null));
            case UserProfileChanged(var id) -> directory.findUser(id).ifPresent(this::sync);
            case UserDisabled(var id) -> tx.executeWithoutResult(_ -> users.findById(id).ifPresent(AppUser::disable));
            case UserDeleted(var id) -> erase(id);
        }
    }

    /** Copies Keycloak's current view of a user into the projection (creates the row if missing). */
    void sync(IdentityUser u) {
        tx.executeWithoutResult(_ -> users.findById(u.id()).ifPresentOrElse(
                local -> {
                    local.updateProfile(u.email(), u.emailVerified(), u.firstName(), u.lastName(), fullName(u));
                    if (u.enabled()) {
                        local.enable();
                    } else {
                        local.disable();
                    }
                },
                () -> users.upsert(u.id(), u.email(), u.emailVerified(), fullName(u), u.firstName(), u.lastName(), null,
                        Instant.now(), null)));
    }

    /** Right to erasure: the account is gone from Keycloak, so its personal data goes from here too. */
    void erase(UUID id) {
        tx.executeWithoutResult(_ -> users.findById(id).ifPresent(u -> {
            u.erase();
            log.info("Erased personal data of deleted user {}", id);
        }));
    }

    private static String fullName(IdentityUser u) {
        var name = ((u.firstName() != null ? u.firstName() : "") + " " + (u.lastName() != null ? u.lastName() : "")).trim();
        return name.isEmpty() && u.email() != null ? u.email() : name;
    }
}
