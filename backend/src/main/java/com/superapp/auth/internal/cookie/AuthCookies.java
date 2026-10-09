package com.superapp.auth.internal.cookie;

import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.Map;
import java.util.Optional;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import com.superapp.auth.BffProperties;
import com.superapp.auth.internal.token.TokenSet;
import com.superapp.shared.crypto.AeadCipher;

/**
 * The BFF's cookies. Every value is AES-GCM encrypted with a purpose-bound key, and every cookie is
 * {@code HttpOnly; Secure; SameSite=Lax; Path=/} with the {@code __Host-} prefix (no Domain, cannot be set by
 * sub-domains). JavaScript never sees a token.
 */
@Component
public class AuthCookies {

    public enum Kind {
        ACCESS("sa_at", "cookie:access-token"),
        REFRESH("sa_rt", "cookie:refresh-token"),
        AUTH_REQUEST("sa_ar", "cookie:authorization-request");

        private final String baseName;
        private final String purpose;

        Kind(String baseName, String purpose) {
            this.baseName = baseName;
            this.purpose = purpose;
        }
    }

    private static final Duration MIN_TOKEN_COOKIE_AGE = Duration.ofMinutes(1);

    private final boolean secure;
    private final String prefix;
    private final Map<Kind, AeadCipher> ciphers = new EnumMap<>(Kind.class);

    public AuthCookies(BffProperties properties) {
        this.secure = properties.cookies().secure();
        this.prefix = secure ? "__Host-" : "";
        var master = properties.masterSecret();
        for (var kind : Kind.values()) {
            ciphers.put(kind, AeadCipher.forPurpose(master, kind.purpose));
        }
    }

    public String name(Kind kind) {
        return prefix + kind.baseName;
    }

    /** True for cookies owned by the BFF; the Keycloak proxy strips them so they never reach Keycloak. */
    public boolean isBffCookie(String cookieName) {
        return Arrays.stream(Kind.values()).anyMatch(k -> name(k).equals(cookieName)) || "XSRF-TOKEN".equals(cookieName);
    }

    public Optional<String> read(HttpServletRequest request, Kind kind) {
        var cookies = request.getCookies();
        if (cookies == null) {
            return Optional.empty();
        }
        var cookieName = name(kind);
        return Arrays.stream(cookies)
                .filter(c -> cookieName.equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .flatMap(ciphers.get(kind)::decrypt);
    }

    public void write(HttpServletResponse response, Kind kind, String value, Duration maxAge) {
        response.addHeader(HttpHeaders.SET_COOKIE, base(kind, ciphers.get(kind).encrypt(value)).maxAge(maxAge).build().toString());
    }

    public void clear(HttpServletResponse response, Kind kind) {
        response.addHeader(HttpHeaders.SET_COOKIE, base(kind, "").maxAge(Duration.ZERO).build().toString());
    }

    /** Access cookie lives as long as the access token; refresh cookie as long as the Keycloak session allows. */
    public void writeTokens(HttpServletResponse response, TokenSet tokens) {
        var now = Instant.now();
        write(response, Kind.ACCESS, tokens.accessToken(), atLeast(Duration.between(now, tokens.accessExpiresAt())));
        tokens.refreshToken().ifPresent(rt ->
                write(response, Kind.REFRESH, rt, atLeast(Duration.between(now, tokens.refreshExpiresAt().orElse(now.plus(Duration.ofHours(10)))))));
    }

    public void clearSession(HttpServletResponse response) {
        clear(response, Kind.ACCESS);
        clear(response, Kind.REFRESH);
    }

    private ResponseCookie.ResponseCookieBuilder base(Kind kind, String value) {
        return ResponseCookie.from(name(kind), value)
                .httpOnly(true)
                .secure(secure)
                .sameSite("Lax")
                .path("/");
    }

    private static Duration atLeast(Duration d) {
        return d.compareTo(MIN_TOKEN_COOKIE_AGE) < 0 ? MIN_TOKEN_COOKIE_AGE : d;
    }
}
