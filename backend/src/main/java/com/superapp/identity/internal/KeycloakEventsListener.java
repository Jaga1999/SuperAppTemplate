package com.superapp.identity.internal;

import java.time.Instant;
import java.util.UUID;
import java.util.function.Function;

import org.jspecify.annotations.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.superapp.auth.BffProperties;
import com.superapp.auth.SessionRevocation;
import com.superapp.identity.IdentityEvent;
import com.superapp.identity.IdentityEvent.UserDeleted;
import com.superapp.identity.IdentityEvent.UserDisabled;
import com.superapp.identity.IdentityEvent.UserProfileChanged;
import com.superapp.identity.IdentityEvent.UserRegistered;

import tools.jackson.databind.json.JsonMapper;

/**
 * Consumes Keycloak's user + admin events from Kafka and turns them into:
 * <ul>
 *   <li><b>instant revocation</b> (logout, session killed, user disabled/deleted, "sign out" by admin), and</li>
 *   <li>in-process {@link IdentityEvent}s for features that keep local data (e.g. the user projection).</li>
 * </ul>
 * Handlers are idempotent; redelivery is harmless. Reads from Keycloak's Kafka cluster, see {@link KeycloakEventsKafkaConfig}.
 */
@Component
class KeycloakEventsListener {

    private static final Logger log = LoggerFactory.getLogger(KeycloakEventsListener.class);

    private final JsonMapper json;
    private final SessionRevocation revocation;
    private final ApplicationEventPublisher events;
    private final String realm;

    KeycloakEventsListener(JsonMapper json, SessionRevocation revocation, ApplicationEventPublisher events,
            BffProperties properties) {
        this.json = json;
        this.revocation = revocation;
        this.events = events;
        this.realm = properties.keycloak().realm();
    }

    @KafkaListener(id = "identity-events", topics = "${superapp.kafka.topics.keycloak-events}", groupId = "superapp-identity",
            containerFactory = KeycloakEventsKafkaConfig.CONTAINER_FACTORY)
    @Transactional
    void on(String payload) {
        var message = json.readValue(payload, IdentityEventMessage.class);
        if (!realm.equals(message.realmName())) {
            return;
        }
        if (message.isUserEvent()) {
            onUserEvent(message);
        } else if (message.isAdminEvent()) {
            onAdminEvent(message);
        }
    }

    private void onUserEvent(IdentityEventMessage m) {
        var userId = parse(m.userId());
        switch (m.type()) {
            case "LOGOUT", "USER_SESSION_DELETED" -> {
                if (m.sessionId() != null) {
                    revocation.revokeSession(m.sessionId());
                }
            }
            case "REGISTER" -> publish(userId, id -> new UserRegistered(id, m.detail("email")));
            case "UPDATE_PROFILE", "UPDATE_EMAIL", "VERIFY_EMAIL" -> publish(userId, UserProfileChanged::new);
            case "DELETE_ACCOUNT" -> {
                revokeEverything(userId);
                publish(userId, UserDeleted::new);
            }
            case "USER_DISABLED_BY_PERMANENT_LOCKOUT" -> {
                revokeEverything(userId);
                publish(userId, UserDisabled::new);
            }
            default -> log.trace("Ignoring user event {}", m.type());
        }
    }

    private void onAdminEvent(IdentityEventMessage m) {
        var resource = m.resourceType() != null ? m.resourceType() : "";
        var path = m.resourcePath() != null ? m.resourcePath() : "";
        var userId = parse(m.userId());

        switch (resource + ":" + m.type()) {
            case "USER:DELETE" -> {
                revokeEverything(userId);
                publish(userId, UserDeleted::new);
            }
            case "USER:UPDATE" -> {
                if (isDisabled(m.representation())) {
                    revokeEverything(userId);
                    publish(userId, UserDisabled::new);
                } else {
                    publish(userId, UserProfileChanged::new);
                }
            }
            case "USER:ACTION" -> {
                if (path.endsWith("/logout")) {
                    revokeEverything(userId);
                }
            }
            case "USER_SESSION:DELETE" -> revocation.revokeSession(path.substring(path.lastIndexOf('/') + 1));
            default -> log.trace("Ignoring admin event {}:{}", resource, m.type());
        }
    }

    private boolean isDisabled(@Nullable String representation) {
        if (representation == null || representation.isBlank()) {
            return false;
        }
        var node = json.readTree(representation).get("enabled");
        return node != null && node.isBoolean() && !node.booleanValue();
    }

    private void revokeEverything(@Nullable UUID userId) {
        if (userId != null) {
            revocation.revokeUser(userId, Instant.now());
        }
    }

    private void publish(@Nullable UUID userId, Function<UUID, IdentityEvent> factory) {
        if (userId != null) {
            events.publishEvent(factory.apply(userId));
        }
    }

    private static @Nullable UUID parse(@Nullable String id) {
        try {
            return id != null ? UUID.fromString(id) : null;
        } catch (IllegalArgumentException _) {
            return null;
        }
    }
}
