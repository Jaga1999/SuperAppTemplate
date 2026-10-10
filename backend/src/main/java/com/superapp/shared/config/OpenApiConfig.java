package com.superapp.shared.config;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.regex.Pattern;

import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.PathItem;
import io.swagger.v3.oas.models.Paths;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.IntegerSchema;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.ObjectSchema;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.media.StringSchema;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;

/**
 * OpenAPI description of the BFF's product API ({@code /api/**}), with Swagger UI at {@code /swagger-ui.html} on the
 * BFF's own port. nginx routes only {@code /api}, {@code /oauth2}, {@code /login/oauth2} and {@code /auth} to the BFF,
 * so the description is never public; {@code API_DOCS_ENABLED=false} turns it off.
 *
 * <p>Per-endpoint documentation lives next to each controller in a {@code docs} package ({@code *ApiDocs} interfaces
 * the controllers implement). This class adds what every operation shares: the cookie session and CSRF schemes,
 * the problem-details error model, the standard error responses and the concrete {@code /api/v1} paths.
 */
@Configuration(proxyBeanMethods = false)
class OpenApiConfig {

    /** Security scheme names referenced by the {@code *ApiDocs} interfaces. */
    static final String SESSION_SCHEME = "session";
    static final String CSRF_SCHEME = "csrf";

    /** Operation extension for endpoints that are deliberately outside the CSRF check (server-to-server callbacks). */
    static final String CSRF_EXEMPT = "x-csrf-exempt";

    /** Versioned paths as springdoc renders them ({@code /api/{version}/} or {@code /api/1/}) → the real {@code /api/v1/}. */
    private static final Pattern VERSIONED_PATH = Pattern.compile("^/api/(?:\\{version}|v?(\\d+))/");

    private static final String PROBLEM = "ProblemDetail";
    private static final String PROBLEM_JSON = "application/problem+json";

    @Bean
    OpenAPI openApi(@Value("${superapp.bff.public-url}") String publicUrl,
            @Value("${superapp.bff.cookies.secure:true}") boolean secureCookies) {
        var sessionCookie = (secureCookies ? "__Host-" : "") + "sa_at";
        return new OpenAPI()
                .info(new Info()
                        .title("SuperApp API")
                        .version("v1")
                        .description(DESCRIPTION)
                        .license(new License().name("See LICENSE")))
                .servers(List.of(new Server().url(publicUrl).description("Public origin (nginx → BFF)")))
                .components(new Components()
                        .addSecuritySchemes(SESSION_SCHEME, new SecurityScheme()
                                .type(SecurityScheme.Type.APIKEY).in(SecurityScheme.In.COOKIE).name(sessionCookie)
                                .description("Encrypted HttpOnly session cookie set by the BFF after sign-in. "
                                        + "Browsers send it automatically; it can't be read or set from JavaScript."))
                        .addSecuritySchemes(CSRF_SCHEME, new SecurityScheme()
                                .type(SecurityScheme.Type.APIKEY).in(SecurityScheme.In.HEADER).name("X-XSRF-TOKEN")
                                .description("Copy of the XSRF-TOKEN cookie. Required on every POST, PUT, PATCH and DELETE."))
                        .addSchemas(PROBLEM, problemSchema()))
                .addSecurityItem(new SecurityRequirement().addList(SESSION_SCHEME));
    }

    /**
     * Applied after the per-endpoint docs: concrete version in paths, CSRF on writes, shared error responses.
     * Endpoints documented with an empty {@code @SecurityRequirements} are public and get no 401; endpoints carrying
     * the {@link #CSRF_EXEMPT} extension need no CSRF header.
     */
    @Bean
    OpenApiCustomizer apiConventions() {
        return api -> {
            var paths = new Paths();
            api.getPaths().forEach((path, item) -> {
                item.readOperationsMap().forEach((method, operation) -> applyConventions(method, operation));
                paths.addPathItem(concreteVersion(path), item);
            });
            api.setPaths(paths);
        };
    }

    private static String concreteVersion(String path) {
        var matcher = VERSIONED_PATH.matcher(path);
        if (!matcher.find()) {
            return path;
        }
        var version = matcher.group(1) != null ? matcher.group(1) : "1";
        return matcher.replaceFirst("/api/v" + version + "/");
    }

