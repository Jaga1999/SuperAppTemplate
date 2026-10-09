/**
 * Identity: everything the BFF needs from Keycloak beyond login.
 *
 * <p>Public API: {@link com.superapp.identity.IdentityDirectory} (Keycloak Admin API facade) and
 * {@link com.superapp.identity.IdentityEvent} (in-process events derived from Keycloak's Kafka event stream).
 */
@NullMarked
package com.superapp.identity;

import org.jspecify.annotations.NullMarked;
