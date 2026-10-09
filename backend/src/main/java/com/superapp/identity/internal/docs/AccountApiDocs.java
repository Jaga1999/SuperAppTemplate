package com.superapp.identity.internal.docs;

import java.util.List;

import org.springframework.http.ResponseEntity;

import com.superapp.auth.CurrentUser;
import com.superapp.identity.internal.AccountController.SecurityOverview;
import com.superapp.identity.internal.AccountController.SessionView;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;

/** OpenAPI documentation of {@code AccountController}. */
@Tag(name = "Account", description = """
        The signed-in user's own security settings and devices, read live from Keycloak. Changing credentials
        (password, two-step verification, passkeys, recovery codes, linking Google, deleting the account) is not an
        API call: navigate the browser to `/oauth2/authorization/keycloak?action=<ACTION>&returnTo=<path>`. Keycloak
        shows its themed page, then the user lands on `returnTo?action=success|cancelled|error`.""")
public interface AccountApiDocs {

    @Operation(summary = "My active sessions (devices)", description = """
            Every Keycloak session of the signed-in user. `current=true` marks the session of this browser; it is
            listed first, the rest by most recent activity.""")
    @ApiResponse(responseCode = "200", description = "The sessions.")
    List<SessionView> sessions(@Parameter(hidden = true) CurrentUser user);

    @Operation(summary = "Sign out one of my devices", description = """
            Ends one of the user's own sessions and revokes its tokens immediately. Ending the current session works
            too, but `POST /api/auth/logout` is the right call for "sign out of this browser".""")
    @ApiResponse(responseCode = "204", description = "Session ended.")
    @ApiResponse(responseCode = "404", description = """
            No such session for this user (problem type `session-not-found`). Sessions of other users are never
            touched and are reported the same way, so ids can't be probed.""")
    ResponseEntity<Void> endSession(@Parameter(hidden = true) CurrentUser user,
            @Parameter(description = "Session id from `GET /api/v1/account/sessions`.") String sessionId);

    @Operation(summary = "Sign out all my other devices", description = """
            Ends every session except the current one. This browser stays signed in. Idempotent.""")
    @ApiResponse(responseCode = "204", description = "Other sessions ended (also when there were none).")
    ResponseEntity<Void> signOutOthers(@Parameter(hidden = true) CurrentUser user);

    @Operation(summary = "Sign out everywhere", description = """
            Ends every session including this one and revokes all tokens issued until now. The next API call from
            this browser returns `401`; send the user to the landing page.""")
    @ApiResponse(responseCode = "204", description = "Signed out everywhere.")
    ResponseEntity<Void> signOutAll(@Parameter(hidden = true) CurrentUser user);

    @Operation(summary = "My sign-in methods", description = """
            What protects the account: password, authenticator app (`totpEnabled`), passkeys, security keys,
            recovery codes, linked identity providers, and which providers can still be linked
            (`linkableProviders`, e.g. `google` when Google sign-in is enabled and not linked yet).""")
    @ApiResponse(responseCode = "200", description = "The overview.")
    SecurityOverview security(@Parameter(hidden = true) CurrentUser user);

    @Operation(summary = "Unlink an identity provider", description = """
            Removes the link to an external identity provider (e.g. Google). Refused when it is the account's only
            way to sign in (no password set), so an account can never be locked out.""")
    @ApiResponse(responseCode = "204", description = "Unlinked.")
    @ApiResponse(responseCode = "404", description = "The provider isn't linked to this account (problem type `provider-not-linked`).")
    @ApiResponse(responseCode = "409", description = "It's the last sign-in method; set a password first (problem type `last-sign-in-method`).")
    ResponseEntity<Void> unlink(@Parameter(hidden = true) CurrentUser user,
            @Parameter(description = "Provider alias, e.g. `google`.") String alias);
}
