package com.superapp.auth.internal.ratelimit;

import java.time.Duration;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Component;

/**
 * Distributed token-bucket rate limiter. The whole check-and-take runs atomically inside Redis (one Lua call,
 * one round trip) using Redis' own clock, so every BFF instance shares one consistent bucket per key.
 * Fails open: if Redis is unavailable the request is allowed (nginx still enforces coarse edge limits).
 */
@Component
public class RedisRateLimiter {

    private static final Logger log = LoggerFactory.getLogger(RedisRateLimiter.class);

    public record Decision(boolean allowed, long remaining, Duration retryAfter) {
    }

    private static final RedisScript<List<Long>> TOKEN_BUCKET = listOfLongs("""
            local key = KEYS[1]
            local capacity = tonumber(ARGV[1])
            local refill_per_ms = tonumber(ARGV[2])
            local t = redis.call('TIME')
            local now = t[1] * 1000 + math.floor(t[2] / 1000)
            local bucket = redis.call('HMGET', key, 'tokens', 'ts')
            local tokens = tonumber(bucket[1]) or capacity
            local ts = tonumber(bucket[2]) or now
            tokens = math.min(capacity, tokens + (now - ts) * refill_per_ms)
            local allowed = 0
            local retry_ms = 0
            if tokens >= 1 then
              tokens = tokens - 1
              allowed = 1
            else
              retry_ms = math.ceil((1 - tokens) / refill_per_ms)
            end
            redis.call('HSET', key, 'tokens', tokens, 'ts', now)
            redis.call('PEXPIRE', key, math.ceil(capacity / refill_per_ms) + 1000)
            return { allowed, math.floor(tokens), retry_ms }
            """);

    /** Redis returns a Lua table of integers as {@code List<Long>}; the API only accepts a raw {@code List.class}. */
    @SuppressWarnings({"unchecked", "rawtypes"})
    private static RedisScript<List<Long>> listOfLongs(String lua) {
        return (RedisScript) RedisScript.of(lua, List.class);
    }

    private final StringRedisTemplate redis;

    public RedisRateLimiter(StringRedisTemplate redis) {
        this.redis = redis;
    }

    /** Allows {@code perMinute} requests per minute per {@code key}, with bursts up to the same amount. */
    public Decision tryConsume(String key, int perMinute) {
        try {
            var refillPerMs = perMinute / 60_000.0;
            List<Long> result = redis.execute(TOKEN_BUCKET, List.of("bff:rl:" + key),
                    Integer.toString(perMinute), Double.toString(refillPerMs));
            if (result == null || result.size() < 3) {
                return new Decision(true, perMinute, Duration.ZERO);
            }
            return new Decision(result.get(0) == 1L, result.get(1), Duration.ofMillis(result.get(2)));
        } catch (RuntimeException e) {
            log.warn("Rate limiter unavailable, allowing request: {}", e.getMessage());
            return new Decision(true, perMinute, Duration.ZERO);
        }
    }
}
