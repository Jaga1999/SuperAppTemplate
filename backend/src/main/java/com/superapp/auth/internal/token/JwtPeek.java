package com.superapp.auth.internal.token;

import java.text.ParseException;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;

import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.JWTParser;

/**
 * Reads claims of a JWT <b>without verifying it</b>. Only for housekeeping decisions on tokens the BFF itself
 * received from Keycloak over the back channel (cookie lifetimes, "refresh soon?"). Never for authorization:
 * that always goes through the verifying {@code JwtDecoder}.
 */
public final class JwtPeek {

    private JwtPeek() {
    }

    public static Optional<JWTClaimsSet> claims(String token) {
        try {
            return Optional.of(JWTParser.parse(token).getJWTClaimsSet());
        } catch (ParseException _) {
            return Optional.empty();
        }
    }

    public static Optional<Instant> expiresAt(String token) {
        return claims(token).map(JWTClaimsSet::getExpirationTime).map(Date::toInstant);
    }

    public static Optional<String> stringClaim(String token, String claim) {
        return claims(token).flatMap(c -> {
            try {
                return Optional.ofNullable(c.getStringClaim(claim));
            } catch (ParseException _) {
                return Optional.empty();
            }
        });
    }
}
