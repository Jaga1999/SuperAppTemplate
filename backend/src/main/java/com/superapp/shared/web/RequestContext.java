package com.superapp.shared.web;

import java.util.Optional;

/**
 * Per-request context carried with a Java 25 {@link ScopedValue} instead of a {@link ThreadLocal}:
 * immutable, automatically unbound when the request ends, and cheap with virtual threads.
 */
public final class RequestContext {

    public static final ScopedValue<String> REQUEST_ID = ScopedValue.newInstance();

    private RequestContext() {
    }

    public static Optional<String> requestId() {
        return REQUEST_ID.isBound() ? Optional.of(REQUEST_ID.get()) : Optional.empty();
    }
}
