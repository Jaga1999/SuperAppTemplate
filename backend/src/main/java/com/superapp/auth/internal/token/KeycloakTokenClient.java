package com.superapp.auth.internal.token;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;

import org.jspecify.annotations.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.resilience.annotation.Retryable;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.superapp.auth.BffProperties;

/**
 * Server-to-server calls to Keycloak's OIDC endpoints on the private network (refresh + logout).
 * Authenticates as the confidential BFF client; a stolen refresh-token cookie is useless without this secret.
 */
@Component
public class KeycloakTokenClient {

    private static final Logger log = LoggerFactory.getLogger(KeycloakTokenClient.class);

    private final RestClient http;
    private final String basicAuth;

    public KeycloakTokenClient(RestClient.Builder builder, BffProperties properties) {
        this.http = builder.clone().baseUrl(properties.internalRealmUrl() + "/protocol/openid-connect").build();
        var kc = properties.keycloak();
        // RFC 6749 §2.3.1: form-urlencode id and secret before base64.
        this.basicAuth = Base64.getEncoder().encodeToString(
                (urlEncode(kc.clientId()) + ":" + urlEncode(kc.clientSecret())).getBytes(StandardCharsets.UTF_8));
    }

    /** Thrown when Keycloak refuses the refresh token (session ended, revoked, reused, user disabled). */
    public static final class RefreshRejectedException extends RuntimeException {
        RefreshRejectedException(String message) {
            super(message);
        }
    }

    /** RFC 6749 §5.1 token response. {@code refresh_*} are optional (absent for offline / client-credentials). */
    record TokenResponse(
            @JsonProperty(value = "access_token", required = true) String accessToken,
            @JsonProperty(value = "expires_in", required = true) long expiresIn,
            @JsonProperty("refresh_token") @Nullable String refreshToken,
            @JsonProperty("refresh_expires_in") @Nullable Long refreshExpiresIn) {
    }

    @Retryable(includes = ResourceAccessException.class, maxRetries = 2, delay = 150, multiplier = 2)
    public TokenSet refresh(String refreshToken) {
        var form = new LinkedMultiValueMap<String, String>();
        form.add("grant_type", "refresh_token");
        form.add("refresh_token", refreshToken);
        try {
            var response = http.post().uri("/token")
                    .header("Authorization", "Basic " + basicAuth)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(TokenResponse.class);
            if (response == null) {
                throw new RefreshRejectedException("Empty token response");
            }
            var now = Instant.now();
            return new TokenSet(
                    response.accessToken(),
                    now.plusSeconds(response.expiresIn()),
                    response.refreshToken(),
                    response.refreshExpiresIn() != null && response.refreshExpiresIn() > 0
                            ? now.plusSeconds(response.refreshExpiresIn()) : null);
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.BAD_REQUEST || e.getStatusCode() == HttpStatus.UNAUTHORIZED) {
                throw new RefreshRejectedException("Keycloak rejected refresh: " + e.getStatusCode());
            }
            throw e;
        }
    }

    /** Ends the Keycloak SSO session behind this refresh token (server-side logout, no browser round-trip). */
    @Retryable(includes = ResourceAccessException.class, maxRetries = 2, delay = 150, multiplier = 2)
    public void logout(String refreshToken) {
        var form = new LinkedMultiValueMap<String, String>();
        form.add("refresh_token", refreshToken);
        try {
            http.post().uri("/logout")
                    .header("Authorization", "Basic " + basicAuth)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .toBodilessEntity();
        } catch (HttpClientErrorException e) {
            // Session already gone (expired, revoked elsewhere): logout is idempotent.
            log.debug("Keycloak logout returned {}", e.getStatusCode());
        }
    }

    private static String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
