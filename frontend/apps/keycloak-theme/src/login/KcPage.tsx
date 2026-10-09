import type { ClassKey } from 'keycloakify/login'
import DefaultPage from 'keycloakify/login/DefaultPage'
import { lazy, Suspense } from 'react'
import UserProfileFormFields from './components/UserProfileFormFields'
import { useI18n } from './i18n'
import type { KcContext } from './KcContext'
import Template from './Template'

// Every page Keycloak can render is reworked in the SuperApp design. Pages are grouped by area and lazy-loaded.
const loginPages = () => import('./pages/login-pages')
const accountPages = () => import('./pages/account-pages')
const mfaPages = () => import('./pages/mfa-pages')
const messagePages = () => import('./pages/message-pages')
const otherPages = () => import('./pages/other-pages')

const Login = lazy(() => loginPages().then((m) => ({ default: m.Login })))
const LoginUsername = lazy(() => loginPages().then((m) => ({ default: m.LoginUsername })))
const LoginPassword = lazy(() => loginPages().then((m) => ({ default: m.LoginPassword })))
const LoginPasskeysConditionalAuthenticate = lazy(() => loginPages().then((m) => ({ default: m.LoginPasskeysConditionalAuthenticate })))

const Register = lazy(() => accountPages().then((m) => ({ default: m.Register })))
const LoginResetPassword = lazy(() => accountPages().then((m) => ({ default: m.LoginResetPassword })))
const LoginUpdatePassword = lazy(() => accountPages().then((m) => ({ default: m.LoginUpdatePassword })))
const LoginUpdateProfile = lazy(() => accountPages().then((m) => ({ default: m.LoginUpdateProfile })))
const UpdateEmail = lazy(() => accountPages().then((m) => ({ default: m.UpdateEmail })))
const IdpReviewUserProfile = lazy(() => accountPages().then((m) => ({ default: m.IdpReviewUserProfile })))

const LoginOtp = lazy(() => mfaPages().then((m) => ({ default: m.LoginOtp })))
const LoginConfigTotp = lazy(() => mfaPages().then((m) => ({ default: m.LoginConfigTotp })))
const LoginResetOtp = lazy(() => mfaPages().then((m) => ({ default: m.LoginResetOtp })))
const LoginRecoveryAuthnCodeConfig = lazy(() => mfaPages().then((m) => ({ default: m.LoginRecoveryAuthnCodeConfig })))
const LoginRecoveryAuthnCodeInput = lazy(() => mfaPages().then((m) => ({ default: m.LoginRecoveryAuthnCodeInput })))
const WebauthnAuthenticate = lazy(() => mfaPages().then((m) => ({ default: m.WebauthnAuthenticate })))
const WebauthnRegister = lazy(() => mfaPages().then((m) => ({ default: m.WebauthnRegister })))
const WebauthnError = lazy(() => mfaPages().then((m) => ({ default: m.WebauthnError })))
const SelectAuthenticator = lazy(() => mfaPages().then((m) => ({ default: m.SelectAuthenticator })))

const Info = lazy(() => messagePages().then((m) => ({ default: m.Info })))
const ErrorPage = lazy(() => messagePages().then((m) => ({ default: m.ErrorPage })))
const LoginVerifyEmail = lazy(() => messagePages().then((m) => ({ default: m.LoginVerifyEmail })))
const LoginPageExpired = lazy(() => messagePages().then((m) => ({ default: m.LoginPageExpired })))
const LogoutConfirm = lazy(() => messagePages().then((m) => ({ default: m.LogoutConfirm })))
const Terms = lazy(() => messagePages().then((m) => ({ default: m.Terms })))
const LegalConsent = lazy(() => messagePages().then((m) => ({ default: m.LegalConsent })))
const Code = lazy(() => messagePages().then((m) => ({ default: m.Code })))
const FrontchannelLogout = lazy(() => messagePages().then((m) => ({ default: m.FrontchannelLogout })))
const SamlPostForm = lazy(() => messagePages().then((m) => ({ default: m.SamlPostForm })))

const LoginIdpLinkConfirm = lazy(() => otherPages().then((m) => ({ default: m.LoginIdpLinkConfirm })))
const LoginIdpLinkConfirmOverride = lazy(() => otherPages().then((m) => ({ default: m.LoginIdpLinkConfirmOverride })))
const LoginIdpLinkEmail = lazy(() => otherPages().then((m) => ({ default: m.LoginIdpLinkEmail })))
const LinkIdpAction = lazy(() => otherPages().then((m) => ({ default: m.LinkIdpAction })))
const DeleteCredential = lazy(() => otherPages().then((m) => ({ default: m.DeleteCredential })))
const DeleteAccountConfirm = lazy(() => otherPages().then((m) => ({ default: m.DeleteAccountConfirm })))
const LoginX509Info = lazy(() => otherPages().then((m) => ({ default: m.LoginX509Info })))
const LoginOauthGrant = lazy(() => otherPages().then((m) => ({ default: m.LoginOauthGrant })))
const LoginOauth2DeviceVerifyUserCode = lazy(() => otherPages().then((m) => ({ default: m.LoginOauth2DeviceVerifyUserCode })))
const SelectOrganization = lazy(() => otherPages().then((m) => ({ default: m.SelectOrganization })))

/**
 * Tailwind classes for Keycloak's kc* class keys. Only used by the fallback below, i.e. for a page id that a
 * future Keycloak/Keycloakify version introduces before it gets a hand-built page here.
 */
