package com.superapp.user.internal;

import java.time.Instant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.superapp.auth.UserSignedIn;
import com.superapp.identity.IdentityDirectory;
import com.superapp.identity.IdentityEvent;
import com.superapp.identity.IdentityEvent.UserDeleted;
import com.superapp.identity.IdentityEvent.UserDisabled;
import com.superapp.identity.IdentityEvent.UserProfileChanged;
import com.superapp.identity.IdentityEvent.UserRegistered;

/**
 * Keeps {@code app_user} in sync with Keycloak:
 * <ul>
 *   <li>just-in-time on every login (verified ID-token claims), and</li>
 *   <li>from Keycloak's event stream for changes that happen outside a login (profile edits, disable, delete).</li>
 * </ul>
 */
@Component
class UserProjection {

    private static final Logger log = LoggerFactory.getLogger(UserProjection.class);

    private final AppUserRepository users;
    private final IdentityDirectory directory;

    UserProjection(AppUserRepository users, IdentityDirectory directory) {
        this.users = users;
        this.directory = directory;
    }

    @EventListener
    @Transactional
    void on(UserSignedIn e) {
        users.upsert(e.userId(), e.email(), e.emailVerified(), e.displayName(), e.givenName(), e.familyName(),
                e.pictureUrl(), Instant.now(), e.signedInAt());
    }

    @EventListener
    @Transactional
    void on(IdentityEvent event) {
        switch (event) {
            case UserRegistered(var id, var email) ->
                    users.upsert(id, email, false, null, null, null, null, Instant.now(), null);
            case UserProfileChanged(var id) -> directory.findUser(id).ifPresent(u -> users.findById(id).ifPresentOrElse(
                    local -> {
                        local.updateProfile(u.email(), u.emailVerified(), u.firstName(), u.lastName(), fullName(u));
                        if (u.enabled()) {
                            local.enable();
                        }
                    },
                    () -> users.upsert(id, u.email(), u.emailVerified(), fullName(u), u.firstName(), u.lastName(), null,
                            Instant.now(), null)));
            case UserDisabled(var id) -> users.findById(id).ifPresent(AppUser::disable);
            case UserDeleted(var id) -> users.findById(id).ifPresent(u -> {
                u.erase();
                log.info("Erased personal data of deleted user {}", id);
            });
        }
    }

    private static String fullName(IdentityDirectory.IdentityUser u) {
        var name = ((u.firstName() != null ? u.firstName() : "") + " " + (u.lastName() != null ? u.lastName() : "")).trim();
        return name.isEmpty() && u.email() != null ? u.email() : name;
    }
}
