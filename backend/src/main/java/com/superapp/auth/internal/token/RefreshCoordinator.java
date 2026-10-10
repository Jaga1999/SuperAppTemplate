package com.superapp.auth.internal.token;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import com.superapp.auth.BffProperties;
import com.superapp.shared.crypto.AeadCipher;

import tools.jackson.databind.json.JsonMapper;

/**
 * Single-flight token refresh across all BFF instances.
 *
 * <p>Keycloak rotates refresh tokens and allows <b>zero reuse</b>, so a page firing 5 parallel API calls with an
 * expired access token must refresh exactly once. The first request takes a short Redis lock keyed by the
 * hash of the old refresh token and calls Keycloak; the others wait and reuse its (encrypted, 20s-cached) result.
 */
@Component
public class RefreshCoordinator {

    private static final Logger log = LoggerFactory.getLogger(RefreshCoordinator.class);
    private static final Duration LOCK_TTL = Duration.ofSeconds(10);
    private static final Duration RESULT_TTL = Duration.ofSeconds(20);
    private static final Duration WAIT_FOR_PEER = Duration.ofSeconds(5);
    private static final Duration POLL = Duration.ofMillis(50);

    private final StringRedisTemplate redis;
    private final KeycloakTokenClient keycloak;
    private final JsonMapper json;
    private final AeadCipher cipher;

    public RefreshCoordinator(StringRedisTemplate redis, KeycloakTokenClient keycloak, JsonMapper json,
            BffProperties properties) {
        this.redis = redis;
        this.keycloak = keycloak;
        this.json = json;
        this.cipher = AeadCipher.forPurpose(properties.masterSecret(), "redis:refresh-result");
    }

    public TokenSet refresh(String refreshToken) {
        var fingerprint = sha256Hex(refreshToken);
        var resultKey = "bff:refresh:result:" + fingerprint;
        var lockKey = "bff:refresh:lock:" + fingerprint;

        var cached = cachedResult(resultKey);
        if (cached.isPresent()) {
            return cached.get();
        }
        if (Boolean.TRUE.equals(redis.opsForValue().setIfAbsent(lockKey, "1", LOCK_TTL))) {
            try {
                var tokens = keycloak.refresh(refreshToken);
                redis.opsForValue().set(resultKey, cipher.encrypt(json.writeValueAsString(tokens)), RESULT_TTL);
                return tokens;
            } finally {
                redis.delete(lockKey);
            }
        }
        // Another request (maybe on another instance) is refreshing this very token: wait for its result.
        var deadline = Instant.now().plus(WAIT_FOR_PEER);
        while (Instant.now().isBefore(deadline)) {
            try {
                Thread.sleep(POLL); // cheap on a virtual thread
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
            cached = cachedResult(resultKey);
            if (cached.isPresent()) {
                return cached.get();
            }
            if (!Boolean.TRUE.equals(redis.hasKey(lockKey))) {
                break; // peer failed; its rejection means ours would fail too
            }
        }
        log.debug("Refresh peer did not produce a result in time");
        throw new KeycloakTokenClient.RefreshRejectedException("Concurrent refresh did not complete");
    }

    private Optional<TokenSet> cachedResult(String key) {
        return Optional.ofNullable(redis.opsForValue().get(key))
                .flatMap(cipher::decrypt)
                .map(value -> json.readValue(value, TokenSet.class));
    }

    private static String sha256Hex(String value) {
        try {
            var digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}
