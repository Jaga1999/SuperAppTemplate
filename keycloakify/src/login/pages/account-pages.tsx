import { useLayoutEffect, useState } from 'react'
import { ActionButtons, CheckboxField, Field, FieldError, LogoutOtherSessions, PasswordInput, SubmitButton, TextInput, TextLink } from '../components/kc-ui'
import UserProfileFormFields from '../components/UserProfileFormFields'
import Template from '../Template'
import { type PageProps, SocialProviders } from './shared'

/** register.ftl — declarative user profile, terms, optional reCAPTCHA. */
export function Register({ kcContext, i18n }: PageProps<'register.ftl'>) {
  const { messageHeader, url, messagesPerField, recaptchaRequired, recaptchaVisible, recaptchaSiteKey, recaptchaAction, termsAcceptanceRequired } =
    kcContext
  const { msg, msgStr, advancedMsg } = i18n
  const [submittable, setSubmittable] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)

  useLayoutEffect(() => {
    const w = window as unknown as Record<string, unknown>
    w.onSubmitRecaptcha = () => (document.getElementById('kc-register-form') as HTMLFormElement | null)?.requestSubmit()
    return () => {
      delete w.onSubmitRecaptcha
    }
  }, [])

  const invisibleRecaptcha = recaptchaRequired && !recaptchaVisible && recaptchaAction !== undefined

  return (
    <Template
      kcContext={kcContext}
      i18n={i18n}
      doUseDefaultCss={false}
      headerNode={messageHeader !== undefined ? advancedMsg(messageHeader) : msg('registerTitle')}
      subtitleNode={msg('registerSubtitle')}
      displayMessage={messagesPerField.exists('global')}
      displayInfo
      infoNode={
        <span>
          {msg('alreadyHaveAccount')} <TextLink href={url.loginUrl}>{msg('doLogIn')}</TextLink>
        </span>
      }
    >
      <SocialProviders kcContext={kcContext} i18n={i18n} />
      <form id="kc-register-form" action={url.registrationAction} method="post" className="mt-5 space-y-5">
        <UserProfileFormFields kcContext={kcContext} i18n={i18n} onIsFormSubmittableValueChange={setSubmittable} doMakeUserConfirmPassword />

        {termsAcceptanceRequired && (
          <div className="space-y-2">
            <div className="bg-muted/50 text-muted-foreground max-h-32 overflow-y-auto rounded-lg border p-3 text-xs leading-relaxed">
              <p className="text-foreground mb-1 font-medium">{msg('termsTitle')}</p>
              <div id="kc-registration-terms-text">{msg('termsText')}</div>
            </div>
            <CheckboxField
              id="termsAccepted"
              name="termsAccepted"
              label={msg('termsAcceptLabel')}
              checked={termsAccepted}
              onCheckedChange={setTermsAccepted}
              invalid={messagesPerField.existsError('termsAccepted')}
            />
            <FieldError html={messagesPerField.existsError('termsAccepted') ? messagesPerField.get('termsAccepted') : undefined} />
          </div>
        )}

        {recaptchaRequired && (recaptchaVisible || recaptchaAction === undefined) && (
          <div className="g-recaptcha" data-size="compact" data-sitekey={recaptchaSiteKey} data-action={recaptchaAction} />
        )}

        {invisibleRecaptcha ? (
          <SubmitButton className="g-recaptcha" data-sitekey={recaptchaSiteKey} data-callback="onSubmitRecaptcha" data-action={recaptchaAction}>
            {msg('doRegister')}
          </SubmitButton>
        ) : (
          <SubmitButton disabled={!submittable || (termsAcceptanceRequired && !termsAccepted)}>{msgStr('doRegister')}</SubmitButton>
        )}
      </form>
    </Template>
  )
}

/** login-reset-password.ftl — request a reset link. */
export function LoginResetPassword({ kcContext, i18n }: PageProps<'login-reset-password.ftl'>) {
  const { url, realm, auth, messagesPerField } = kcContext
  const { msg, msgStr } = i18n
  const error = messagesPerField.existsError('username') ? messagesPerField.get('username') : undefined
  return (
    <Template
      kcContext={kcContext}
      i18n={i18n}
      doUseDefaultCss={false}
      headerNode={msg('emailForgotTitle')}
      subtitleNode={realm.duplicateEmailsAllowed ? msg('emailInstructionUsername') : msg('emailForgotSubtitle')}
      displayMessage={!messagesPerField.existsError('username')}
      displayInfo
      infoNode={<TextLink href={url.loginUrl}>← {msg('backToLogin')}</TextLink>}
    >
      <form id="kc-reset-password-form" action={url.loginAction} method="post" className="space-y-4">
        <Field label={realm.loginWithEmailAllowed ? msg('email') : msg('username')} htmlFor="username" error={error}>
          <TextInput id="username" name="username" type="text" autoFocus autoComplete="email" defaultValue={auth.attemptedUsername ?? ''} invalid={!!error} />
        </Field>
        <SubmitButton>{msgStr('doSubmit')}</SubmitButton>
      </form>
    </Template>
  )
}

