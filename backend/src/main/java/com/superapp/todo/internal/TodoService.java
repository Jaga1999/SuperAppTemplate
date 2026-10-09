package com.superapp.todo.internal;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Locale;
import java.util.UUID;

import org.jspecify.annotations.Nullable;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.superapp.auth.CurrentUser;
import com.superapp.shared.outbox.Outbox;
import com.superapp.todo.TodoEvent;
import com.superapp.todo.TodoEvent.CompletedTodosCleared;
import com.superapp.todo.TodoEvent.TodoCompleted;
import com.superapp.todo.TodoEvent.TodoCreated;
import com.superapp.todo.TodoEvent.TodoDeleted;
import com.superapp.todo.TodoEvent.TodoReopened;

/**
 * Todo use cases. Business rules live here, not in controllers:
 * <ul>
 *   <li>every read/write is scoped to the owner (data-level authorization; Keycloak only knows roles),</li>
 *   <li>free accounts: limited open todos, no priorities, no due dates (role {@code premium} lifts both),</li>
 *   <li>optimistic concurrency: updates must carry the version they were based on,</li>
 *   <li>every change emits an integration event atomically through the outbox.</li>
 * </ul>
 */
@Service
@Transactional
class TodoService {

    enum StatusFilter { ALL, OPEN, DONE }

    record NewTodo(String title, @Nullable String notes, @Nullable Priority priority, @Nullable LocalDate dueDate) {
    }

    /** Null fields mean "unchanged". {@code clearDueDate} distinguishes "remove due date" from "unchanged". */
    record TodoChanges(long version, @Nullable String title, @Nullable String notes, @Nullable Boolean completed,
            @Nullable Priority priority, @Nullable LocalDate dueDate, boolean clearDueDate) {
    }

    record Stats(long total, long open, long completed, long overdue, @Nullable Integer freeOpenLimit) {
    }

    private final TodoRepository todos;
    private final Outbox outbox;
    private final Clock clock;
    private final int freeOpenLimit;

    TodoService(TodoRepository todos, Outbox outbox, Clock clock,
            @Value("${superapp.todo.free-open-limit:25}") int freeOpenLimit) {
        this.todos = todos;
        this.outbox = outbox;
        this.clock = clock;
        this.freeOpenLimit = freeOpenLimit;
    }

    @Transactional(readOnly = true)
    Page<Todo> list(CurrentUser user, StatusFilter status, @Nullable String query, Pageable pageable) {
        return todos.search(user.id(), status.name().toLowerCase(Locale.ROOT), likePattern(query), pageable);
    }

    Todo create(CurrentUser user, NewTodo command) {
        var priority = command.priority() != null ? command.priority() : Priority.NONE;
        requirePremiumFor(user, priority, command.dueDate());
        if (!user.isPremium() && todos.countByOwnerIdAndCompletedFalse(user.id()) >= freeOpenLimit) {
            throw new TodoErrors.QuotaExceeded(freeOpenLimit);
        }
        var todo = todos.save(new Todo(user.id(), command.title().strip(), blankToNull(command.notes()), priority, command.dueDate()));
        emit(new TodoCreated(UUID.randomUUID(), user.id(), todo.id(), todo.title(), Instant.now(clock)));
        return todo;
    }

    Todo update(CurrentUser user, UUID id, TodoChanges changes) {
        var todo = owned(user, id);
        if (todo.version() != changes.version()) {
            throw new TodoErrors.StaleVersion();
        }
        requirePremiumFor(user, changes.priority(), changes.dueDate());

        if (changes.title() != null) {
            todo.rename(changes.title().strip());
        }
        if (changes.notes() != null) {
            todo.describe(blankToNull(changes.notes()));
        }
        if (changes.priority() != null) {
            todo.prioritize(changes.priority());
        }
        if (changes.clearDueDate()) {
            todo.schedule(null);
        } else if (changes.dueDate() != null) {
            todo.schedule(changes.dueDate());
        }
        if (changes.completed() != null) {
            if (!changes.completed() && !user.isPremium()
                    && todos.countByOwnerIdAndCompletedFalse(user.id()) >= freeOpenLimit) {
                throw new TodoErrors.QuotaExceeded(freeOpenLimit);
            }
            if (todo.markCompleted(changes.completed())) {
                var now = Instant.now(clock);
                emit(changes.completed()
                        ? new TodoCompleted(UUID.randomUUID(), user.id(), todo.id(), todo.title(), now)
                        : new TodoReopened(UUID.randomUUID(), user.id(), todo.id(), todo.title(), now));
            }
        }
        // Flush now so the incremented @Version is returned to the client in this response.
        return todos.saveAndFlush(todo);
    }

    void delete(CurrentUser user, UUID id) {
        var todo = owned(user, id);
        todos.delete(todo);
        emit(new TodoDeleted(UUID.randomUUID(), user.id(), todo.id(), todo.title(), Instant.now(clock)));
    }

    int clearCompleted(CurrentUser user) {
        var done = todos.findByOwnerIdAndCompletedTrue(user.id());
        todos.deleteAll(done);
        if (!done.isEmpty()) {
            emit(new CompletedTodosCleared(UUID.randomUUID(), user.id(), done.size(), Instant.now(clock)));
        }
        return done.size();
    }

    @Transactional(readOnly = true)
    Stats stats(CurrentUser user) {
        var total = todos.countByOwnerId(user.id());
        var completed = todos.countByOwnerIdAndCompletedTrue(user.id());
        return new Stats(total, total - completed, completed,
                todos.countOverdue(user.id(), LocalDate.now(clock)),
                user.isPremium() ? null : freeOpenLimit);
    }

    private Todo owned(CurrentUser user, UUID id) {
        return todos.findByIdAndOwnerId(id, user.id()).orElseThrow(TodoErrors.TodoNotFound::new);
    }

    private void requirePremiumFor(CurrentUser user, @Nullable Priority priority, @Nullable LocalDate dueDate) {
        if (user.isPremium()) {
            return;
        }
        if (priority != null && priority != Priority.NONE) {
            throw new TodoErrors.PremiumRequired("Setting priorities");
        }
        if (dueDate != null) {
            throw new TodoErrors.PremiumRequired("Due dates");
        }
    }

    private void emit(TodoEvent event) {
        outbox.publish(TodoEvent.TOPIC, event.ownerId().toString(), event);
    }

    /** User input becomes a literal LIKE pattern: wildcards are escaped. */
    private static String likePattern(@Nullable String query) {
        if (query == null || query.isBlank()) {
            return "";
        }
        var escaped = query.strip().toLowerCase(Locale.ROOT)
                .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
        return "%" + escaped + "%";
    }

    private static @Nullable String blankToNull(@Nullable String s) {
        return s == null || s.isBlank() ? null : s.strip();
    }
}
