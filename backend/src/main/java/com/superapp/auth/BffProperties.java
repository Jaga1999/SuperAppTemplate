package com.superapp.auth;

import java.net.URI;
import java.time.Duration;
import java.util.Base64;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

/**
 * BFF configuration ({@code superapp.bff.*}). Validated at startup; the app refuses to boot when misconfigured.
 *
 * @param publicUrl         public origin of the product (nginx), e.g. {@code https://app.example.com}
 * @param encryptionKey     base64 master secret (≥ 32 bytes) for cookie/token encryption
 * @param revocationTtl     how long a revoked session/user marker lives; must exceed the access-token lifespan
 * @param defaultReturnPath where the browser lands after login when no {@code returnTo} was requested
 */
@Validated
@ConfigurationProperties("superapp.bff")
public record BffProperties(
        @NotNull URI publicUrl,
        @Valid @NotNull Keycloak keycloak,
        @Valid @DefaultValue Cookies cookies,
        @NotBlank String encryptionKey,
        @Valid @DefaultValue RateLimit rateLimit,
        @DefaultValue("PT15M") Duration revocationTtl,
        @DefaultValue("/app") String defaultReturnPath) {

    /**
     * @param internalUrl Keycloak base URL on the private network, including the relative path
     *                    (e.g. {@code http://keycloak:8080/auth}). Only the BFF ever uses it.
     */
    public record Keycloak(
            @NotNull URI internalUrl,
            @NotBlank String realm,
            @NotBlank String clientId,
            @NotBlank String clientSecret,
            @NotBlank String adminClientId,
            @NotBlank String adminClientSecret) {
    }

    /** @param secure {@code false} only for plain-http non-localhost hosts; disables the {@code __Host-} prefix. */
    public record Cookies(@DefaultValue("true") boolean secure) {
    }

    public record RateLimit(
            @DefaultValue("true") boolean enabled,
            @Positive @DefaultValue("300") int readsPerMinute,
            @Positive @DefaultValue("60") int writesPerMinute,
            @Positive @DefaultValue("20") int authPerMinute,
            @Positive @DefaultValue("60") int loginPagesPerMinute) {
    }

    /** Issuer as seen by browsers and stamped into every token: {@code <publicUrl>/auth/realms/<realm>}. */
    public String publicIssuer() {
        return stripTrailingSlash(publicUrl.toString()) + "/auth/realms/" + keycloak.realm();
    }

    /** Realm base URL on the private network, for server-to-server calls. */
    public String internalRealmUrl() {
        return stripTrailingSlash(keycloak.internalUrl().toString()) + "/realms/" + keycloak.realm();
    }

    /** {@code scheme://host:port} of Keycloak on the private network (the reverse-proxy target). */
    public URI internalOrigin() {
        var u = keycloak.internalUrl();
        return URI.create(u.getScheme() + "://" + u.getRawAuthority());
    }

    public String internalAdminUrl() {
        return stripTrailingSlash(keycloak.internalUrl().toString()) + "/admin/realms/" + keycloak.realm();
    }

    public byte[] masterSecret() {
        var bytes = Base64.getDecoder().decode(encryptionKey);
        if (bytes.length < 32) {
            throw new IllegalStateException("superapp.bff.encryption-key must decode to at least 32 bytes");
        }
        return bytes;
    }

    private static String stripTrailingSlash(String s) {
        return s.endsWith("/") ? s.substring(0, s.length() - 1) : s;
    }
}
