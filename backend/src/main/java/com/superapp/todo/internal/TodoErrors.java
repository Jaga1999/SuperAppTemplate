package com.superapp.todo.internal;

import org.springframework.http.HttpStatus;

import com.superapp.shared.web.DomainException;

final class TodoErrors {

    private TodoErrors() {
    }

    static final class TodoNotFound extends DomainException {
        TodoNotFound() {
            super(HttpStatus.NOT_FOUND, "todo-not-found", "Todo not found", "That todo doesn't exist or isn't yours.");
        }
    }

    static final class PremiumRequired extends DomainException {
        PremiumRequired(String feature) {
            super(HttpStatus.FORBIDDEN, "premium-required", "Premium feature", feature + " is available on Premium.");
        }
    }

    static final class QuotaExceeded extends DomainException {
        QuotaExceeded(int limit) {
            super(HttpStatus.UNPROCESSABLE_CONTENT, "todo-quota-exceeded", "Limit reached",
                    "Free accounts can have " + limit + " open todos. Complete some or upgrade to Premium.");
        }
    }

    static final class StaleVersion extends DomainException {
        StaleVersion() {
            super(HttpStatus.CONFLICT, "stale-version", "Out of date",
                    "This todo was changed somewhere else. Reload and try again.");
        }
    }
}
