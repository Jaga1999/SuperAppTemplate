package com.superapp.activity.internal;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface ActivityRepository extends JpaRepository<ActivityEntry, UUID> {

    List<ActivityEntry> findByOwnerIdOrderByOccurredAtDesc(UUID ownerId, Limit limit);

    @Modifying
    @Query("delete from ActivityEntry a where a.ownerId = :owner")
    int deleteAllOwnedBy(@Param("owner") UUID owner);
}
