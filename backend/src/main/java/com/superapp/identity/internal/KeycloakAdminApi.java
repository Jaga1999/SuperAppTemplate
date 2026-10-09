package com.superapp.identity.internal;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.jspecify.annotations.Nullable;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.service.annotation.DeleteExchange;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;
import org.springframework.web.service.annotation.PostExchange;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Declarative HTTP client (Spring Framework 7 HTTP service registry) for the subset of the Keycloak Admin REST API
 * the BFF uses. Base URL: {@code <internal>/admin/realms/<realm>}; authenticated with the service account.
 */
@HttpExchange(accept = "application/json")
interface KeycloakAdminApi {

    /**
     * Records mirror Keycloak's representation types: where Keycloak uses a {@code Boolean}/{@code Long} object
     * (omitted from JSON when null) we use a nullable wrapper; primitives only where Keycloak always sends them.
     */
    record UserRepresentation(@JsonProperty(required = true) String id, @Nullable String username,
            @Nullable String email, @Nullable Boolean emailVerified, @Nullable String firstName,
            @Nullable String lastName, @Nullable Boolean enabled, @Nullable Long createdTimestamp) {

        boolean isEmailVerified() {
            return Boolean.TRUE.equals(emailVerified);
        }

        boolean isEnabled() {
            return Boolean.TRUE.equals(enabled);
        }
    }

    record UserSessionRepresentation(@JsonProperty(required = true) String id, @Nullable String userId, @Nullable String ipAddress, long start,
            long lastAccess, boolean rememberMe, @Nullable Map<String, String> clients) {
    }

    record CredentialRepresentation(@JsonProperty(required = true) String id, @JsonProperty(required = true) String type, @Nullable String userLabel, @Nullable Long createdDate) {
    }

    record FederatedIdentityRepresentation(@JsonProperty(required = true) String identityProvider, @Nullable String userId, @Nullable String userName) {
    }

    @GetExchange("/users/{id}")
    UserRepresentation user(@PathVariable UUID id);

    @GetExchange("/users/{id}/sessions")
    List<UserSessionRepresentation> sessions(@PathVariable UUID id);

    @DeleteExchange("/sessions/{sessionId}")
    void deleteSession(@PathVariable String sessionId);

    @PostExchange("/users/{id}/logout")
    void logout(@PathVariable UUID id);

    @GetExchange("/users/{id}/credentials")
    List<CredentialRepresentation> credentials(@PathVariable UUID id);

    @GetExchange("/users/{id}/federated-identity")
    List<FederatedIdentityRepresentation> federatedIdentities(@PathVariable UUID id);

    @DeleteExchange("/users/{id}/federated-identity/{provider}")
    void unlink(@PathVariable UUID id, @PathVariable String provider);

    @GetExchange("/users/count")
    long countUsers();
}
