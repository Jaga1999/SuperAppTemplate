package com.superapp.user.internal;

import java.time.Instant;
import java.util.UUID;

import org.jspecify.annotations.Nullable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface AppUserRepository extends JpaRepository<AppUser, UUID> {

    /**
     * Race-free just-in-time provisioning: a REGISTER event and the login callback can arrive at the same moment.
     * Never resurrects an erased (DELETED) user.
     */
    @Modifying
    @Query(value = """
            insert into app_user (id, email, email_verified, display_name, given_name, family_name, picture_url,
                                  status, created_at, updated_at, last_login_at, version)
            values (:id, :email, :emailVerified, :displayName, :givenName, :familyName, :pictureUrl,
                    'ACTIVE', :now, :now, :lastLoginAt, 0)
            on conflict (id) do update set
                email          = coalesce(excluded.email, app_user.email),
                email_verified = excluded.email_verified or app_user.email_verified,
                display_name   = coalesce(excluded.display_name, app_user.display_name),
                given_name     = coalesce(excluded.given_name, app_user.given_name),
                family_name    = coalesce(excluded.family_name, app_user.family_name),
                picture_url    = coalesce(excluded.picture_url, app_user.picture_url),
                last_login_at  = coalesce(excluded.last_login_at, app_user.last_login_at),
                updated_at     = excluded.updated_at,
                version        = app_user.version + 1
            where app_user.status <> 'DELETED'
            """, nativeQuery = true)
    void upsert(@Param("id") UUID id, @Param("email") @Nullable String email,
            @Param("emailVerified") boolean emailVerified, @Param("displayName") @Nullable String displayName,
            @Param("givenName") @Nullable String givenName, @Param("familyName") @Nullable String familyName,
            @Param("pictureUrl") @Nullable String pictureUrl, @Param("now") Instant now,
            @Param("lastLoginAt") @Nullable Instant lastLoginAt);

    long countByStatus(AppUser.Status status);

    long countByCreatedAtAfter(Instant since);
}
