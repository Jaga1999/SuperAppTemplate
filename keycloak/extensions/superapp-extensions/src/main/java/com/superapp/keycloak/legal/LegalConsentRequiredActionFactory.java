package com.superapp.keycloak.legal;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Path;

import org.jboss.logging.Logger;
import org.keycloak.Config;
import org.keycloak.authentication.RequiredActionFactory;
import org.keycloak.authentication.RequiredActionProvider;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.KeycloakSessionFactory;

/**
 * Registers {@link LegalConsentRequiredAction}. Reads the current document versions once at startup from
 * {@code SUPERAPP_LEGAL_DIR} (default {@code /opt/keycloak/legal}, where keycloak/Dockerfile copies {@code legal/}).
 * Missing or malformed documents stop Keycloak from starting: better than silently skipping consent.
 */
public final class LegalConsentRequiredActionFactory implements RequiredActionFactory {

    private static final Logger log = Logger.getLogger(LegalConsentRequiredActionFactory.class);
    private static final String DEFAULT_DIR = "/opt/keycloak/legal";

    private LegalConsentRequiredAction action;

    @Override
    public String getId() {
        return LegalConsentRequiredAction.PROVIDER_ID;
    }

    @Override
    public String getDisplayText() {
        return "Accept Terms and Conditions and Privacy Policy (versioned)";
    }

    @Override
    public void init(Config.Scope config) {
        var dir = Path.of(System.getenv().getOrDefault("SUPERAPP_LEGAL_DIR", DEFAULT_DIR));
        try {
            var terms = LegalDocument.read(dir.resolve("terms-and-conditions.md"));
            var privacy = LegalDocument.read(dir.resolve("privacy-policy.md"));
            this.action = new LegalConsentRequiredAction(terms, privacy);
            log.infof("Legal consent: terms version %s, privacy policy version %s", terms.version(), privacy.version());
        } catch (IOException e) {
            throw new UncheckedIOException("Legal documents not readable in " + dir, e);
        }
    }

    @Override
    public RequiredActionProvider create(KeycloakSession session) {
        return action;
    }

    @Override
    public void postInit(KeycloakSessionFactory factory) {
    }

    @Override
    public void close() {
    }
}
