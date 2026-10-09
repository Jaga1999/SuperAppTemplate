package com.superapp.activity.internal;

import java.time.Instant;
import java.util.UUID;

import org.jspecify.annotations.Nullable;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Consumer-side view of the {@code superapp.todo.events} JSON (produced from {@code com.superapp.todo.TodoEvent}).
 * Deliberately its own type, not the producer's: it reads only the fields the activity feed needs, so producer
 * and consumer evolve independently. Unknown fields are ignored; a missing required field is a poison message.
 */
record TodoEventMessage(
        @JsonProperty(required = true) UUID eventId,
        @JsonProperty(required = true) String type,
        @JsonProperty(required = true) UUID ownerId,
        @Nullable UUID todoId,
        @Nullable String title,
        @Nullable Integer count,
        @JsonProperty(required = true) Instant occurredAt) {
}
