package com.superapp.auth.internal.token;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import com.superapp.auth.BffProperties;
import com.superapp.auth.SessionRevocation;

/**
 * Redis-backed revocation markers, shared by every BFF instance:
 * <ul>
 *   <li>{@code bff:revoked:sid:<sid>} – a single Keycloak session</li>
 *   <li>{@code bff:revoked:user:<id>} = epoch-second watermark – all tokens issued at/before it</li>
 * </ul>
 * One {@code MGET} per API request checks both.
 */
@Component
public class RedisSessionRevocation implements SessionRevocation {

    private static final Logger log = LoggerFactory.getLogger(RedisSessionRevocation.class);

    private final StringRedisTemplate redis;
    private final Duration ttl;

    public RedisSessionRevocation(StringRedisTemplate redis, BffProperties properties) {
        this.redis = redis;
        this.ttl = properties.revocationTtl();
    }

    @Override
    public void revokeSession(String sessionId) {
        if (sessionId.isBlank()) {
            return;
        }
        redis.opsForValue().set(sidKey(sessionId), "1", ttl);
        log.info("Revoked session {}", sessionId);
    }

    @Override
    public void revokeUser(UUID userId, Instant at) {
        redis.opsForValue().set(userKey(userId), Long.toString(at.getEpochSecond()), ttl);
        log.info("Revoked all sessions of user {} (tokens issued ≤ {})", userId, at);
    }

    @Override
    public boolean isRevoked(String sessionId, UUID userId, Instant issuedAt) {
        List<String> values = redis.opsForValue().multiGet(List.of(sidKey(sessionId), userKey(userId)));
        if (values == null) {
            return false;
        }
        if (values.get(0) != null) {
            return true;
        }
        var watermark = values.get(1);
        return watermark != null && issuedAt.getEpochSecond() <= Long.parseLong(watermark);
    }

    private static String sidKey(String sid) {
        return "bff:revoked:sid:" + sid;
    }

    private static String userKey(UUID userId) {
        return "bff:revoked:user:" + userId;
    }
}
