package com.superapp.identity.internal;

import java.util.Map;

import org.jspecify.annotations.Nullable;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Wire contract of the {@code keycloak.events} topic, produced by the Keycloak SPI in
 * {@code keycloak/extensions/superapp-extensions} ({@code com.superapp.keycloak.events.IdentityEventMessage}).
 * Keep both in sync.
 */
record IdentityEventMessage(
        @JsonProperty(required = true) String id,
        @JsonProperty(required = true) String kind,
        @JsonProperty(required = true) String type,
        @JsonProperty(required = true) String realmName,
        @Nullable String clientId,
        @Nullable String userId,
        @Nullable String sessionId,
        @Nullable String ipAddress,
        @Nullable String error,
        @Nullable String resourceType,
        @Nullable String resourcePath,
        @Nullable String representation,
        @Nullable Map<String, String> details,
        long time) {

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
