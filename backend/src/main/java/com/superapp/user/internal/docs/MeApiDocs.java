package com.superapp.user.internal.docs;

import com.superapp.auth.CurrentUser;
import com.superapp.user.internal.MeController.Me;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;

/** OpenAPI documentation of {@code MeController}. */
@Tag(name = "Me", description = "The signed-in user. The SPA's single source of \"am I signed in?\".")
public interface MeApiDocs {

    @Operation(summary = "Who am I", description = """
            The signed-in user: profile from the local projection (kept in sync with Keycloak), realm roles and
            flags from the access token, and the id of this browser's Keycloak session.
            * `200`: signed in.
            * `401`: not signed in, or the session ended (expired, signed out elsewhere, revoked). This is the
              expected answer for anonymous visitors, not an error to report.

            Right after the first sign-in the profile fields can briefly come from the token instead of the
            projection; `memberSince` is `null` until the projection row exists.""")
    @ApiResponse(responseCode = "200", description = "The signed-in user.")
    Me me(@Parameter(hidden = true) CurrentUser user);
}
