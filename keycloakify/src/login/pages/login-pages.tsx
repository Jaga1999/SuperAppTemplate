import { useScript as useLoginScript } from 'keycloakify/login/pages/Login.useScript'
import { useScript as usePasskeyScript } from 'keycloakify/login/pages/LoginPasskeysConditionalAuthenticate.useScript'
import { useScript as usePasswordScript } from 'keycloakify/login/pages/LoginPassword.useScript'
import { useScript as useUsernameScript } from 'keycloakify/login/pages/LoginUsername.useScript'
import { FingerprintIcon, KeyRoundIcon } from 'lucide-react'
import { useState } from 'react'
import { CheckboxField, Divider, Field, PasswordInput, SubmitButton, TextInput, TextLink } from '../components/kc-ui'
import Template from '../Template'
import { PasskeyConditionalUi, type PageProps, RegisterLink, SocialProviders, WebauthnHiddenForm } from './shared'
import { usernameLabel } from './labels'

const PASSKEY_BUTTON = 'authenticateWebAuthnButton'

/** login.ftl — email + password, Google, passkeys (conditional UI), remember me, forgot password. */
export function Login({ kcContext, i18n }: PageProps<'login.ftl'>) {
  const { realm, url, usernameHidden, login, auth, registrationDisabled, messagesPerField, enableWebAuthnConditionalUI, authenticators } =
    kcContext
  const { msg, msgStr } = i18n
  const [submitting, setSubmitting] = useState(false)
  useLoginScript({ webAuthnButtonId: PASSKEY_BUTTON, kcContext, i18n })

  const credentialsError = messagesPerField.existsError('username', 'password')
    ? messagesPerField.getFirstError('username', 'password')
    : undefined

  return (
    <Template
      kcContext={kcContext}
      i18n={i18n}
      doUseDefaultCss={false}
      headerNode={msg('loginAccountTitle')}
      subtitleNode={msg('loginAccountSubtitle')}
      displayMessage={!messagesPerField.existsError('username', 'password')}
      displayInfo={realm.password && realm.registrationAllowed && !registrationDisabled}
      infoNode={<RegisterLink i18n={i18n} href={url.registrationUrl} />}
    >
      <div className="space-y-5">
        {realm.password && <SocialProviders kcContext={kcContext} i18n={i18n} />}

        {realm.password && (
          <form
            id="kc-form-login"
            action={url.loginAction}
            method="post"
            className="space-y-4"
            onSubmit={() => {
              setSubmitting(true)
              return true
            }}
          >
            {!usernameHidden && (
              <Field label={usernameLabel(kcContext, i18n)} htmlFor="username" error={credentialsError}>
                <TextInput
                  id="username"
                  name="username"
                  type="text"
                  inputMode="email"
                  defaultValue={login.username ?? ''}
                  autoFocus
                  // Passkeys open only from the button (realm mediation = none), never from autofill on focus.
                  autoComplete="username"
                  invalid={!!credentialsError}
                />
              </Field>
            )}
            <Field
              label={msg('password')}
              htmlFor="password"
              error={usernameHidden ? credentialsError : undefined}
              aside={realm.resetPasswordAllowed && <TextLink href={url.loginResetCredentialsUrl} tabIndex={6} className="text-xs">{msg('doForgotPassword')}</TextLink>}
            >
              <PasswordInput id="password" name="password" i18n={i18n} autoComplete="current-password" invalid={!!credentialsError} />
            </Field>
            {realm.rememberMe && !usernameHidden && (
              <CheckboxField id="rememberMe" name="rememberMe" label={msg('rememberMe')} defaultChecked={!!login.rememberMe} />
            )}
            <input type="hidden" id="id-hidden-input" name="credentialId" value={auth.selectedCredential ?? ''} />
            <SubmitButton id="kc-login" name="login" disabled={submitting}>
              {msgStr('doLogIn')}
            </SubmitButton>
          </form>
        )}

        {enableWebAuthnConditionalUI && (
          <>
            <Divider>or</Divider>
            <PasskeyConditionalUi kcContext={kcContext} i18n={i18n} buttonId={PASSKEY_BUTTON} authenticators={authenticators} />
          </>
        )}
      </div>
    </Template>
  )
}

