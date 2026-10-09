package com.superapp;

import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import com.superapp.auth.internal.cookie.AuthCookies;
import com.superapp.auth.internal.token.TokenSet;

import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;

/**
 * End to end through the real security chain, Postgres (Flyway), Redis and Kafka (Testcontainers).
 * Keycloak is replaced by test JWTs.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@TestPropertySource(properties = {
        "superapp.bff.encryption-key=AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=",
        "superapp.bff.keycloak.internal-url=http://keycloak.invalid/auth",
        "superapp.bff.keycloak.client-secret=test-secret",
        "superapp.bff.keycloak.admin-client-secret=test-secret"
})
class ApiIntegrationTest {

    @Autowired
    MockMvcTester mvc;

    @Autowired
    AuthCookies cookies;

    @Autowired
    JsonMapper json;

    private static RequestPostProcessor as(UUID userId, String... roles) {
        var authorities = Arrays.stream(roles)
                .<GrantedAuthority>map(r -> new SimpleGrantedAuthority("ROLE_" + r)).toList();
        return jwt().jwt(j -> j.subject(userId.toString())
                        .claim("sid", "session-" + userId)
                        .claim("realm_access", Map.of("roles", List.of(roles))))
                .authorities(authorities);
    }

    @Test
    void anonymousCallersGetAProblem401() {
        assertThat(mvc.get().uri("/api/v1/me"))
                .hasStatus(401)
                .hasContentType(MediaType.APPLICATION_PROBLEM_JSON)
                .bodyJson().satisfies(body -> {
                    assertThat(body).extractingPath("$.status").isEqualTo(401);
                    // ProblemDetail mixin applied: extension properties are flattened, never a "properties" object.
                    assertThat(body).doesNotHavePath("$.properties");
                });
    }

    @Test
    void signedInUserGetsTheirProfile() {
        var user = UUID.randomUUID();
        assertThat(mvc.get().uri("/api/v1/me").with(as(user, "user")))
                .hasStatusOk()
                .bodyJson().satisfies(body -> {
                    assertThat(body).extractingPath("$.id").isEqualTo(user.toString());
                    assertThat(body).extractingPath("$.admin").isEqualTo(false);
                });
    }

    /**
     * Cookie-authenticated mutations must carry a valid CSRF token. (Spring exempts bearer-token requests from CSRF;
     * because our bearer token lives in a cookie, the resolver only yields it after CsrfFilter has passed.)
     * Without the gate this request would be treated as a bearer request: 401 instead of 403.
     */
    @Test
    void cookieAuthenticatedMutationsWithoutCsrfTokenAreRejected() {
        var response = new MockHttpServletResponse();
        cookies.write(response, AuthCookies.Kind.ACCESS, "header.payload.signature", Duration.ofMinutes(5));
        var cookie = response.getCookies()[0];

        assertThat(mvc.post().uri("/api/v1/account/sessions/sign-out-others").cookie(cookie)).hasStatus(403);
    }

    @Test
    void cachedTokensSurviveTheAppJsonMapper() {
        var tokens = new TokenSet("at", Instant.parse("2026-01-02T03:04:05Z"), null, null);
        assertThat(json.readValue(json.writeValueAsString(tokens), TokenSet.class)).isEqualTo(tokens);
    }

    @Test
    void adminEndpointsRequireTheAdminRole() {
        assertThat(mvc.get().uri("/api/v1/admin/overview").with(as(UUID.randomUUID(), "user"))).hasStatus(403);
    }

    @Test
    void publicConfigIsReachableWithoutASession() {
        assertThat(mvc.get().uri("/api/v1/public/config")).hasStatusOk()
                .bodyJson().extractingPath("$.googleLoginEnabled").isEqualTo(false);
    }
}
