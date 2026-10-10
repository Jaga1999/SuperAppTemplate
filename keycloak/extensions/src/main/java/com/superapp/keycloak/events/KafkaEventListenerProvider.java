package com.superapp.keycloak.events;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.apache.kafka.clients.producer.Producer;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.jboss.logging.Logger;
import org.keycloak.events.Event;
import org.keycloak.events.EventListenerProvider;
import org.keycloak.events.admin.AdminEvent;
import org.keycloak.models.AbstractKeycloakTransaction;
import org.keycloak.models.KeycloakSession;
import org.keycloak.util.JsonSerialization;

/**
 * Publishes Keycloak user and admin events to Kafka <b>after</b> the Keycloak transaction commits,
 * so consumers never observe changes that were rolled back.
 * Record key = user id → per-user ordering on a partition.
 *
 * <p>Messages are built when the event is recorded, <i>inside</i> the transaction (the realm lookup needs it; after
 * commit the realm cache can't load from the database). The after-commit step only sends, and never throws: a Kafka
 * problem must not turn a successful login or admin operation into an error.
 */
final class KafkaEventListenerProvider implements EventListenerProvider {

    private static final Logger LOG = Logger.getLogger(KafkaEventListenerProvider.class);

    private final KeycloakSession session;
    private final Producer<String, String> producer;
    private final String topic;
    private final List<Pending> pending = new ArrayList<>();

    private record Pending(String key, IdentityEventMessage message) {
    }

    private final AbstractKeycloakTransaction afterCommit = new AbstractKeycloakTransaction() {
        @Override
        protected void commitImpl() {
            pending.forEach(p -> send(p.key(), p.message()));
            pending.clear();
        }

        @Override
        protected void rollbackImpl() {
            pending.clear();
        }
    };

    KafkaEventListenerProvider(KeycloakSession session, Producer<String, String> producer, String topic) {
        this.session = session;
        this.producer = producer;
        this.topic = topic;
        session.getTransactionManager().enlistAfterCompletion(afterCommit);
    }

    @Override
    public void onEvent(Event event) {
        try {
            pending.add(new Pending(event.getUserId(), userMessage(event)));
        } catch (RuntimeException e) {
            LOG.errorf(e, "Could not convert user event %s; not published", event.getType());
        }
    }

    @Override
    public void onEvent(AdminEvent event, boolean includeRepresentation) {
        try {
            var message = adminMessage(event, includeRepresentation);
            pending.add(new Pending(message.userId(), message));
        } catch (RuntimeException e) {
            LOG.errorf(e, "Could not convert admin event %s; not published", event.getOperationType());
        }
    }

    @Override
    public void close() {
        // Producer lifecycle is owned by the factory.
    }

    private IdentityEventMessage userMessage(Event event) {
        return new IdentityEventMessage(
                event.getId() != null ? event.getId() : UUID.randomUUID().toString(),
                "USER",
                event.getType().name(),
                realmName(event.getRealmId()),
                event.getClientId(),
                event.getUserId(),
                event.getSessionId(),
                event.getIpAddress(),
                event.getError(),
                null,
                null,
                null,
                event.getDetails() != null ? Map.copyOf(event.getDetails()) : Map.of(),
                event.getTime());
    }

    private IdentityEventMessage adminMessage(AdminEvent event, boolean includeRepresentation) {
        var auth = event.getAuthDetails();
        var userId = userIdFromPath(event.getResourcePath());
        return new IdentityEventMessage(
                event.getId() != null ? event.getId() : UUID.randomUUID().toString(),
                "ADMIN",
                event.getOperationType().name(),
                realmName(event.getRealmId()),
                auth != null ? auth.getClientId() : null,
                userId,
                null,
                auth != null ? auth.getIpAddress() : null,
                event.getError(),
                event.getResourceTypeAsString(),
                event.getResourcePath(),
                includeRepresentation ? event.getRepresentation() : null,
                event.getDetails() != null ? Map.copyOf(event.getDetails()) : Map.of(),
                event.getTime());
    }

    /** Called while the request's transaction is active; prefers the realm already in the session context. */
    private String realmName(String realmId) {
        var current = session.getContext().getRealm();
        if (current != null && current.getId().equals(realmId)) {
            return current.getName();
        }
        var realm = session.realms().getRealm(realmId);
        return realm != null ? realm.getName() : realmId;
    }

    private void send(String key, IdentityEventMessage message) {
        try {
            var json = JsonSerialization.writeValueAsString(message);
            producer.send(new ProducerRecord<>(topic, key, json), (_, error) -> {
                if (error != null) {
                    LOG.errorf(error, "Failed to publish %s/%s event %s", message.kind(), message.type(), message.id());
                }
            });
        } catch (IOException | RuntimeException e) {
            // Never break authentication because the event bus is unavailable.
            LOG.errorf(e, "Kafka unavailable; dropped %s/%s event %s", message.kind(), message.type(), message.id());
        }
    }

    /** {@code users/<id>} or {@code users/<id>/...} → {@code <id>}; otherwise {@code null}. */
    private static String userIdFromPath(String resourcePath) {
        if (resourcePath == null || !resourcePath.startsWith("users/")) {
            return null;
        }
        var rest = resourcePath.substring("users/".length());
        var slash = rest.indexOf('/');
        return slash < 0 ? rest : rest.substring(0, slash);
    }
}
