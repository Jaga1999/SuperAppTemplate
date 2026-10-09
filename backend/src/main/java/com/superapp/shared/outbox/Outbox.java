package com.superapp.shared.outbox;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import tools.jackson.databind.json.JsonMapper;

/**
 * Transactional outbox. Call it inside the same transaction that changes your data; the event row commits
 * (or rolls back) atomically with the business change. {@link OutboxRelay} ships rows to Kafka afterwards,
 * so a Kafka outage never loses events and never fails a user request.
 */
@Component
public class Outbox {

    private final JdbcClient jdbc;
    private final JsonMapper json;

    public Outbox(JdbcClient jdbc, JsonMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    /**
     * @param topic   Kafka topic
     * @param key     Kafka record key (ordering scope, e.g. the owning user id)
     * @param payload serialized as JSON; include a discriminator (e.g. {@code type}) so consumers can route it
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void publish(String topic, String key, Object payload) {
        jdbc.sql("""
                insert into outbox_event (id, topic, message_key, event_type, payload, created_at)
                values (:id, :topic, :key, :type, cast(:payload as jsonb), :createdAt)
                """)
                .param("id", UUID.randomUUID())
                .param("topic", topic)
                .param("key", key)
                .param("type", payload.getClass().getSimpleName())
                .param("payload", json.writeValueAsString(payload))
                .param("createdAt", Timestamp.from(Instant.now()))
                .update();
    }
}
