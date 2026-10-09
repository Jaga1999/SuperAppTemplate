package com.superapp.auth.internal.web.docs;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.ResponseEntity;
import org.springframework.util.MultiValueMap;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.extensions.Extension;
import io.swagger.v3.oas.annotations.extensions.ExtensionProperty;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;

/** OpenAPI documentation of {@code AuthController}. */
@Tag(name = "Session", description = """
        Session plumbing of the BFF (unversioned, not part of the product API). Signing in is a browser navigation
        to `/oauth2/authorization/keycloak`, not an API call: see the API description.""")
public interface AuthApiDocs {

    @Operation(summary = "Sign out of this browser", description = """
            Ends the Keycloak SSO session server-to-server, revokes this session's still-valid access tokens and
            clears the session cookies. Other devices stay signed in (use `POST /api/v1/account/sessions/sign-out-all`
            for everywhere).

            Works without a valid session (expired or already signed out), so it is always safe to call. It still
            requires the `X-XSRF-TOKEN` header, so another site can't sign the user out.""")
    @SecurityRequirements
    @ApiResponse(responseCode = "204", description = "Signed out; cookies cleared.")
    ResponseEntity<Void> logout(@Parameter(hidden = true) HttpServletRequest request,
            @Parameter(hidden = true) HttpServletResponse response);

    @Operation(summary = "OIDC Back-Channel Logout receiver (Keycloak only)",
            extensions = @Extension(properties = @ExtensionProperty(name = "x-csrf-exempt", value = "true")),
            description = """
            Called by Keycloak on the private network whenever a session ends anywhere (admin action, sign out
            everywhere, password reset, idle timeout). nginx returns `404` for this path, so browsers can't reach it.

            The `logout_token` is a JWT verified like an access token (Keycloak's signature, issuer, audience) plus
            the Back-Channel Logout 1.0 rules: `typ=Logout`, the back-channel logout event, no `nonce`, and `sid`
            or `sub`. With `sid` that session is revoked; with only `sub` every session of the user. It is exempt from
            CSRF checks: the caller is a server, authenticated by the signed token itself.""")
    @SecurityRequirements
    @ApiResponse(responseCode = "200", description = "Token accepted; the session or user is revoked.")
    @ApiResponse(responseCode = "400", description = "Missing or invalid logout token (empty body).")
    ResponseEntity<Void> backchannelLogout(
            @Parameter(description = "Form body with `logout_token`.") MultiValueMap<String, String> form);
}
