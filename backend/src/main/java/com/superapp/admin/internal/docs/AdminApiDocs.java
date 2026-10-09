package com.superapp.admin.internal.docs;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;

import com.superapp.admin.internal.AdminController.AdminUserDetail;
import com.superapp.admin.internal.AdminController.AdminUserView;
import com.superapp.admin.internal.AdminController.Overview;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;

/** OpenAPI documentation of {@code AdminController}. Every operation requires the {@code admin} realm role. */
@Tag(name = "Admin", description = """
        User management for administrators (realm role `admin`). Authorization is checked twice: by the API filter
        chain (`/api/v1/admin/**` requires `admin`) and by `@PreAuthorize` on the controller. A signed-in user
        without the role gets `403`.""")
public interface AdminApiDocs {

    @Operation(summary = "Dashboard counters", description = """
            Totals for the admin dashboard:
            * `activeUsers`: local users with status ACTIVE (signed in at least once or created by an event),
            * `keycloakUsers`: every user in the Keycloak realm, including ones that never signed in,
            * `signupsLast7Days`: local users created in the last 7 days.

            `keycloakUsers` is read live from Keycloak's Admin API; if Keycloak is unreachable the call fails with `500`.""")
    @ApiResponse(responseCode = "200", description = "The counters.")
    Overview overview();

    @Operation(summary = "List users", description = """
            Pages through the local user projection, newest first. Includes DISABLED users and DELETED (erased)
            users, whose personal fields are `null`.""")
    @ApiResponse(responseCode = "200", description = "One page of users with page metadata (`page.totalElements`, `page.totalPages`).")
    Page<AdminUserView> users(
            @Parameter(description = "Zero-based page index.", example = "0") int page,
            @Parameter(description = "Page size, 1 to 100.", example = "20") int size);

    @Operation(summary = "One user with sign-in methods and live sessions", description = """
            The local projection next to Keycloak's live view of the same user:
            * `inKeycloak=false`: the account no longer exists in Keycloak (deleted there); `sessions`,
              `credentialTypes` and `linkedProviders` are empty,
            * `enabled=false`: disabled in Keycloak; the user can't sign in,
            * `credentialTypes`: e.g. `password`, `otp`, `webauthn-passwordless` (passkey), `recovery-authn-codes`,
            * `sessions`: every active Keycloak session, most recently used first.""")
    @ApiResponse(responseCode = "200", description = "The user.")
    @ApiResponse(responseCode = "404", description = "No local user with that id (problem type `user-not-found`).")
    AdminUserDetail user(@Parameter(description = "Keycloak user id (the token's `sub`).") UUID id);

    @Operation(summary = "End one session of a user", description = """
            Ends a single Keycloak session (one device) and revokes its access tokens in the BFF immediately: the
            device's next API call returns `401`. Other sessions of the user are untouched.""")
    @ApiResponse(responseCode = "204", description = "Session ended.")
    @ApiResponse(responseCode = "404", description = "The session doesn't exist or belongs to another user (problem type `session-not-found`).")
    ResponseEntity<Void> endSession(
            @Parameter(description = "Keycloak user id.") UUID id,
            @Parameter(description = "Keycloak session id, from the user's `sessions`.") String sessionId);

    @Operation(summary = "Sign a user out everywhere", description = """
            Ends every Keycloak session of the user and revokes all their access tokens issued until now. Takes
            effect on the next request of every device. The account stays enabled; the user can sign in again.
            Idempotent.""")
    @ApiResponse(responseCode = "204", description = "Signed out everywhere (also when there was no session).")
    ResponseEntity<Void> signOut(@Parameter(description = "Keycloak user id.") UUID id);
}
