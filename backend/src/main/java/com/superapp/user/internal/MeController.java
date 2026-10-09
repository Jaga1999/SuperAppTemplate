package com.superapp.user.internal;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.jspecify.annotations.Nullable;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.superapp.auth.CurrentUser;

/** The signed-in user, as the SPA needs it. The SPA's single source of "am I signed in?". */
@RestController
@RequestMapping(path = "/api/{version}/me", version = "1")
class MeController {

    private final AppUserRepository users;

    MeController(AppUserRepository users) {
        this.users = users;
    }

    record Me(
            UUID id,
            @Nullable String email,
            boolean emailVerified,
            @Nullable String displayName,
            @Nullable String givenName,
            @Nullable String familyName,
            @Nullable String pictureUrl,
            List<String> roles,
            boolean premium,
            boolean admin,
            String sessionId,
            @Nullable Instant memberSince) {
    }

    @GetMapping
    @Transactional(readOnly = true)
    Me me(CurrentUser user) {
        var local = users.findById(user.id());
        return new Me(
                user.id(),
                local.map(AppUser::email).orElse(user.email()),
                local.map(AppUser::emailVerified).orElse(false),
                local.map(AppUser::displayName).orElse(user.name()),
                local.map(AppUser::givenName).orElse(null),
                local.map(AppUser::familyName).orElse(null),
                local.map(AppUser::pictureUrl).orElse(null),
                user.sortedRoles(),
                user.isPremium(),
                user.isAdmin(),
                user.sessionId(),
                local.map(AppUser::createdAt).orElse(null));
    }
}
