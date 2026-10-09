/**
 * Local projection of Keycloak users (only what the product needs: id, email, names, status, timestamps).
 * Keycloak stays the source of truth; credentials and sessions are never copied.
 *
 * <p>Public API: {@link com.superapp.user.UserDirectory}.
 */
@NullMarked
package com.superapp.user;

import org.jspecify.annotations.NullMarked;
