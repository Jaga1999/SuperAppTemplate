import { i18nBuilder } from 'keycloakify/login'
import type { ThemeName } from '../kc.gen'

/**
 * Keycloak's message bundle, with SuperApp's voice layered on top.
 * Any key from Keycloak's messages can be overridden here; new keys can be added and used via msg()/msgStr().
 * @see https://docs.keycloakify.dev/features/i18n
 */
const { useI18n, ofTypeI18n } = i18nBuilder
  .withThemeName<ThemeName>()
  .withCustomTranslations({
    en: {
      loginAccountTitle: 'Welcome back',
      loginAccountSubtitle: 'Sign in to pick up where you left off.',
      registerTitle: 'Create your account',
      registerSubtitle: 'Free forever for personal use. No credit card needed.',
      emailForgotTitle: 'Reset your password',
      emailForgotSubtitle: "Enter your email and we'll send you a link to choose a new password.",
      updatePasswordTitle: 'Choose a new password',
      emailVerifyTitle: 'Check your inbox',
      loginTotpTitle: 'Set up two-step verification',
      'webauthn-registration-title': 'Add a passkey',
      'passkey-login-title': 'Sign in with a passkey',
      doLogIn: 'Sign in',
      doRegister: 'Create account',
      noAccount: "Don't have an account?",
      backToLogin: 'Back to sign in',
      doForgotPassword: 'Forgot password?',
      rememberMe: 'Keep me signed in',
      'identity-provider-login-label': 'or continue with',
      'passkey-doAuthenticate': 'Sign in with a passkey',
      continueWithGoogle: 'Continue with Google',
      orUseEmail: 'or use your email',
      alreadyHaveAccount: 'Already have an account?',
      backToApp: 'Back to SuperApp',
      brandHeadline: 'Secure from the first sign-in.',
      brandSubline: 'Passwordless sign-in, two-step verification and full control over every device you use.',
      brandPoint1: 'Passkeys & two-step verification',
      brandPoint2: 'Sign out of every device instantly',
      brandPoint3: 'Your account, your data: delete it anytime',
      securedBy: 'Secured sign-in',
      otpCodeLabel: 'Authentication code',
      otpCodeHelp: 'Open your authenticator app and enter the 6-digit code.',
      termsAcceptLabel: 'I agree to the Terms of Service and Privacy Policy',
      termsTitle: 'Terms of Service',
      termsText:
        '<p>SuperApp is a template app. By continuing you agree to use it lawfully and to keep your sign-in methods to yourself.</p>' +
        '<p>We store only what the app needs to work: your name and email. You can delete your account at any time from Settings.</p>' +
        '<p>Replace this text with your real Terms of Service and Privacy Policy before going live.</p>',
      updatePasswordMessage: 'Set a password to continue.',
      legalConsentTitle: 'Review and accept',
      legalConsentSubtitle: 'Please read and accept our Terms and Conditions and Privacy Policy to continue.',
      legalConsentUpdatedTitle: 'We updated our terms',
      legalConsentUpdatedSubtitle: "Please review what changed and accept to continue. You'll only be asked again if they change.",
      legalUpdatedBadge: 'Updated',
      legalRead: 'Read',
      legalEffectiveVersion: 'Effective {0} · Version {1}',
      legalVersion: 'Version {0}',
      legalAcceptTerms: 'I accept the Terms and Conditions',
      legalAcceptPrivacy: 'I accept the Privacy Policy',
      legalConsentBothRequired: 'Accept both documents to continue.',
      legalDeclineHint: "If you decline, you'll be signed out. You can delete your account from Settings at any time.",

      // Passkey errors: short, plain, and always say what to do next.
      'webauthn-error-title': "Passkey didn't work",
      'webauthn-error-api-not-allowed': 'Passkey request was cancelled or timed out. Try again, or sign in with your password.',
      'webauthn-error-api-get': "We couldn't verify your passkey. Try again, or sign in with your password.",
      'webauthn-error-api-security': 'Passkeys only work on the SuperApp site. Check the address and try again.',
      'webauthn-error-api-invalid-state': 'This passkey is already saved to your account.',
      'webauthn-error-registration': "We couldn't save your passkey. Please try again.",
      'webauthn-error-user-not-found': 'No account uses this passkey. Sign in with your password, then add a new one.',
      'webauthn-error-different-user': 'This passkey belongs to a different account.',
      'webauthn-error-auth-verification': 'Passkey check failed. Please try again.',
      'webauthn-error-register-verification': 'Passkey setup failed. Please try again.',
      'webauthn-error-bad-challenge': 'This sign-in request expired. Please try again.',
      'webauthn-error-user-not-present': 'Confirm on your device to continue.',
      'webauthn-error-user-not-verified': 'Unlock your device (PIN, fingerprint or face) to use your passkey.',
      'passkey-unsupported-browser-text': "This browser doesn't support passkeys. Sign in with your password instead.",
    },
  })
  .build()

type I18n = typeof ofTypeI18n

export { type I18n, useI18n }
