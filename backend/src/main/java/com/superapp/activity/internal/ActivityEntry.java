package com.superapp.activity.internal;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import org.jspecify.annotations.Nullable;

@Entity
@Table(name = "activity_entry")
class ActivityEntry {

    /** The producer's {@code eventId}: the primary key makes consumption idempotent. */
    @Id
    private UUID eventId;

    @Column(nullable = false)
    private UUID ownerId;

    @Column(nullable = false, length = 64)
    private String type;

    private @Nullable UUID todoId;

    @Column(length = 200)
    private @Nullable String title;

    private @Nullable Integer count;

    @Column(nullable = false)
    private Instant occurredAt;

    protected ActivityEntry() {
        this.eventId = new UUID(0, 0);
        this.ownerId = new UUID(0, 0);
        this.type = "";
        this.occurredAt = Instant.EPOCH;
    }

    ActivityEntry(UUID eventId, UUID ownerId, String type, @Nullable UUID todoId, @Nullable String title,
            @Nullable Integer count, Instant occurredAt) {
        this.eventId = eventId;
        this.ownerId = ownerId;
        this.type = type;
        this.todoId = todoId;
        this.title = title;
        this.count = count;
        this.occurredAt = occurredAt;
    }

    UUID eventId() {
        return eventId;
    }

    String type() {
        return type;
    }

    @Nullable UUID todoId() {
        return todoId;
    }

    @Nullable String title() {
        return title;
    }

    @Nullable Integer count() {
        return count;
    }

    Instant occurredAt() {
        return occurredAt;
    }
}