/** login-update-password.ftl — set a new password (reset link, admin-required, or "Change password" action). */
export function LoginUpdatePassword({ kcContext, i18n }: PageProps<'login-update-password.ftl'>) {
  const { url, messagesPerField, isAppInitiatedAction } = kcContext
  const { msg } = i18n
  const invalid = messagesPerField.existsError('password', 'password-confirm')
  return (
    <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={false} headerNode={msg('updatePasswordTitle')} displayMessage={!invalid}>
      <form id="kc-passwd-update-form" action={url.loginAction} method="post" className="space-y-4">
        <Field label={msg('passwordNew')} htmlFor="password-new" error={messagesPerField.existsError('password') ? messagesPerField.get('password') : undefined}>
          <PasswordInput id="password-new" name="password-new" i18n={i18n} autoFocus autoComplete="new-password" invalid={invalid} />
        </Field>
        <Field
          label={msg('passwordConfirm')}
          htmlFor="password-confirm"
          error={messagesPerField.existsError('password-confirm') ? messagesPerField.get('password-confirm') : undefined}
        >
          <PasswordInput id="password-confirm" name="password-confirm" i18n={i18n} autoComplete="new-password" invalid={invalid} />
        </Field>
        <LogoutOtherSessions i18n={i18n} />
        <ActionButtons i18n={i18n} isAppInitiatedAction={isAppInitiatedAction} />
      </form>
    </Template>
  )
}

/** login-update-profile.ftl — complete or edit the profile. */
export function LoginUpdateProfile({ kcContext, i18n }: PageProps<'login-update-profile.ftl'>) {
  const { url, messagesPerField, isAppInitiatedAction } = kcContext
  const [submittable, setSubmittable] = useState(false)
  return (
    <Template
      kcContext={kcContext}
      i18n={i18n}
      doUseDefaultCss={false}
      headerNode={i18n.msg('loginProfileTitle')}
      displayRequiredFields
      displayMessage={messagesPerField.exists('global')}
    >
      <form id="kc-update-profile-form" action={url.loginAction} method="post" className="space-y-5">
        <UserProfileFormFields kcContext={kcContext} i18n={i18n} onIsFormSubmittableValueChange={setSubmittable} doMakeUserConfirmPassword />
        <ActionButtons i18n={i18n} isAppInitiatedAction={isAppInitiatedAction} disabled={!submittable} />
      </form>
    </Template>
  )
}

/** update-email.ftl — change email (Keycloak verifies the new address). */
export function UpdateEmail({ kcContext, i18n }: PageProps<'update-email.ftl'>) {
  const { url, messagesPerField, isAppInitiatedAction } = kcContext
  const [submittable, setSubmittable] = useState(false)
  return (
    <Template
      kcContext={kcContext}
      i18n={i18n}
      doUseDefaultCss={false}
      headerNode={i18n.msg('updateEmailTitle')}
      displayRequiredFields
      displayMessage={messagesPerField.exists('global')}
    >
      <form id="kc-update-email-form" action={url.loginAction} method="post" className="space-y-5">
        <UserProfileFormFields kcContext={kcContext} i18n={i18n} onIsFormSubmittableValueChange={setSubmittable} doMakeUserConfirmPassword />
        <LogoutOtherSessions i18n={i18n} />
        <ActionButtons i18n={i18n} isAppInitiatedAction={isAppInitiatedAction} disabled={!submittable} />
      </form>
    </Template>
  )
}

/** idp-review-user-profile.ftl — review profile imported from Google on first login. */
export function IdpReviewUserProfile({ kcContext, i18n }: PageProps<'idp-review-user-profile.ftl'>) {
  const { url, messagesPerField } = kcContext
  const [submittable, setSubmittable] = useState(false)
  return (
    <Template
      kcContext={kcContext}
      i18n={i18n}
      doUseDefaultCss={false}
      headerNode={i18n.msg('loginIdpReviewProfileTitle')}
      displayRequiredFields
      displayMessage={messagesPerField.exists('global')}
    >
      <form id="kc-idp-review-profile-form" action={url.loginAction} method="post" className="space-y-5">
        <UserProfileFormFields kcContext={kcContext} i18n={i18n} onIsFormSubmittableValueChange={setSubmittable} doMakeUserConfirmPassword />
        <SubmitButton disabled={!submittable}>{i18n.msgStr('doSubmit')}</SubmitButton>
      </form>
    </Template>
  )
}
