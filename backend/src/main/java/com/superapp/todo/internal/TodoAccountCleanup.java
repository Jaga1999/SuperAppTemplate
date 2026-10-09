package com.superapp.todo.internal;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.superapp.identity.IdentityEvent.UserDeleted;

/** Right to erasure: when an account is deleted in Keycloak, its todos go too. */
@Component
class TodoAccountCleanup {

    private static final Logger log = LoggerFactory.getLogger(TodoAccountCleanup.class);

    private final TodoRepository todos;

    TodoAccountCleanup(TodoRepository todos) {
        this.todos = todos;
    }

    @EventListener
    @Transactional
    void on(UserDeleted event) {
        var deleted = todos.deleteAllOwnedBy(event.userId());
        log.info("Deleted {} todos of deleted user {}", deleted, event.userId());
    }
}
