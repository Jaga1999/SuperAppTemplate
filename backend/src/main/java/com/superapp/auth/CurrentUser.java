package com.superapp.auth;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.jspecify.annotations.Nullable;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * The authenticated caller, derived from the Keycloak access token validated by the BFF.
 * Declare it as a controller method parameter to receive it.
 *
 * @param id        Keycloak user id ({@code sub})
 * @param sessionId Keycloak SSO session id ({@code sid}); the unit of revocation
 */
public record CurrentUser(
        UUID id,
        String sessionId,
        @Nullable String email,
        @Nullable String name,
        Set<String> roles) {

    public static final String ROLE_USER = "user";
    public static final String ROLE_ADMIN = "admin";

    public boolean hasRole(String role) {
        return roles.contains(role);
    }

    public boolean isAdmin() {
        return hasRole(ROLE_ADMIN);
    }

    public static CurrentUser from(Jwt jwt) {
        return new CurrentUser(
                UUID.fromString(Objects.requireNonNull(jwt.getSubject(), "sub")),
                Objects.requireNonNullElse(jwt.getClaimAsString("sid"), ""),
                jwt.getClaimAsString("email"),
                jwt.getClaimAsString("name"),
                realmRoles(jwt));
    }

    /** Keycloak puts realm roles under {@code realm_access.roles}. */
    public static Set<String> realmRoles(Jwt jwt) {
        Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
        if (realmAccess == null || !(realmAccess.get("roles") instanceof Collection<?> roles)) {
            return Set.of();
        }
        return roles.stream().map(String::valueOf).collect(Collectors.toUnmodifiableSet());
    }

    public List<String> sortedRoles() {
        return roles.stream().sorted().toList();
    }
}
