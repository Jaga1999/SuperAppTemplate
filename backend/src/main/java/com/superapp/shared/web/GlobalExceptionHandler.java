package com.superapp.shared.web;

import java.util.Map;
import java.util.stream.Collectors;

import org.jspecify.annotations.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.RestClientException;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/** Every error leaves the API as {@code application/problem+json} (RFC 9457). Internals never leak. */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(DomainException.class)
    ProblemDetail domain(DomainException ex) {
        var problem = ProblemDetail.forStatusAndDetail(ex.status(), ex.getMessage());
        problem.setType(ex.type());
        problem.setTitle(ex.title());
        return problem;
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    ProblemDetail conflict(ObjectOptimisticLockingFailureException ex) {
        return Problems.of(HttpStatus.CONFLICT, "stale-version", "Out of date",
                "This item was changed somewhere else. Reload and try again.");
    }

    @ExceptionHandler({AccessDeniedException.class, AuthorizationDeniedException.class})
    ProblemDetail forbidden(RuntimeException ex) {
        return Problems.of(HttpStatus.FORBIDDEN, "forbidden", "Forbidden", "You don't have permission to do that.");
    }

    /** A downstream service (Keycloak Admin API, ...) failed or refused us: our fault, not the caller's. */
    @ExceptionHandler(RestClientException.class)
    ProblemDetail upstream(RestClientException ex) {
        log.error("Upstream call failed", ex);
        return Problems.of(HttpStatus.BAD_GATEWAY, "upstream-unavailable", "Service temporarily unavailable",
                "We couldn't reach a service this page depends on. Please try again shortly.");
    }

    @ExceptionHandler(Exception.class)
    ProblemDetail unexpected(Exception ex) {
        log.error("Unhandled error", ex);
        return Problems.of(HttpStatus.INTERNAL_SERVER_ERROR, "internal-error", "Something went wrong",
                "An unexpected error occurred. Please try again.");
    }

    @Override
    protected @Nullable ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        var problem = Problems.of(HttpStatus.BAD_REQUEST, "validation", "Invalid request", "Some fields are invalid.");
        Map<String, String> errors = ex.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(
                        e -> e.getField(),
                        e -> e.getDefaultMessage() != null ? e.getDefaultMessage() : "invalid",
                        (first, _) -> first));
        problem.setProperty("errors", errors);
        return ResponseEntity.badRequest().body(problem);
    }
}
