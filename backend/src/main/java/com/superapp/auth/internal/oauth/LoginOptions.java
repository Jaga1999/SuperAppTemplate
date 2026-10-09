package com.superapp.auth.internal.oauth;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Translates the BFF's public login URL parameters into Keycloak authorization-request parameters.
 * Everything is allow-listed: the browser can only ask for the specific screens below, never inject
 * arbitrary OIDC parameters.
 *
 * <pre>
 * /oauth2/authorization/keycloak?screen=register               → prompt=create        (themed sign-up page)
 * /oauth2/authorization/keycloak?idp=google                    → kc_idp_hint=google   (straight to Google)
 * /oauth2/authorization/keycloak?action=CONFIGURE_TOTP         → kc_action=…          (application-initiated action)
 * /oauth2/authorization/keycloak?reauth=true                   → prompt=login&max_age=0 (fresh credentials)
 * /oauth2/authorization/keycloak?email=a@b.c                   → login_hint=a@b.c
 * /oauth2/authorization/keycloak?returnTo=/app/settings        → where to land afterwards (same-origin path only)
 * </pre>
 */
public record LoginOptions(Map<String, Object> keycloakParameters, Optional<String> returnTo) {

    static final Set<String> ALLOWED_ACTIONS = Set.of(
            "CONFIGURE_TOTP",
            "UPDATE_PASSWORD",
            "UPDATE_PROFILE",
            "UPDATE_EMAIL",
            "CONFIGURE_RECOVERY_AUTHN_CODES",
            "webauthn-register",
            "webauthn-register-passwordless",
            "delete_account");
    static final Set<String> ALLOWED_IDPS = Set.of("google");

    private static final Pattern DELETE_CREDENTIAL = Pattern.compile("delete_credential:[0-9a-fA-F-]{36}");
    private static final Pattern LINK_IDP = Pattern.compile("idp_link:(google)");
    private static final Pattern SAFE_PATH = Pattern.compile("/(?!/)[A-Za-z0-9/_\\-.?=&%]{0,511}");
    private static final Pattern EMAIL = Pattern.compile("[^@\\s]{1,64}@[^@\\s]{1,189}");

    public static LoginOptions from(HttpServletRequest request) {
        var params = new LinkedHashMap<String, Object>();

        if ("register".equals(request.getParameter("screen"))) {
            params.put("prompt", "create");
        }
        var idp = request.getParameter("idp");
        if (idp != null && ALLOWED_IDPS.contains(idp)) {
            params.put("kc_idp_hint", idp);
        }
        var action = request.getParameter("action");
        if (action != null && isAllowedAction(action)) {
            params.put("kc_action", action);
        }
        if ("true".equals(request.getParameter("reauth"))) {
            params.put("prompt", "login");
            params.put("max_age", "0");
        }
        var email = request.getParameter("email");
        if (email != null && EMAIL.matcher(email).matches()) {
            params.put("login_hint", email);
        }
        return new LoginOptions(Map.copyOf(params), safeReturnPath(request.getParameter("returnTo")));
    }

    static boolean isAllowedAction(String action) {
        return ALLOWED_ACTIONS.contains(action)
                || DELETE_CREDENTIAL.matcher(action).matches()
                || LINK_IDP.matcher(action).matches();
    }

    /** Only same-origin absolute paths: no scheme, no host, no {@code //evil.com}, no backslashes. Prevents open redirects. */
    static Optional<String> safeReturnPath(String candidate) {
        if (candidate == null || candidate.contains("\\") || !SAFE_PATH.matcher(candidate).matches()) {
            return Optional.empty();
        }
        return Optional.of(candidate);
    }
}
