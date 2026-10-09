package com.superapp.todo.internal;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import org.hibernate.annotations.UuidGenerator;
import org.jspecify.annotations.Nullable;

@Entity
@Table(name = "todo")
class Todo {

    /** Time-ordered UUIDv7: index-friendly primary keys without a sequence. */
    @Id
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    private @Nullable UUID id;

    @Column(nullable = false, updatable = false)
    private UUID ownerId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 2000)
    private @Nullable String notes;

    private boolean completed;
    private @Nullable Instant completedAt;

    @Column(nullable = false)
    private Priority priority = Priority.NONE;

    private @Nullable LocalDate dueDate;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    @Version
    private long version;

    protected Todo() {
        // JPA
        this.ownerId = new UUID(0, 0);
        this.title = "";
        this.createdAt = Instant.EPOCH;
        this.updatedAt = Instant.EPOCH;
    }

    Todo(UUID ownerId, String title, @Nullable String notes, Priority priority, @Nullable LocalDate dueDate) {
        this.ownerId = ownerId;
        this.title = title;
        this.notes = notes;
        this.priority = priority;
        this.dueDate = dueDate;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    void rename(String title) {
        this.title = title;
        touch();
    }

    void describe(@Nullable String notes) {
        this.notes = notes;
        touch();
    }

    void prioritize(Priority priority) {
        this.priority = priority;
        touch();
    }

    void schedule(@Nullable LocalDate dueDate) {
        this.dueDate = dueDate;
        touch();
    }

    /** @return true if the state actually changed */
    boolean markCompleted(boolean done) {
        if (done == completed) {
            return false;
        }
        this.completed = done;
        this.completedAt = done ? Instant.now() : null;
        touch();
        return true;
    }

    boolean isOverdue(LocalDate today) {
        return !completed && dueDate != null && dueDate.isBefore(today);
    }

    private void touch() {
        this.updatedAt = Instant.now();
    }

    UUID id() {
        if (id == null) {
            throw new IllegalStateException("Todo not persisted yet");
        }
        return id;
    }

    UUID ownerId() {
        return ownerId;
    }

    String title() {
        return title;
    }

    @Nullable String notes() {
        return notes;
    }

    boolean completed() {
        return completed;
    }

    @Nullable Instant completedAt() {
        return completedAt;
    }

    Priority priority() {
        return priority;
    }

    @Nullable LocalDate dueDate() {
        return dueDate;
    }

    Instant createdAt() {
        return createdAt;
    }

    Instant updatedAt() {
        return updatedAt;
    }

    long version() {
        return version;
    }
}
