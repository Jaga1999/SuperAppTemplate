package com.superapp.todo.internal;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.superapp.auth.CurrentUser;
import com.superapp.shared.outbox.Outbox;
import com.superapp.todo.TodoEvent;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TodoServiceTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-08T10:00:00Z"), ZoneOffset.UTC);
    private static final CurrentUser FREE = user("user");
    private static final CurrentUser PREMIUM = user("user", "premium");

    private TodoRepository todos;
    private Outbox outbox;
    private TodoService service;

    @BeforeEach
    void setUp() {
        todos = mock(TodoRepository.class);
        outbox = mock(Outbox.class);
        service = new TodoService(todos, outbox, CLOCK, 2);
        when(todos.save(any(Todo.class))).thenAnswer(inv -> withId(inv.getArgument(0)));
    }

    @Test
    void freeUsersCannotUsePremiumFeatures() {
        assertThatThrownBy(() -> service.create(FREE, new TodoService.NewTodo("t", null, Priority.HIGH, null)))
                .isInstanceOf(TodoErrors.PremiumRequired.class);
        assertThatThrownBy(() -> service.create(FREE, new TodoService.NewTodo("t", null, null, LocalDate.now(CLOCK))))
                .isInstanceOf(TodoErrors.PremiumRequired.class);
        verify(outbox, never()).publish(any(), any(), any());
    }

    @Test
    void freeUsersHaveAnOpenTodoQuota() {
        when(todos.countByOwnerIdAndCompletedFalse(FREE.id())).thenReturn(2L);
        assertThatThrownBy(() -> service.create(FREE, new TodoService.NewTodo("t", null, null, null)))
                .isInstanceOf(TodoErrors.QuotaExceeded.class);
    }

    @Test
    void premiumUsersHaveNoQuotaAndCanSetPriorities() {
        when(todos.countByOwnerIdAndCompletedFalse(PREMIUM.id())).thenReturn(1_000L);
        var todo = service.create(PREMIUM, new TodoService.NewTodo("  Ship it  ", null, Priority.HIGH, LocalDate.now(CLOCK)));
        assertThat(todo.title()).isEqualTo("Ship it");
        assertThat(todo.priority()).isEqualTo(Priority.HIGH);
    }

    @Test
    void creatingEmitsAnIntegrationEventKeyedByOwner() {
        service.create(FREE, new TodoService.NewTodo("Buy milk", null, null, null));
        verify(outbox).publish(eq(TodoEvent.TOPIC), eq(FREE.id().toString()), any(TodoEvent.TodoCreated.class));
    }

    @Test
    void updatesRequireTheCurrentVersion() {
        var existing = withId(new Todo(FREE.id(), "t", null, Priority.NONE, null));
        when(todos.findByIdAndOwnerId(existing.id(), FREE.id())).thenReturn(Optional.of(existing));
        var stale = new TodoService.TodoChanges(7, "new", null, null, null, null, false);
        assertThatThrownBy(() -> service.update(FREE, existing.id(), stale)).isInstanceOf(TodoErrors.StaleVersion.class);
    }

    @Test
    void otherUsersTodosAreInvisible() {
        when(todos.findByIdAndOwnerId(any(), eq(FREE.id()))).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.delete(FREE, UUID.randomUUID())).isInstanceOf(TodoErrors.TodoNotFound.class);
    }

    private static CurrentUser user(String... roles) {
        return new CurrentUser(UUID.randomUUID(), "sid", "u@example.com", "U", Set.of(roles));
    }

    private static Todo withId(Todo todo) {
        try {
            var field = Todo.class.getDeclaredField("id");
            field.setAccessible(true);
            if (field.get(todo) == null) {
                field.set(todo, UUID.randomUUID());
            }
            return todo;
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
