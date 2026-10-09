package com.superapp.identity.internal.docs;

import com.superapp.identity.internal.PublicConfigController.PublicConfig;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;

/** OpenAPI documentation of {@code PublicConfigController}. */
@Tag(name = "Public", description = "Unauthenticated, cacheable information for the landing page.")
public interface PublicConfigApiDocs {

    @Operation(summary = "Feature flags for anonymous visitors", description = """
            Switches the landing and sign-in screens need before anyone signs in. Never requires a session; a
            stale or invalid session cookie is ignored instead of causing `401`.
            * `googleLoginEnabled`: show "Continue with Google".""")
    @SecurityRequirements
    @ApiResponse(responseCode = "200", description = "The flags.")
    PublicConfig config();
}
