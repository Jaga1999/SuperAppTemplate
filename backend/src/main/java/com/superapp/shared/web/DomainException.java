package com.superapp.shared.web;

import java.net.URI;

import org.springframework.http.HttpStatus;

/**
 * Base class for business errors. Rendered as RFC 9457 problem details by {@link GlobalExceptionHandler}.
 * The {@code slug} becomes the problem {@code type} URI ({@code https://superapp.dev/problems/<slug>}),
 * a stable identifier the frontend can switch on.
 */
public abstract class DomainException extends RuntimeException {

    static final String TYPE_BASE = "https://superapp.dev/problems/";

    private final HttpStatus status;
    private final String slug;
    private final String title;

    protected DomainException(HttpStatus status, String slug, String title, String detail) {
        // Java 25 flexible constructor bodies: validate before delegating to super().
        if (!slug.matches("[a-z0-9-]+")) {
            throw new IllegalArgumentException("Problem slug must be kebab-case: " + slug);
        }
        super(detail);
        this.status = status;
        this.slug = slug;
        this.title = title;
    }

    public HttpStatus status() {
        return status;
    }

    public URI type() {
        return URI.create(TYPE_BASE + slug);
    }

    public String title() {
        return title;
    }
}
