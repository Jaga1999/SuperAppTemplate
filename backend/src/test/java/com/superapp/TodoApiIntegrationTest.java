package com.superapp;

import java.nio.charset.StandardCharsets;
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
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import com.jayway.jsonpath.JsonPath;
import com.superapp.auth.internal.cookie.AuthCookies;
import com.superapp.auth.internal.token.TokenSet;
import com.superapp.todo.TodoEvent;

import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;

/**
 * End to end through the real security chain, Postgres, Redis and Kafka (Testcontainers):
 * HTTP → service → outbox → relay → Kafka → consumer → activity feed. Keycloak is replaced by test JWTs.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@TestPropertySource(properties = {
        "superapp.bff.encryption-key=AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=",
        "superapp.bff.keycloak.internal-url=http://keycloak.invalid/auth",
        "superapp.bff.keycloak.client-secret=test-secret",
        "superapp.bff.keycloak.admin-client-secret=test-secret",
        "superapp.outbox.poll-interval=PT0.1S",
        "superapp.todo.free-open-limit=3"
})
class TodoApiIntegrationTest {

    @Autowired
    MockMvcTester mvc;

    @Autowired
    JdbcClient jdbc;

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
        assertThat(mvc.get().uri("/api/v1/todos"))
                .hasStatus(401)
                .hasContentType(MediaType.APPLICATION_PROBLEM_JSON)
                .bodyJson().satisfies(body -> {
                    assertThat(body).extractingPath("$.status").isEqualTo(401);
                    // ProblemDetail mixin applied: extension properties are flattened, never a "properties" object.
                    assertThat(body).doesNotHavePath("$.properties");
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

        assertThat(mvc.post().uri("/api/v1/todos").cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"x\"}"))
                .hasStatus(403);
    }

    @Test
    void createListCompleteAndSeeActivityViaKafka() throws InterruptedException {
        var user = UUID.randomUUID();

        assertThat(mvc.post().uri("/api/v1/todos").with(as(user, "user")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"Write tests\"}"))
                .hasStatus(201)
                .bodyJson().extractingPath("$.title").isEqualTo("Write tests");

        var list = mvc.get().uri("/api/v1/todos").with(as(user, "user"));
        assertThat(list).hasStatusOk().bodyJson().extractingPath("$.page.totalElements").isEqualTo(1);

        // Outbox → Kafka → activity consumer (asynchronous)
        var deadline = Instant.now().plus(Duration.ofSeconds(30));
        long entries = 0;
        while (Instant.now().isBefore(deadline)) {
            entries = jdbc.sql("select count(*) from activity_entry where owner_id = :o").param("o", user)
                    .query(Long.class).single();
            if (entries > 0) {
                break;
            }
            Thread.sleep(200);
        }
        assertThat(entries).isEqualTo(1);
        assertThat(mvc.get().uri("/api/v1/activity").with(as(user, "user")))
                .hasStatusOk().bodyJson().extractingPath("$[0].type").isEqualTo("TodoCreated");
    }

    @Test
    void partialPatchCompletesATodoAndBumpsItsVersion() throws Exception {
        var user = UUID.randomUUID();
        var created = mvc.post().uri("/api/v1/todos").with(as(user, "user")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"Patch me\"}").exchange();
        var id = JsonPath.<String>read(created.getResponse().getContentAsString(StandardCharsets.UTF_8), "$.id");

        // Only the fields being changed are sent (clearDueDate etc. omitted).
        assertThat(mvc.patch().uri("/api/v1/todos/" + id).with(as(user, "user")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"version\":0,\"completed\":true}"))
                .hasStatusOk()
                .bodyJson().extractingPath("$.completed").isEqualTo(true);

        // Re-using the old version is rejected (optimistic concurrency).
        assertThat(mvc.patch().uri("/api/v1/todos/" + id).with(as(user, "user")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"version\":0,\"completed\":false}"))
                .hasStatus(409);
    }

    @Test
    void patchWithoutVersionIsAFieldLevel400() {
        assertThat(mvc.patch().uri("/api/v1/todos/" + UUID.randomUUID()).with(as(UUID.randomUUID(), "user")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"completed\":true}"))
                .hasStatus(400)
                .hasContentType(MediaType.APPLICATION_PROBLEM_JSON);
    }

    @Test
    void duplicateJsonKeysAreRejected() {
        assertThat(mvc.post().uri("/api/v1/todos").with(as(UUID.randomUUID(), "user")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"a\",\"title\":\"b\"}"))
                .hasStatus(400);
    }

    @Test
    void integrationEventsAndCachedTokensSurviveTheAppJsonMapper() {
        var event = new TodoEvent.TodoCreated(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), "t",
                Instant.parse("2026-01-02T03:04:05Z"));
        var eventJson = json.writeValueAsString(event);
        assertThat(eventJson).contains("\"type\":\"TodoCreated\"").contains("\"occurredAt\":\"2026-01-02T03:04:05Z\"");

        var tokens = new TokenSet("at", Instant.parse("2026-01-02T03:04:05Z"), null, null);
        assertThat(json.readValue(json.writeValueAsString(tokens), TokenSet.class)).isEqualTo(tokens);
    }

    @Test
    void premiumFeaturesAndQuotaAreEnforced() {
        var free = UUID.randomUUID();
        assertThat(mvc.post().uri("/api/v1/todos").with(as(free, "user")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"x\",\"priority\":\"HIGH\"}"))
                .hasStatus(403)
                .bodyJson().extractingPath("$.type").isEqualTo("https://superapp.dev/problems/premium-required");

        for (var i = 0; i < 3; i++) {
            assertThat(mvc.post().uri("/api/v1/todos").with(as(free, "user")).with(csrf())
                    .contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"t" + i + "\"}")).hasStatus(201);
        }
        assertThat(mvc.post().uri("/api/v1/todos").with(as(free, "user")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"one too many\"}"))
                .hasStatus(422);

        var premium = UUID.randomUUID();
        assertThat(mvc.post().uri("/api/v1/todos").with(as(premium, "user", "premium")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"x\",\"priority\":\"HIGH\"}"))
                .hasStatus(201);
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
