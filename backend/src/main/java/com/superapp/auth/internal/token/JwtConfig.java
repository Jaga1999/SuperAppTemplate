package com.superapp.auth.internal.token;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

import com.superapp.auth.BffProperties;
import com.superapp.auth.SessionRevocation;

/**
 * Local verification of Keycloak access tokens: signature via JWKS fetched on the private network,
 * then issuer, expiry, audience, authorized party, token type, and instant revocation.
 */
@Configuration(proxyBeanMethods = false)
public class JwtConfig {

    static final String BACKCHANNEL_LOGOUT_EVENT = "http://schemas.openid.net/event/backchannel-logout";

    @Bean
    JwtDecoder jwtDecoder(BffProperties properties, SessionRevocation revocation) {
        var decoder = jwksDecoder(properties);
        var clientId = properties.keycloak().clientId();
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(List.of(
                JwtValidators.createDefaultWithIssuer(properties.publicIssuer()),
                new JwtClaimValidator<String>("typ", "Bearer"::equals),
                new JwtClaimValidator<String>("azp", clientId::equals),
                audience(clientId),
                revocationValidator(revocation))));
        return decoder;
    }

    /** Verifies OIDC Back-Channel Logout tokens sent by Keycloak (OpenID Connect Back-Channel Logout 1.0 §2.6). */
    @Bean
    LogoutTokenVerifier logoutTokenVerifier(BffProperties properties) {
        var decoder = jwksDecoder(properties);
        var clientId = properties.keycloak().clientId();
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(List.of(
                JwtValidators.createDefaultWithIssuer(properties.publicIssuer()),
                audience(clientId),
                new JwtClaimValidator<String>("typ", "Logout"::equals),
                new JwtClaimValidator<Map<String, Object>>("events", events -> events != null && events.containsKey(BACKCHANNEL_LOGOUT_EVENT)),
                jwt -> jwt.hasClaim("nonce")
                        ? OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "nonce not allowed", null))
                        : OAuth2TokenValidatorResult.success(),
                jwt -> jwt.hasClaim("sid") || jwt.getSubject() != null
                        ? OAuth2TokenValidatorResult.success()
                        : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "sid or sub required", null)))));
        return new LogoutTokenVerifier(decoder);
    }


    private static NimbusJwtDecoder jwksDecoder(BffProperties properties) {
        return NimbusJwtDecoder.withJwkSetUri(properties.internalRealmUrl() + "/protocol/openid-connect/certs")
                .jwsAlgorithm(SignatureAlgorithm.RS256)
                .build();
    }

    private static OAuth2TokenValidator<Jwt> audience(String clientId) {
        return jwt -> jwt.getAudience() != null && jwt.getAudience().contains(clientId)
                ? OAuth2TokenValidatorResult.success()
                : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Wrong audience", null));
    }

    private static OAuth2TokenValidator<Jwt> revocationValidator(SessionRevocation revocation) {
        return jwt -> {
            var issuedAt = Objects.requireNonNullElse(jwt.getIssuedAt(), Instant.EPOCH);
            var sid = Objects.requireNonNullElse(jwt.getClaimAsString("sid"), "");
            return revocation.isRevoked(sid, UUID.fromString(jwt.getSubject()), issuedAt)
                    ? OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Session revoked", null))
                    : OAuth2TokenValidatorResult.success();
        };
    }
}