const fallbackClasses = {
  kcFormGroupClass: 'grid gap-2 mb-4',
  kcLabelClass: 'text-sm font-medium',
  kcInputClass:
    'border-input bg-background h-10 w-full rounded-lg border px-3 text-[0.95rem] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30',
  kcInputErrorMessageClass: 'text-destructive text-xs font-medium',
  kcButtonClass: 'inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold transition-colors',
  kcButtonPrimaryClass: 'bg-primary text-primary-foreground hover:bg-primary/90',
  kcButtonDefaultClass: 'border bg-background hover:bg-muted',
  kcButtonBlockClass: 'w-full',
  kcFormButtonsClass: 'grid gap-2.5',
} satisfies { [key in ClassKey]?: string }

export default function KcPage({ kcContext }: { kcContext: KcContext }) {
  const { i18n } = useI18n({ kcContext })
  const props = { i18n } as const

  return (
    <Suspense fallback={<div className="bg-background min-h-svh" />}>
      {(() => {
        switch (kcContext.pageId) {
          case 'login.ftl': return <Login kcContext={kcContext} {...props} />
          case 'login-username.ftl': return <LoginUsername kcContext={kcContext} {...props} />
          case 'login-password.ftl': return <LoginPassword kcContext={kcContext} {...props} />
          case 'login-passkeys-conditional-authenticate.ftl': return <LoginPasskeysConditionalAuthenticate kcContext={kcContext} {...props} />
          case 'register.ftl': return <Register kcContext={kcContext} {...props} />
          case 'login-reset-password.ftl': return <LoginResetPassword kcContext={kcContext} {...props} />
          case 'login-update-password.ftl': return <LoginUpdatePassword kcContext={kcContext} {...props} />
          case 'login-update-profile.ftl': return <LoginUpdateProfile kcContext={kcContext} {...props} />
          case 'update-email.ftl': return <UpdateEmail kcContext={kcContext} {...props} />
          case 'idp-review-user-profile.ftl': return <IdpReviewUserProfile kcContext={kcContext} {...props} />
          case 'login-otp.ftl': return <LoginOtp kcContext={kcContext} {...props} />
          case 'login-config-totp.ftl': return <LoginConfigTotp kcContext={kcContext} {...props} />
          case 'login-reset-otp.ftl': return <LoginResetOtp kcContext={kcContext} {...props} />
          case 'login-recovery-authn-code-config.ftl': return <LoginRecoveryAuthnCodeConfig kcContext={kcContext} {...props} />
          case 'login-recovery-authn-code-input.ftl': return <LoginRecoveryAuthnCodeInput kcContext={kcContext} {...props} />
          case 'webauthn-authenticate.ftl': return <WebauthnAuthenticate kcContext={kcContext} {...props} />
          case 'webauthn-register.ftl': return <WebauthnRegister kcContext={kcContext} {...props} />
          case 'webauthn-error.ftl': return <WebauthnError kcContext={kcContext} {...props} />
          case 'select-authenticator.ftl': return <SelectAuthenticator kcContext={kcContext} {...props} />
          case 'info.ftl': return <Info kcContext={kcContext} {...props} />
          case 'error.ftl': return <ErrorPage kcContext={kcContext} {...props} />
          case 'login-verify-email.ftl': return <LoginVerifyEmail kcContext={kcContext} {...props} />
          case 'login-page-expired.ftl': return <LoginPageExpired kcContext={kcContext} {...props} />
          case 'logout-confirm.ftl': return <LogoutConfirm kcContext={kcContext} {...props} />
          case 'terms.ftl': return <Terms kcContext={kcContext} {...props} />
          case 'legal-consent.ftl': return <LegalConsent kcContext={kcContext} {...props} />
          case 'code.ftl': return <Code kcContext={kcContext} {...props} />
          case 'frontchannel-logout.ftl': return <FrontchannelLogout kcContext={kcContext} {...props} />
          case 'saml-post-form.ftl': return <SamlPostForm kcContext={kcContext} {...props} />
          case 'login-idp-link-confirm.ftl': return <LoginIdpLinkConfirm kcContext={kcContext} {...props} />
          case 'login-idp-link-confirm-override.ftl': return <LoginIdpLinkConfirmOverride kcContext={kcContext} {...props} />
          case 'login-idp-link-email.ftl': return <LoginIdpLinkEmail kcContext={kcContext} {...props} />
          case 'link-idp-action.ftl': return <LinkIdpAction kcContext={kcContext} {...props} />
          case 'delete-credential.ftl': return <DeleteCredential kcContext={kcContext} {...props} />
          case 'delete-account-confirm.ftl': return <DeleteAccountConfirm kcContext={kcContext} {...props} />
          case 'login-x509-info.ftl': return <LoginX509Info kcContext={kcContext} {...props} />
          case 'login-oauth-grant.ftl': return <LoginOauthGrant kcContext={kcContext} {...props} />
          case 'login-oauth2-device-verify-user-code.ftl': return <LoginOauth2DeviceVerifyUserCode kcContext={kcContext} {...props} />
          case 'select-organization.ftl': return <SelectOrganization kcContext={kcContext} {...props} />
          default:
            return (
              <DefaultPage
                // Only standard Keycloak pages reach the fallback (custom pages are all mapped above).
                kcContext={kcContext as Parameters<typeof DefaultPage>[0]['kcContext']}
                i18n={i18n}
                classes={fallbackClasses}
                Template={Template}
                doUseDefaultCss={false}
                UserProfileFormFields={UserProfileFormFields as never}
                doMakeUserConfirmPassword
              />
            )
        }
      })()}
    </Suspense>
  )
}
