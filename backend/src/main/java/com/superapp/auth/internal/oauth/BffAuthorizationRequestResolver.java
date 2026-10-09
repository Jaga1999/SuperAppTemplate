package com.superapp.auth.internal.oauth;

import jakarta.servlet.http.HttpServletRequest;

import org.jspecify.annotations.Nullable;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestCustomizers;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

/**
 * Builds the Keycloak authorization request: Authorization Code + PKCE (S256) for our confidential client
 * (RFC 9700 §2.1.1) plus the allow-listed {@link LoginOptions}.
 *
 * <p>The customizer API has no access to the servlet request, so the parsed options are bound for the duration
 * of {@code resolve()} with a Java 25 {@link ScopedValue}: no ThreadLocal, nothing to clean up.
 */
public class BffAuthorizationRequestResolver implements OAuth2AuthorizationRequestResolver {

    static final String RETURN_TO_ATTRIBUTE = "superapp.return_to";
    private static final ScopedValue<LoginOptions> OPTIONS = ScopedValue.newInstance();

    private final DefaultOAuth2AuthorizationRequestResolver delegate;

    public BffAuthorizationRequestResolver(ClientRegistrationRepository registrations) {
        this.delegate = new DefaultOAuth2AuthorizationRequestResolver(registrations, "/oauth2/authorization");
        this.delegate.setAuthorizationRequestCustomizer(
                OAuth2AuthorizationRequestCustomizers.withPkce().andThen(builder -> {
                    var options = OPTIONS.get();
                    builder.additionalParameters(p -> p.putAll(options.keycloakParameters()));
                    options.returnTo().ifPresent(path -> builder.attributes(a -> a.put(RETURN_TO_ATTRIBUTE, path)));
                }));
    }

    @Override
    public @Nullable OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
        return ScopedValue.where(OPTIONS, LoginOptions.from(request)).call(() -> delegate.resolve(request));
    }

    @Override
    public @Nullable OAuth2AuthorizationRequest resolve(HttpServletRequest request, String clientRegistrationId) {
        return ScopedValue.where(OPTIONS, LoginOptions.from(request)).call(() -> delegate.resolve(request, clientRegistrationId));
    }
}