    private static void applyConventions(PathItem.HttpMethod method, Operation operation) {
        if (operation.getParameters() != null) {
            operation.getParameters().removeIf(p -> "version".equals(p.getName()) && "path".equals(p.getIn()));
        }
        var isPublic = operation.getSecurity() != null && operation.getSecurity().isEmpty();
        var isWrite = method != PathItem.HttpMethod.GET && method != PathItem.HttpMethod.HEAD;
        var csrfExempt = operation.getExtensions() != null && operation.getExtensions().containsKey(CSRF_EXEMPT);
        var hasInput = operation.getRequestBody() != null
                || (operation.getParameters() != null && !operation.getParameters().isEmpty());
        if (isWrite && !csrfExempt) {
            var requirement = new SecurityRequirement().addList(CSRF_SCHEME);
            if (!isPublic) {
                requirement.addList(SESSION_SCHEME);
            }
            operation.setSecurity(List.of(requirement));
        }
        var responses = operation.getResponses();
        var standard = new LinkedHashMap<String, String>();
        if (hasInput) {
            standard.put("400", "Invalid input: a malformed body or parameter, or a failed validation.");
        }
        if (!isPublic) {
            standard.put("401", "No valid session: not signed in, the session expired, or it was revoked "
                    + "(sign-out elsewhere, disabled account). Send the user through sign-in again.");
        }
        if (isWrite && !csrfExempt) {
            standard.put("403", "Missing or wrong X-XSRF-TOKEN header, or the user lacks the required role.");
        } else if (!isPublic) {
            standard.put("403", "The signed-in user lacks the required role.");
        }
        standard.put("429", "Too many requests from this IP (edge rate limit). Slow down and retry.");
        standard.put("500", "Unexpected server error. The response carries a requestId to quote in support requests.");
        standard.forEach((status, description) -> {
            if (!responses.containsKey(status)) {
                responses.addApiResponse(status, problem(description));
            }
        });
    }

    private static ApiResponse problem(String description) {
        return new ApiResponse().description(description).content(new Content().addMediaType(PROBLEM_JSON,
                new MediaType().schema(new Schema<>().$ref("#/components/schemas/" + PROBLEM))));
    }

    private static Schema<?> problemSchema() {
        var problem = new ObjectSchema();
        problem.description("RFC 9457 problem details. Every error response uses this shape.");
        problem.addProperty("type", new StringSchema().format("uri").example("https://superapp.dev/problems/session-not-found")
                .description("Stable error identifier. Its last path segment is the machine-readable slug."));
        problem.addProperty("title", new StringSchema().example("Session not found").description("Short, human-readable summary."));
        problem.addProperty("status", new IntegerSchema().example(404).description("HTTP status code."));
        problem.addProperty("detail", new StringSchema().example("That session no longer exists.")
                .description("What happened and what to do next, safe to show to users."));
        problem.addProperty("instance", new StringSchema().format("uri-reference").description("The request path."));
        problem.addProperty("requestId", new StringSchema().description("Correlation id, also in the X-Request-Id header and the logs."));
        problem.addProperty("errors", new ObjectSchema().description("Field-level messages for validation failures, keyed by field."));
        return problem;
    }

    private static final String DESCRIPTION = """
            The product API of the SuperApp backend-for-frontend (BFF). The browser never holds a token:
            Keycloak's tokens stay in AES-GCM encrypted, HttpOnly, `__Host-` cookies that only the BFF can read.

            ## Signing in
            Sign-in is a full-page navigation, never an API call:

            | Goal | Navigate the browser to |
            |---|---|
            | Sign in | `/oauth2/authorization/keycloak?returnTo=/app` |
            | Create an account | `/oauth2/authorization/keycloak?screen=register` |
            | Continue with Google | `/oauth2/authorization/keycloak?idp=google` |
            | Change password, add a passkey, set up 2FA, delete the account | `/oauth2/authorization/keycloak?action=<KEYCLOAK_ACTION>` |

            The BFF runs the Authorization Code flow with PKCE (S256), state and nonce against Keycloak, stores the
            tokens in cookies and redirects to `returnTo` (same-origin paths only). Access tokens are refreshed
            silently on the server; an API call never sees an expired token while the Keycloak session lives.

            ## Calling the API
            * Send requests from the same origin with credentials (cookies) included.
            * **CSRF:** every POST, PUT, PATCH and DELETE must send header `X-XSRF-TOKEN` with the value of the
              `XSRF-TOKEN` cookie (set on the first GET). Missing or wrong → `403`.
            * **Versioning:** the version is a path segment, currently `/api/v1/...`.
            * **Errors:** always `application/problem+json` (RFC 9457) with a stable `type`; see `ProblemDetail`.
            * **Rate limits:** per IP at the edge (nginx). Too many requests → `429`.
            * **Revocation is instant:** signing out, ending a session or disabling a user in Keycloak makes the
              next request return `401`, even before the access token expires.

            ## Roles
            `user` is granted to every account. `admin` unlocks `/api/v1/admin/**`.
            """;
}
