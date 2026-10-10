package com.superapp.identity.internal;

import java.util.Map;

import org.jspecify.annotations.Nullable;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * The fields of the {@code keycloak.events} wire contract this consumer reads. Produced by the Keycloak SPI in
 * {@code keycloak/extensions} ({@code com.superapp.keycloak.events.IdentityEventMessage}), which
 * sends more; unknown fields are ignored. Keep the names in sync.
 */
record IdentityEventMessage(
        @JsonProperty(required = true) String kind,
        @JsonProperty(required = true) String type,
        @JsonProperty(required = true) String realmName,
        @Nullable String userId,
        @Nullable String sessionId,
        @Nullable String resourceType,
        @Nullable String resourcePath,
        @Nullable String representation,
        @Nullable Map<String, String> details) {

    boolean isUserEvent() {
        return "USER".equals(kind);
    }

    boolean isAdminEvent() {
        return "ADMIN".equals(kind);
    }

    String detail(String key) {
        return details != null && details.get(key) != null ? details.get(key) : "";
    }
}
