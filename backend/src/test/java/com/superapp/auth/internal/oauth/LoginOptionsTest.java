package com.superapp.auth.internal.oauth;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

class LoginOptionsTest {

    @ParameterizedTest
    @ValueSource(strings = {"/app", "/app/settings/security", "/app/todos?filter=open", "/"})
    void acceptsSameOriginPaths(String path) {
        assertThat(LoginOptions.safeReturnPath(path)).contains(path);
    }

    @ParameterizedTest
    @ValueSource(strings = {"https://evil.com", "//evil.com", "/\\evil.com", "\\\\evil.com", "javascript:alert(1)",
            "app", "/app\n/evil", ""})
    void rejectsOpenRedirects(String path) {
        assertThat(LoginOptions.safeReturnPath(path)).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"CONFIGURE_TOTP", "webauthn-register-passwordless", "UPDATE_PASSWORD", "delete_account",
            "idp_link:google", "delete_credential:3f2504e0-4f89-41d3-9a0c-0305e82c3301"})
    void allowsKnownActions(String action) {
        assertThat(LoginOptions.isAllowedAction(action)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"UPDATE_ROLES", "idp_link:evil", "delete_credential:../../x", "configure_totp", ""})
    void rejectsUnknownActions(String action) {
        assertThat(LoginOptions.isAllowedAction(action)).isFalse();
    }

    @Test
    void translatesBrowserParametersIntoKeycloakParameters() {
        var request = new MockHttpServletRequest();
        request.setParameter("screen", "register");
        request.setParameter("idp", "google");
        request.setParameter("returnTo", "/app");
        request.setParameter("prompt", "none"); // raw OIDC params are never passed through

        var options = LoginOptions.from(request);

        assertThat(options.keycloakParameters()).containsEntry("prompt", "create").containsEntry("kc_idp_hint", "google");
        assertThat(options.returnTo()).contains("/app");
    }

    @Test
    void ignoresUnknownIdentityProviders() {
        var request = new MockHttpServletRequest();
        request.setParameter("idp", "facebook");
        assertThat(LoginOptions.from(request).keycloakParameters()).doesNotContainKey("kc_idp_hint");
    }
}
