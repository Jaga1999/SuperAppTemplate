package com.superapp.keycloak.events;

import java.util.Map;

/**
 * Wire contract published to the {@code keycloak.events} topic.
 * Mirrored by {@code com.superapp.identity.events.IdentityEventMessage} in the backend; keep both in sync.
 *
 * @param kind           {@code USER} for end-user events, {@code ADMIN} for admin events
 * @param type           user event type (e.g. {@code LOGIN}) or admin operation (e.g. {@code UPDATE})
 * @param resourceType   admin events only (e.g. {@code USER}, {@code USER_SESSION})
 * @param resourcePath   admin events only (e.g. {@code users/<id>})
 * @param representation admin events only: JSON of the changed resource when details are enabled
 */
public record IdentityEventMessage(
        String id,
        String kind,
        String type,
        String realmName,
        String clientId,
        String userId,
        String sessionId,
        String ipAddress,
        String error,
        String resourceType,
        String resourcePath,
        String representation,
        Map<String, String> details,
        long time) {
}
