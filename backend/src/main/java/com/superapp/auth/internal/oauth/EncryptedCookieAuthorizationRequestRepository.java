package com.superapp.auth.internal.oauth;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.jspecify.annotations.Nullable;
import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.oauth2.core.endpoint.OAuth2ParameterNames;

import com.superapp.auth.internal.cookie.AuthCookies;
import com.superapp.auth.internal.cookie.AuthCookies.Kind;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

/**
 * Keeps the in-flight authorization request (state, nonce, PKCE verifier, return path) in a short-lived,
 * AES-GCM encrypted cookie instead of an HTTP session, so the BFF stays completely stateless.
 */
public class EncryptedCookieAuthorizationRequestRepository implements AuthorizationRequestRepository<OAuth2AuthorizationRequest> {

    /** Request attribute exposing the return path to the success/failure handlers after the request is consumed. */
    public static final String RETURN_TO = EncryptedCookieAuthorizationRequestRepository.class.getName() + ".RETURN_TO";

    private static final Duration MAX_AGE = Duration.ofMinutes(10);

    private final AuthCookies cookies;
    private final JsonMapper json;

    public EncryptedCookieAuthorizationRequestRepository(AuthCookies cookies, JsonMapper json) {
        this.cookies = cookies;
        this.json = json;
    }

    /** Serializable snapshot; every value Spring puts in the request is a string. */
    record Snapshot(
            String authorizationUri,
            String clientId,
            String redirectUri,
            Set<String> scopes,
            String state,
            Map<String, String> additionalParameters,
            Map<String, String> attributes,
            String authorizationRequestUri) {
    }

    @Override
    public @Nullable OAuth2AuthorizationRequest loadAuthorizationRequest(HttpServletRequest request) {
        var state = request.getParameter(OAuth2ParameterNames.STATE);
        if (state == null) {
            return null;
        }
        var stored = read(request);
        return stored != null && state.equals(stored.getState()) ? stored : null;
    }

    @Override
    public void saveAuthorizationRequest(@Nullable OAuth2AuthorizationRequest authorizationRequest,
            HttpServletRequest request, HttpServletResponse response) {
        if (authorizationRequest == null) {
            cookies.clear(response, Kind.AUTH_REQUEST);
            return;
        }
        var snapshot = new Snapshot(
                authorizationRequest.getAuthorizationUri(),
                authorizationRequest.getClientId(),
                authorizationRequest.getRedirectUri(),
                authorizationRequest.getScopes(),
                authorizationRequest.getState(),
                stringify(authorizationRequest.getAdditionalParameters()),
                stringify(authorizationRequest.getAttributes()),
                authorizationRequest.getAuthorizationRequestUri());
        cookies.write(response, Kind.AUTH_REQUEST, json.writeValueAsString(snapshot), MAX_AGE);
    }

    @Override
    public @Nullable OAuth2AuthorizationRequest removeAuthorizationRequest(HttpServletRequest request,
            HttpServletResponse response) {
        var stored = loadAuthorizationRequest(request);
        cookies.clear(response, Kind.AUTH_REQUEST);
        if (stored != null && stored.getAttribute(BffAuthorizationRequestResolver.RETURN_TO_ATTRIBUTE) instanceof String path) {
            request.setAttribute(RETURN_TO, path);
        }
        return stored;
    }

    /** Return path of a login attempt that failed before the request could be consumed. */
    public @Nullable String peekReturnTo(HttpServletRequest request) {
        var stored = read(request);
        return stored != null && stored.getAttribute(BffAuthorizationRequestResolver.RETURN_TO_ATTRIBUTE) instanceof String path
                ? path : null;
    }

    private @Nullable OAuth2AuthorizationRequest read(HttpServletRequest request) {
        return cookies.read(request, Kind.AUTH_REQUEST).map(this::restore).orElse(null);
    }

    private @Nullable OAuth2AuthorizationRequest restore(String value) {
        try {
            var s = json.readValue(value, Snapshot.class);
            return OAuth2AuthorizationRequest.authorizationCode()
                    .authorizationUri(s.authorizationUri())
                    .clientId(s.clientId())
                    .redirectUri(s.redirectUri())
                    .scopes(s.scopes())
                    .state(s.state())
                    .additionalParameters(new HashMap<>(s.additionalParameters()))
                    .attributes(new HashMap<>(s.attributes()))
                    .authorizationRequestUri(s.authorizationRequestUri())
                    .build();
        } catch (JacksonException _) {
            return null;
        }
    }

    private static Map<String, String> stringify(Map<String, Object> map) {
        var out = new HashMap<String, String>();
        map.forEach((k, v) -> out.put(k, String.valueOf(v)));
        return out;
    }
}
