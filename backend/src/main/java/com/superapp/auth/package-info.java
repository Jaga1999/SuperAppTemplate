/**
 * BFF authentication and session security.
 *
 * <p>Public API (usable by other features): {@link com.superapp.auth.CurrentUser},
 * {@link com.superapp.auth.SessionRevocation}, {@link com.superapp.auth.UserSignedIn},
 * {@link com.superapp.auth.BffProperties}. Everything under {@code internal} is private to this feature.
 */
@NullMarked
package com.superapp.auth;

import org.jspecify.annotations.NullMarked;
