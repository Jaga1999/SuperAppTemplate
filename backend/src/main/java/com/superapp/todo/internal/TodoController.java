package com.superapp.todo.internal;

import java.net.URI;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import org.jspecify.annotations.Nullable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.superapp.auth.CurrentUser;

@RestController
@RequestMapping(path = "/api/{version}/todos", version = "1")
class TodoController {

    private final TodoService service;

    TodoController(TodoService service) {
        this.service = service;
    }

    record TodoView(UUID id, String title, @Nullable String notes, boolean completed, @Nullable Instant completedAt,
            Priority priority, @Nullable LocalDate dueDate, Instant createdAt, Instant updatedAt, long version) {

        static TodoView of(Todo t) {
            return new TodoView(t.id(), t.title(), t.notes(), t.completed(), t.completedAt(), t.priority(),
                    t.dueDate(), t.createdAt(), t.updatedAt(), t.version());
        }
    }

    record CreateTodoRequest(
            @NotBlank @Size(max = 200) String title,
            @Size(max = 2000) @Nullable String notes,
            @Nullable Priority priority,
            @Nullable LocalDate dueDate) {
    }

    record UpdateTodoRequest(
            @NotNull @PositiveOrZero Long version,
            @Size(min = 1, max = 200) @Nullable String title,
            @Size(max = 2000) @Nullable String notes,
            @Nullable Boolean completed,
            @Nullable Priority priority,
            @Nullable LocalDate dueDate,
            @Nullable Boolean clearDueDate) {
    }

    @GetMapping
    Page<TodoView> list(CurrentUser user,
            @RequestParam(defaultValue = "ALL") TodoService.StatusFilter status,
            @RequestParam(required = false) @Size(max = 100) @Nullable String q,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "50") @Min(1) @Max(100) int size) {
        return service.list(user, status, q, PageRequest.of(page, size)).map(TodoView::of);
    }

    @PostMapping
    ResponseEntity<TodoView> create(CurrentUser user, @Valid @RequestBody CreateTodoRequest request) {
        var todo = service.create(user, new TodoService.NewTodo(request.title(), request.notes(), request.priority(), request.dueDate()));
        return ResponseEntity.created(URI.create("/api/v1/todos/" + todo.id())).body(TodoView.of(todo));
    }

    @PatchMapping("/{id}")
    TodoView update(CurrentUser user, @PathVariable UUID id, @Valid @RequestBody UpdateTodoRequest request) {
        return TodoView.of(service.update(user, id, new TodoService.TodoChanges(request.version(), request.title(),
                request.notes(), request.completed(), request.priority(), request.dueDate(), Boolean.TRUE.equals(request.clearDueDate()))));
    }

    @DeleteMapping("/{id}")
    ResponseEntity<Void> delete(CurrentUser user, @PathVariable UUID id) {
        service.delete(user, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/clear-completed")
    Map<String, Integer> clearCompleted(CurrentUser user) {
        return Map.of("cleared", service.clearCompleted(user));
    }

    @GetMapping("/stats")
    TodoService.Stats stats(CurrentUser user) {
        return service.stats(user);
    }
}