/** login-username.ftl — identifier-first step. */
export function LoginUsername({ kcContext, i18n }: PageProps<'login-username.ftl'>) {
  const { realm, url, usernameHidden, login, registrationDisabled, messagesPerField, enableWebAuthnConditionalUI, authenticators } = kcContext
  const { msg, msgStr } = i18n
  const [submitting, setSubmitting] = useState(false)
  useUsernameScript({ webAuthnButtonId: PASSKEY_BUTTON, kcContext, i18n })
  const error = messagesPerField.existsError('username') ? messagesPerField.getFirstError('username') : undefined

  return (
    <Template
      kcContext={kcContext}
      i18n={i18n}
      doUseDefaultCss={false}
      headerNode={msg('loginAccountTitle')}
      subtitleNode={msg('loginAccountSubtitle')}
      displayMessage={!messagesPerField.existsError('username')}
      displayInfo={realm.password && realm.registrationAllowed && !registrationDisabled}
      infoNode={<RegisterLink i18n={i18n} href={url.registrationUrl} />}
    >
      <div className="space-y-5">
        {realm.password && <SocialProviders kcContext={kcContext} i18n={i18n} />}
        {realm.password && (
          <form id="kc-form-login" action={url.loginAction} method="post" className="space-y-4" onSubmit={() => setSubmitting(true)}>
            {!usernameHidden && (
              <Field label={usernameLabel(kcContext, i18n)} htmlFor="username" error={error}>
                <TextInput
                  id="username"
                  name="username"
                  defaultValue={login.username ?? ''}
                  autoFocus
                  autoComplete={enableWebAuthnConditionalUI ? 'username webauthn' : 'username'}
                  invalid={!!error}
                />
              </Field>
            )}
            {realm.rememberMe && !usernameHidden && (
              <CheckboxField id="rememberMe" name="rememberMe" label={msg('rememberMe')} defaultChecked={!!login.rememberMe} />
            )}
            <SubmitButton id="kc-login" name="login" disabled={submitting}>
              {msgStr('doContinue')}
            </SubmitButton>
          </form>
        )}
        {enableWebAuthnConditionalUI && (
          <>
            <Divider>or</Divider>
            <PasskeyConditionalUi kcContext={kcContext} i18n={i18n} buttonId={PASSKEY_BUTTON} authenticators={authenticators} />
          </>
        )}
      </div>
    </Template>
  )
}

/** login-password.ftl — password step after identifier-first. */
export function LoginPassword({ kcContext, i18n }: PageProps<'login-password.ftl'>) {
  const { realm, url, messagesPerField, enableWebAuthnConditionalUI, authenticators } = kcContext
  const { msg, msgStr } = i18n
  const [submitting, setSubmitting] = useState(false)
  usePasswordScript({ webAuthnButtonId: PASSKEY_BUTTON, kcContext, i18n })
  const error = messagesPerField.existsError('password') ? messagesPerField.get('password') : undefined

  return (
    <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={false} headerNode={msg('doLogIn')} displayMessage={!messagesPerField.existsError('password')}>
      <div className="space-y-5">
        <form id="kc-form-login" action={url.loginAction} method="post" className="space-y-4" onSubmit={() => setSubmitting(true)}>
          <Field
            label={msg('password')}
            htmlFor="password"
            error={error}
            aside={realm.resetPasswordAllowed && <TextLink href={url.loginResetCredentialsUrl} className="text-xs">{msg('doForgotPassword')}</TextLink>}
          >
            <PasswordInput id="password" name="password" i18n={i18n} autoFocus autoComplete="current-password" invalid={!!error} />
          </Field>
          <SubmitButton id="kc-login" name="login" disabled={submitting}>
            {msgStr('doLogIn')}
          </SubmitButton>
        </form>
        {enableWebAuthnConditionalUI && (
          <>
            <Divider>or</Divider>
            <PasskeyConditionalUi kcContext={kcContext} i18n={i18n} buttonId={PASSKEY_BUTTON} authenticators={authenticators} />
          </>
        )}
      </div>
    </Template>
  )
}

