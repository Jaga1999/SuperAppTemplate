package com.superapp.keycloak.legal;

import java.lang.reflect.Proxy;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.keycloak.models.UserModel;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LegalConsentTest {

    private static final LegalDocument TERMS = new LegalDocument("Terms", "2026-10-09", "2026-10-09", "");
    private static final LegalDocument PRIVACY = new LegalDocument("Privacy", "2026-10-09", "2026-10-09", "");
    private final LegalConsentRequiredAction action = new LegalConsentRequiredAction(TERMS, PRIVACY);

    @Test
    void newUserMustAccept() {
        assertTrue(action.needsConsent(user(Map.of())));
    }

    @Test
    void userWhoAcceptedTheCurrentVersionsIsNeverAskedAgain() {
        assertFalse(action.needsConsent(user(Map.of(
                LegalConsentRequiredAction.TERMS_VERSION, "2026-10-09",
                LegalConsentRequiredAction.PRIVACY_VERSION, "2026-10-09"))));
    }

    @Test
    void changingEitherDocumentAsksAgain() {
        assertTrue(action.needsConsent(user(Map.of(
                LegalConsentRequiredAction.TERMS_VERSION, "2026-01-01",
                LegalConsentRequiredAction.PRIVACY_VERSION, "2026-10-09"))));
        assertTrue(action.needsConsent(user(Map.of(
                LegalConsentRequiredAction.TERMS_VERSION, "2026-10-09",
                LegalConsentRequiredAction.PRIVACY_VERSION, "2026-01-01"))));
    }

    @Test
    void frontMatterIsParsed() {
        var doc = LegalDocument.parse("t", List.of("---", "title: Terms", "version: \"3\"", "effective: 2027-01-01", "---", "# Body"));
        assertEquals(new LegalDocument("Terms", "3", "2027-01-01", ""), doc);
    }

    @Test
    void missingVersionFailsLoudly() {
        assertThrows(IllegalStateException.class, () -> LegalDocument.parse("t", List.of("---", "title: Terms", "---")));
        assertThrows(IllegalStateException.class, () -> LegalDocument.parse("t", List.of("# no front matter")));
    }

    @Test
    void theRepositoryDocumentsAreValid() throws Exception {
        var dir = Path.of(System.getProperty("legal.dir"));
        assertFalse(LegalDocument.read(dir.resolve("terms-and-conditions.md")).version().isBlank());
        assertFalse(LegalDocument.read(dir.resolve("privacy-policy.md")).version().isBlank());
    }

    /** A UserModel that only answers getFirstAttribute (all the trigger logic needs). */
    private static UserModel user(Map<String, String> attributes) {
        return (UserModel) Proxy.newProxyInstance(UserModel.class.getClassLoader(), new Class<?>[] {UserModel.class},
                (_, method, args) -> switch (method.getName()) {
                    case "getFirstAttribute" -> attributes.get((String) args[0]);
                    default -> throw new UnsupportedOperationException(method.getName());
                });
    }
}
