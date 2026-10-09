package com.superapp.todo;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;

/** Aggregate numbers for dashboards (admin). */
public interface TodoMetrics {

    record Totals(long todos, long completed, long overdue) {
    }

    Totals totals();

    Map<UUID, Long> countsByOwner(Collection<UUID> ownerIds);
}