/** login-passkeys-conditional-authenticate.ftl — passkey-first sign-in (the script toggles the hidden parts). */
export function LoginPasskeysConditionalAuthenticate({ kcContext, i18n }: PageProps<'login-passkeys-conditional-authenticate.ftl'>) {
  const { messagesPerField, login, url, usernameHidden, shouldDisplayAuthenticators, authenticators, registrationDisabled, realm } = kcContext
  const { msg, msgStr, advancedMsg } = i18n
  usePasskeyScript({ authButtonId: PASSKEY_BUTTON, kcContext, i18n })

  return (
    <Template
      kcContext={kcContext}
      i18n={i18n}
      doUseDefaultCss={false}
      headerNode={msg('passkey-login-title')}
      displayInfo={realm.registrationAllowed && !registrationDisabled}
      infoNode={<RegisterLink i18n={i18n} href={url.registrationUrl} />}
    >
      <div className="space-y-5">
        <div className="bg-primary/8 text-primary mx-auto flex size-14 items-center justify-center rounded-2xl">
          <FingerprintIcon className="size-7" />
        </div>
        <WebauthnHiddenForm action={url.loginAction} />
        {authenticators !== undefined && Object.keys(authenticators).length !== 0 && (
          <>
            <form id="authn_select">
              {authenticators.authenticators.map((a, i) => (
                <input key={i} type="hidden" name="authn_use_chk" readOnly value={a.credentialId} />
              ))}
            </form>
            {shouldDisplayAuthenticators && (
              <div className="space-y-2">
                {authenticators.authenticators.length > 1 && (
                  <p className="text-muted-foreground text-xs font-medium">{msg('passkey-available-authenticators')}</p>
                )}
                {authenticators.authenticators.map((a, i) => (
                  <div key={i} id={`kc-webauthn-authenticator-item-${i}`} className="flex items-center gap-3 rounded-xl border p-3">
                    <span className="bg-muted flex size-9 items-center justify-center rounded-lg">
                      <KeyRoundIcon className="size-4" />
                    </span>
                    <div className="min-w-0 text-sm">
                      <p id={`kc-webauthn-authenticator-label-${i}`} className="truncate font-medium">{advancedMsg(a.label)}</p>
                      <p className="text-muted-foreground text-xs">
                        <span id={`kc-webauthn-authenticator-createdlabel-${i}`}>{msg('passkey-createdAt-label')}</span>{' '}
                        <span id={`kc-webauthn-authenticator-created-${i}`}>{a.createdAt}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {realm.password && (
          <form id="kc-form-login" action={url.loginAction} method="post" style={{ display: 'none' }} className="space-y-4">
            {!usernameHidden && (
              <Field label={msg('passkey-autofill-select')} htmlFor="username" error={messagesPerField.existsError('username') ? messagesPerField.get('username') : undefined}>
                <TextInput id="username" name="username" defaultValue={login.username ?? ''} autoComplete="username webauthn" autoFocus invalid={messagesPerField.existsError('username')} />
              </Field>
            )}
          </form>
        )}
        <div id="kc-form-passkey-button" style={{ display: 'none' }}>
          <SubmitButton id={PASSKEY_BUTTON} type="button" className="gap-2">
            <FingerprintIcon />
            {msgStr('passkey-doAuthenticate')}
          </SubmitButton>
        </div>
      </div>
    </Template>
  )
}
