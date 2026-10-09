package com.superapp.todo;

import java.time.Instant;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonTypeInfo;

/**
 * Integration events published to Kafka topic {@value #TOPIC} through the transactional outbox.
 * Record key = {@code ownerId} (per-user ordering). JSON carries a {@code type} discriminator
 * (the record's simple name) and a unique {@code eventId} for consumer de-duplication.
 */
@JsonTypeInfo(use = JsonTypeInfo.Id.SIMPLE_NAME, include = JsonTypeInfo.As.PROPERTY, property = "type")
public sealed interface TodoEvent {

    String TOPIC = "superapp.todo.events";

    UUID eventId();

    UUID ownerId();

    Instant occurredAt();

    record TodoCreated(UUID eventId, UUID ownerId, UUID todoId, String title, Instant occurredAt) implements TodoEvent {
    }

    record TodoCompleted(UUID eventId, UUID ownerId, UUID todoId, String title, Instant occurredAt) implements TodoEvent {
    }

    record TodoReopened(UUID eventId, UUID ownerId, UUID todoId, String title, Instant occurredAt) implements TodoEvent {
    }

    record TodoDeleted(UUID eventId, UUID ownerId, UUID todoId, String title, Instant occurredAt) implements TodoEvent {
    }

    record CompletedTodosCleared(UUID eventId, UUID ownerId, int count, Instant occurredAt) implements TodoEvent {
    }
}
