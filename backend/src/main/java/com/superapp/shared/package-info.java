/**
 * Shared kernel: crypto, error model, request context, transactional outbox and web configuration.
 * Every feature package may use it; it must not depend on any feature package.
 */
@NullMarked
package com.superapp.shared;

import org.jspecify.annotations.NullMarked;
