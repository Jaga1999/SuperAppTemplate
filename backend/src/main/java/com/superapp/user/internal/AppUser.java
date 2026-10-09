package com.superapp.user.internal;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import org.jspecify.annotations.Nullable;

/** A user as the product knows it. {@code id} is the Keycloak user id ({@code sub}); never generated here. */
@Entity
@Table(name = "app_user")
class AppUser {

    enum Status { ACTIVE, DISABLED, DELETED }

    @Id
    private UUID id;

    private @Nullable String email;
    private boolean emailVerified;
    private @Nullable String displayName;
    private @Nullable String givenName;
    private @Nullable String familyName;
    private @Nullable String pictureUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.ACTIVE;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;
    @Column(nullable = false)
    private Instant updatedAt;
    private @Nullable Instant lastLoginAt;
    private @Nullable Instant deletedAt;

    @Version
    private long version;

    protected AppUser() {
        // JPA
        this.id = new UUID(0, 0);
        this.createdAt = Instant.EPOCH;
        this.updatedAt = Instant.EPOCH;
    }

    void updateProfile(@Nullable String email, boolean emailVerified, @Nullable String givenName,
            @Nullable String familyName, @Nullable String displayName) {
        this.email = email;
        this.emailVerified = emailVerified;
        this.givenName = givenName;
        this.familyName = familyName;
        this.displayName = displayName;
        this.updatedAt = Instant.now();
    }

    void disable() {
        this.status = Status.DISABLED;
        this.updatedAt = Instant.now();
    }

    void enable() {
        if (status == Status.DISABLED) {
            this.status = Status.ACTIVE;
            this.updatedAt = Instant.now();
        }
    }

    /** Right to erasure: keep the row (for referential integrity of audit data) but drop all personal data. */
    void erase() {
        this.status = Status.DELETED;
        this.email = null;
        this.displayName = null;
        this.givenName = null;
        this.familyName = null;
        this.pictureUrl = null;
        this.emailVerified = false;
        this.deletedAt = Instant.now();
        this.updatedAt = this.deletedAt;
    }

    UUID id() {
        return id;
    }

    @Nullable String email() {
        return email;
    }

    boolean emailVerified() {
        return emailVerified;
    }

    @Nullable String displayName() {
        return displayName;
    }

    @Nullable String givenName() {
        return givenName;
    }

    @Nullable String familyName() {
        return familyName;
    }

    @Nullable String pictureUrl() {
        return pictureUrl;
    }

    Status status() {
        return status;
    }

    Instant createdAt() {
        return createdAt;
    }

    @Nullable Instant lastLoginAt() {
        return lastLoginAt;
    }
}
