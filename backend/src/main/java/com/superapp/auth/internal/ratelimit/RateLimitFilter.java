package com.superapp.auth.internal.ratelimit;

import java.io.IOException;
import java.util.function.Function;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.filter.OncePerRequestFilter;

import com.superapp.shared.web.Problems;

import tools.jackson.databind.json.JsonMapper;

/**
 * Applies a {@link Policy} per request: keyed by the authenticated user when known, otherwise by client IP
 * (the real browser IP, already resolved from nginx's {@code X-Forwarded-For} by the forwarded-header filter).
 * Emits IETF {@code RateLimit-*} headers and a problem-details 429 with {@code Retry-After}.
 *
 * <p>Not a Spring bean on purpose: it is instantiated per security chain with its own policy.
 */
public class RateLimitFilter extends OncePerRequestFilter {

    /** @param bucket name of the bucket (part of the key); @param perMinute capacity */
    public record Limit(String bucket, int perMinute) {
    }

    @FunctionalInterface
    public interface Policy extends Function<HttpServletRequest, Limit> {
    }

    private final RedisRateLimiter limiter;
    private final Policy policy;
    private final JsonMapper json;
    private final boolean enabled;

    public RateLimitFilter(RedisRateLimiter limiter, Policy policy, JsonMapper json, boolean enabled) {
        this.limiter = limiter;
        this.policy = policy;
        this.json = json;
        this.enabled = enabled;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (!enabled) {
            chain.doFilter(request, response);
            return;
        }
        var limit = policy.apply(request);
        var decision = limiter.tryConsume(limit.bucket() + ":" + subject(request), limit.perMinute());
        response.setHeader("RateLimit-Limit", Integer.toString(limit.perMinute()));
        response.setHeader("RateLimit-Remaining", Long.toString(Math.max(0, decision.remaining())));
        if (!decision.allowed()) {
            var retrySeconds = Math.max(1, (decision.retryAfter().toMillis() + 999) / 1000);
            response.setHeader("Retry-After", Long.toString(retrySeconds));
            Problems.write(response, json, HttpStatus.TOO_MANY_REQUESTS, "rate-limited", "Too many requests",
                    "Slow down a little and try again in " + retrySeconds + "s.");
            return;
        }
        chain.doFilter(request, response);
    }

    private static String subject(HttpServletRequest request) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof JwtAuthenticationToken jwt) {
            return "u:" + jwt.getName();
        }
        return "ip:" + request.getRemoteAddr();
    }
}
