package com.superapp.auth.internal.oauth;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.client.AuthorizedClientServiceOAuth2AuthorizedClientManager;
import org.springframework.security.oauth2.client.InMemoryOAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientManager;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientProviderBuilder;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.core.oidc.IdTokenClaimNames;

import com.superapp.auth.BffProperties;

/**
 * OAuth2 client registrations, wired explicitly (no OIDC discovery) because Keycloak lives behind a split horizon:
 * <ul>
 *   <li>Browser-facing: authorization endpoint + issuer use the <b>public</b> URL ({@code <public>/auth/...}),
 *       which the BFF reverse-proxies to Keycloak.</li>
 *   <li>Server-to-server: token, JWKS and userinfo use the <b>private</b> URL ({@code http://keycloak:8080/auth}).</li>
 * </ul>
 */
@Configuration(proxyBeanMethods = false)
public class OAuthClientConfig {

    public static final String LOGIN_REGISTRATION = "keycloak";
    public static final String ADMIN_REGISTRATION = "keycloak-admin";

    /** Only the login registration is exposed to {@code /oauth2/authorization/*}. */
    @Bean
    ClientRegistrationRepository clientRegistrationRepository(BffProperties properties) {
        var kc = properties.keycloak();
        var internal = properties.internalRealmUrl() + "/protocol/openid-connect";
        var login = ClientRegistration.withRegistrationId(LOGIN_REGISTRATION)
                .clientId(kc.clientId())
                .clientSecret(kc.clientSecret())
                .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
                .scope("openid", "profile", "email")
                .authorizationUri(properties.publicIssuer() + "/protocol/openid-connect/auth")
                .tokenUri(internal + "/token")
                .jwkSetUri(internal + "/certs")
                .userInfoUri(internal + "/userinfo")
                .userNameAttributeName(IdTokenClaimNames.SUB)
                .issuerUri(properties.publicIssuer())
                .clientName("SuperApp")
                .build();
        return new InMemoryClientRegistrationRepository(login);
    }

    /**
     * Client-credentials manager for the Keycloak Admin API service account. Kept in its own repository so it can
     * never be used as a browser login.
     */
    @Bean
    OAuth2AuthorizedClientManager keycloakAdminClientManager(BffProperties properties) {
        var kc = properties.keycloak();
        var admin = ClientRegistration.withRegistrationId(ADMIN_REGISTRATION)
                .clientId(kc.adminClientId())
                .clientSecret(kc.adminClientSecret())
                .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
                .authorizationGrantType(AuthorizationGrantType.CLIENT_CREDENTIALS)
                .tokenUri(properties.internalRealmUrl() + "/protocol/openid-connect/token")
                .build();
        var repository = new InMemoryClientRegistrationRepository(admin);
        var manager = new AuthorizedClientServiceOAuth2AuthorizedClientManager(
                repository, new InMemoryOAuth2AuthorizedClientService(repository));
        manager.setAuthorizedClientProvider(OAuth2AuthorizedClientProviderBuilder.builder().clientCredentials().build());
        return manager;
    }
}
