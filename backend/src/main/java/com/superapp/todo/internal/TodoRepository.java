package com.superapp.todo.internal;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface TodoRepository extends JpaRepository<Todo, UUID> {

    /** Open first, then most important, then soonest due, then newest. Every query is scoped to the owner. */
    @Query(value = """
            select t from Todo t
            where t.ownerId = :owner
              and (:status = 'all' or (:status = 'open' and t.completed = false) or (:status = 'done' and t.completed = true))
              and (:pattern = '' or lower(t.title) like :pattern escape '\\')
            order by t.completed asc, t.priority desc, t.dueDate asc nulls last, t.createdAt desc
            """,
            countQuery = """
            select count(t) from Todo t
            where t.ownerId = :owner
              and (:status = 'all' or (:status = 'open' and t.completed = false) or (:status = 'done' and t.completed = true))
              and (:pattern = '' or lower(t.title) like :pattern escape '\\')
            """)
    Page<Todo> search(@Param("owner") UUID owner, @Param("status") String status, @Param("pattern") String pattern,
            Pageable pageable);

    Optional<Todo> findByIdAndOwnerId(UUID id, UUID ownerId);

    long countByOwnerIdAndCompletedFalse(UUID ownerId);

    long countByOwnerIdAndCompletedTrue(UUID ownerId);

    long countByOwnerId(UUID ownerId);

    @Query("select count(t) from Todo t where t.ownerId = :owner and t.completed = false and t.dueDate < :today")
    long countOverdue(@Param("owner") UUID owner, @Param("today") LocalDate today);

    List<Todo> findByOwnerIdAndCompletedTrue(UUID ownerId);

    @Modifying
    @Query("delete from Todo t where t.ownerId = :owner")
    int deleteAllOwnedBy(@Param("owner") UUID owner);

    long countByCompletedTrue();

    @Query("select count(t) from Todo t where t.completed = false and t.dueDate < :today")
    long countAllOverdue(@Param("today") LocalDate today);

    @Query("select t.ownerId, count(t) from Todo t where t.ownerId in :owners group by t.ownerId")
    List<Object[]> countGroupedByOwner(@Param("owners") Collection<UUID> owners);
}
