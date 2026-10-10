package com.superapp.keycloak.legal;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

import org.jboss.logging.Logger;
import org.keycloak.authentication.RequiredActionContext;
import org.keycloak.authentication.RequiredActionProvider;
import org.keycloak.events.Errors;
import org.keycloak.forms.login.LoginFormsProvider;
import org.keycloak.models.UserModel;

/**
 * Versioned acceptance of the Terms and Conditions and the Privacy Policy.
 *
 * <p>Unlike Keycloak's built-in {@code TERMS_AND_CONDITIONS} (which only records <i>that</i> a user accepted), this
 * action stores <i>which version</i> of each document the user accepted. On every sign-in {@link #evaluateTriggers}
 * compares those versions with the current ones: if nothing changed the user never sees the page again; if either
 * document changed (its {@code version} front-matter value), the user must accept the new version once.
 */
final class LegalConsentRequiredAction implements RequiredActionProvider {

    static final String PROVIDER_ID = "superapp-legal-consent";
    static final String PAGE = "legal-consent.ftl";

    // User attributes (declared admin-only in the realm's user profile)
    static final String TERMS_VERSION = "legal_terms_version";
    static final String PRIVACY_VERSION = "legal_privacy_version";
    static final String ACCEPTED_AT = "legal_accepted_at";

    private static final Logger log = Logger.getLogger(LegalConsentRequiredAction.class);

    private final LegalDocument terms;
    private final LegalDocument privacy;

    LegalConsentRequiredAction(LegalDocument terms, LegalDocument privacy) {
        this.terms = terms;
        this.privacy = privacy;
    }

    @Override
    public void evaluateTriggers(RequiredActionContext context) {
        var user = context.getUser();
        if (needsConsent(user)) {
            user.addRequiredAction(PROVIDER_ID);
        }
    }

    boolean needsConsent(UserModel user) {
        return !terms.version().equals(user.getFirstAttribute(TERMS_VERSION))
                || !privacy.version().equals(user.getFirstAttribute(PRIVACY_VERSION));
    }

    @Override
    public void requiredActionChallenge(RequiredActionContext context) {
        context.challenge(form(context).createForm(PAGE));
    }

    @Override
    public void processAction(RequiredActionContext context) {
        var formData = context.getHttpRequest().getDecodedFormParameters();
        var user = context.getUser();

        if (formData.containsKey("cancel")) {
            context.getEvent().error(Errors.REJECTED_BY_USER);
            context.failure();
            return;
        }
        if (!"on".equals(formData.getFirst("acceptTerms")) || !"on".equals(formData.getFirst("acceptPrivacy"))) {
            context.challenge(form(context).setError("legalConsentBothRequired").createForm(PAGE));
            return;
        }

        user.setSingleAttribute(TERMS_VERSION, terms.version());
        user.setSingleAttribute(PRIVACY_VERSION, privacy.version());
        user.setSingleAttribute(ACCEPTED_AT, Instant.now().toString());
        context.getEvent()
                .detail("legal_terms_version", terms.version())
                .detail("legal_privacy_version", privacy.version());
        log.debugf("User %s accepted terms %s and privacy policy %s", user.getId(), terms.version(), privacy.version());
        context.success();
    }

    /** Page data: the current documents, and whether this user accepted an earlier version (shown as "updated"). */
    private LoginFormsProvider form(RequiredActionContext context) {
        var user = context.getUser();
        return context.form()
                .setAttribute("legalTerms", view(terms, user.getFirstAttribute(TERMS_VERSION)))
                .setAttribute("legalPrivacy", view(privacy, user.getFirstAttribute(PRIVACY_VERSION)));
    }

    private static Map<String, Object> view(LegalDocument document, String acceptedVersion) {
        var view = new LinkedHashMap<String, Object>();
        view.put("title", document.title());
        view.put("version", document.version());
        view.put("effective", document.effective());
        view.put("summary", document.summary());
        view.put("acceptedVersion", acceptedVersion == null ? "" : acceptedVersion);
        view.put("updated", acceptedVersion != null && !acceptedVersion.equals(document.version()));
        return view;
    }

    @Override
    public void close() {
    }
}
