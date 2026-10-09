package com.superapp.todo.internal;

import java.time.Clock;
import java.time.LocalDate;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.superapp.todo.TodoMetrics;

@Service
@Transactional(readOnly = true)
class JpaTodoMetrics implements TodoMetrics {

    private final TodoRepository todos;
    private final Clock clock;

    JpaTodoMetrics(TodoRepository todos, Clock clock) {
        this.todos = todos;
        this.clock = clock;
    }

    @Override
    public Totals totals() {
        return new Totals(todos.count(), todos.countByCompletedTrue(), todos.countAllOverdue(LocalDate.now(clock)));
    }

    @Override
    public Map<UUID, Long> countsByOwner(Collection<UUID> ownerIds) {
        var counts = new HashMap<UUID, Long>();
        if (ownerIds.isEmpty()) {
            return counts;
        }
        for (var row : todos.countGroupedByOwner(ownerIds)) {
            counts.put((UUID) row[0], (Long) row[1]);
        }
        return counts;
    }
}
