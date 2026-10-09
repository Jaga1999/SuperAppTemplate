import { REGEXP_ONLY_DIGITS } from 'input-otp'
import { useScript as useRecoveryCodesScript } from 'keycloakify/login/pages/LoginRecoveryAuthnCodeConfig.useScript'
import { useScript as useWebauthnAuthenticateScript } from 'keycloakify/login/pages/WebauthnAuthenticate.useScript'
import { useScript as useWebauthnRegisterScript } from 'keycloakify/login/pages/WebauthnRegister.useScript'
import {
  ChevronRightIcon,
  CopyIcon,
  DownloadIcon,
  FingerprintIcon,
  KeyRoundIcon,
  ListIcon,
  LockOpenIcon,
  PrinterIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  TriangleAlertIcon,
  UsbIcon,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp'
import { ActionButtons, CheckboxField, Field, FieldError, LogoutOtherSessions, Prose, SecondaryButton, SubmitButton, TextInput } from '../components/kc-ui'
import Template from '../Template'
import { ChoiceCard, type PageProps, RegisterLink, WebauthnHiddenForm } from './shared'

const AUTH_BUTTON = 'authenticateWebAuthnButton'

function OtpCodeInput({ id, name, digits = 6, invalid }: { id: string; name: string; digits?: number; invalid?: boolean }) {
  const half = Math.ceil(digits / 2)
  return (
    <InputOTP id={id} name={name} maxLength={digits} pattern={REGEXP_ONLY_DIGITS} autoFocus autoComplete="one-time-code" inputMode="numeric" aria-invalid={invalid || undefined} containerClassName="justify-center">
      <InputOTPGroup>
        {Array.from({ length: half }, (_, i) => (
          <InputOTPSlot key={i} index={i} className="size-11 text-lg" />
        ))}
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        {Array.from({ length: digits - half }, (_, i) => (
          <InputOTPSlot key={i + half} index={i + half} className="size-11 text-lg" />
        ))}
      </InputOTPGroup>
    </InputOTP>
  )
}

function PageIcon({ children }: { children: ReactNode }) {
  return <div className="bg-primary/8 text-primary mb-1 flex size-12 items-center justify-center rounded-2xl [&_svg]:size-6">{children}</div>
}

/** login-otp.ftl — second factor: authenticator app code. */
export function LoginOtp({ kcContext, i18n }: PageProps<'login-otp.ftl'>) {
  const { otpLogin, url, messagesPerField } = kcContext
  const { msg, msgStr } = i18n
  const [submitting, setSubmitting] = useState(false)
  const error = messagesPerField.existsError('totp') ? messagesPerField.get('totp') : undefined
  return (
    <Template
      kcContext={kcContext}
      i18n={i18n}
      doUseDefaultCss={false}
      headerNode={msg('otpCodeLabel')}
      subtitleNode={msg('otpCodeHelp')}
      displayMessage={!messagesPerField.existsError('totp')}
    >
      <form id="kc-otp-login-form" action={url.loginAction} method="post" className="space-y-5" onSubmit={() => setSubmitting(true)}>
        {otpLogin.userOtpCredentials.length > 1 && (
          <div className="grid gap-2">
            {otpLogin.userOtpCredentials.map((c, i) => (
              <ChoiceCard
                key={c.id}
                id={`kc-otp-credential-${i}`}
                name="selectedCredentialId"
                value={c.id}
                defaultChecked={c.id === otpLogin.selectedCredentialId}
                icon={<SmartphoneIcon />}
                title={c.userLabel}
              />
            ))}
          </div>
        )}
        <div className="space-y-2">
          <OtpCodeInput id="otp" name="otp" invalid={!!error} />
          <FieldError id="input-error-otp-code" html={error} />
        </div>
        <SubmitButton id="kc-login" name="login" disabled={submitting}>
          {msgStr('doLogIn')}
        </SubmitButton>
      </form>
    </Template>
  )
}

/** login-config-totp.ftl — set up an authenticator app (QR or manual key). */
export function LoginConfigTotp({ kcContext, i18n }: PageProps<'login-config-totp.ftl'>) {
  const { url, isAppInitiatedAction, totp, mode, messagesPerField } = kcContext
  const { msg, advancedMsg } = i18n
  const totpError = messagesPerField.existsError('totp') ? messagesPerField.get('totp') : undefined
  const labelError = messagesPerField.existsError('userLabel') ? messagesPerField.get('userLabel') : undefined

  return (
    <Template
      kcContext={kcContext}
      i18n={i18n}
      doUseDefaultCss={false}
      headerNode={msg('loginTotpTitle')}
      displayMessage={!messagesPerField.existsError('totp', 'userLabel')}
    >
      <div className="space-y-6">
        <ol id="kc-totp-settings" className="space-y-5">
          <Step n={1}>
            <p>{msg('loginTotpStep1')}</p>
            <ul id="kc-totp-supported-apps" className="mt-2 flex flex-wrap gap-1.5">
              {totp.supportedApplications.map((app) => (
                <li key={app} className="bg-muted rounded-full px-2.5 py-0.5 text-xs font-medium">
                  {advancedMsg(app)}
                </li>
              ))}
            </ul>
          </Step>
          {mode === 'manual' ? (
            <>
              <Step n={2}>
                <p>{msg('loginTotpManualStep2')}</p>
                <code id="kc-totp-secret-key" className="bg-muted mt-2 block rounded-lg px-3 py-2 font-mono text-sm tracking-wider break-all">
                  {totp.totpSecretEncoded}
                </code>
                <a href={totp.qrUrl} id="mode-barcode" className="text-primary mt-2 inline-block text-xs font-medium hover:underline">
                  {msg('loginTotpScanBarcode')}
                </a>
              </Step>
              <Step n={3}>
                <p>{msg('loginTotpManualStep3')}</p>
                <dl className="text-muted-foreground mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <dt>{msg('loginTotpType')}</dt>
                  <dd id="kc-totp-type" className="text-foreground">{msg(`loginTotp.${totp.policy.type}`)}</dd>
                  <dt>{msg('loginTotpAlgorithm')}</dt>
                  <dd id="kc-totp-algorithm" className="text-foreground">{totp.policy.getAlgorithmKey()}</dd>
                  <dt>{msg('loginTotpDigits')}</dt>
                  <dd id="kc-totp-digits" className="text-foreground">{totp.policy.digits}</dd>
                  {totp.policy.type === 'totp' ? (
                    <>
                      <dt>{msg('loginTotpInterval')}</dt>
                      <dd id="kc-totp-period" className="text-foreground">{totp.policy.period}</dd>
                    </>
                  ) : (
                    <>
                      <dt>{msg('loginTotpCounter')}</dt>
                      <dd id="kc-totp-counter" className="text-foreground">{totp.policy.initialCounter}</dd>
                    </>
                  )}
                </dl>
              </Step>
            </>
          ) : (
            <Step n={2}>
              <p>{msg('loginTotpStep2')}</p>
              <div className="mt-3 inline-block rounded-xl border bg-white p-2.5 shadow-xs">
                <img id="kc-totp-secret-qr-code" src={`data:image/png;base64, ${totp.totpSecretQrCode}`} alt="QR code for your authenticator app" className="size-40" />
              </div>
              <a href={totp.manualUrl} id="mode-manual" className="text-primary mt-2 block text-xs font-medium hover:underline">
                {msg('loginTotpUnableToScan')}
              </a>
            </Step>
          )}
          <Step n={mode === 'manual' ? 4 : 3}>
            <p>{msg('loginTotpStep3')}</p>
          </Step>
        </ol>

        <form id="kc-totp-settings-form" action={url.loginAction} method="post" className="space-y-4">
          <Field label={msg('authenticatorCode')} error={totpError} htmlFor="totp">
            <OtpCodeInput id="totp" name="totp" digits={totp.policy.digits} invalid={!!totpError} />
          </Field>
          <input type="hidden" id="totpSecret" name="totpSecret" value={totp.totpSecret} />
          {mode && <input type="hidden" id="mode" value={mode} />}
          <Field label={msg('loginTotpDeviceName')} htmlFor="userLabel" error={labelError} hint={msg('loginTotpStep3DeviceName')}>
            <TextInput id="userLabel" name="userLabel" autoComplete="off" placeholder="e.g. My phone" required={totp.otpCredentials.length >= 1} invalid={!!labelError} />
          </Field>
          <LogoutOtherSessions i18n={i18n} />
          <ActionButtons i18n={i18n} isAppInitiatedAction={isAppInitiatedAction} submitId="saveTOTPBtn" />
        </form>
      </div>
    </Template>
  )
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3.5">
      <span className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">{n}</span>
      <div className="text-muted-foreground min-w-0 flex-1 pt-0.5 text-sm leading-relaxed [&>p:first-child]:text-foreground">{children}</div>
    </li>
  )
}

/** login-reset-otp.ftl — choose which authenticator to reset. */
export function LoginResetOtp({ kcContext, i18n }: PageProps<'login-reset-otp.ftl'>) {
  const { url, messagesPerField, configuredOtpCredentials } = kcContext
  const { msg, msgStr } = i18n
  return (
    <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={false} headerNode={msg('doLogIn')} displayMessage={!messagesPerField.existsError('totp')}>
      <form id="kc-otp-reset-form" action={url.loginAction} method="post" className="space-y-4">
        <p id="kc-otp-reset-form-description" className="text-muted-foreground text-sm">{msg('otp-reset-description')}</p>
        <div className="grid gap-2">
          {configuredOtpCredentials.userOtpCredentials.map((c, i) => (
            <ChoiceCard
              key={c.id}
              id={`kc-otp-credential-${i}`}
              name="selectedCredentialId"
              value={c.id}
              defaultChecked={c.id === configuredOtpCredentials.selectedCredentialId}
              icon={<SmartphoneIcon />}
              title={c.userLabel}
            />
          ))}
        </div>
        <SubmitButton id="kc-otp-reset-form-submit">{msgStr('doSubmit')}</SubmitButton>
      </form>
    </Template>
  )
}

/** login-recovery-authn-code-config.ftl — show and confirm one-time recovery codes. */
export function LoginRecoveryAuthnCodeConfig({ kcContext, i18n }: PageProps<'login-recovery-authn-code-config.ftl'>) {
  const { recoveryAuthnCodesConfigBean, isAppInitiatedAction, url } = kcContext
  const { msg, msgStr } = i18n
  const [confirmed, setConfirmed] = useState(false)
  useRecoveryCodesScript({ olRecoveryCodesListId: 'kc-recovery-codes-list', i18n })

  return (
    <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={false} headerNode={msg('recovery-code-config-header')}>
      <div className="space-y-5">
        <Alert className="border-warning/40 bg-warning/10 [&>svg]:text-warning">
          <TriangleAlertIcon />
          <AlertTitle>{msg('recovery-code-config-warning-title')}</AlertTitle>
          <AlertDescription>{msg('recovery-code-config-warning-message')}</AlertDescription>
        </Alert>
        <ol id="kc-recovery-codes-list" className="bg-muted/50 grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl border p-4 font-mono text-sm">
          {recoveryAuthnCodesConfigBean.generatedRecoveryAuthnCodesList.map((code, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-muted-foreground w-5 text-right">{i + 1}:</span>
              <span className="tracking-wide">
                {code.slice(0, 4)}-{code.slice(4, 8)}-{code.slice(8)}
              </span>
            </li>
          ))}
        </ol>
        <div className="grid grid-cols-3 gap-2">
          <Button id="printRecoveryCodes" type="button" variant="outline" size="sm"><PrinterIcon />{msg('recovery-codes-print')}</Button>
          <Button id="downloadRecoveryCodes" type="button" variant="outline" size="sm"><DownloadIcon />{msg('recovery-codes-download')}</Button>
          <Button id="copyRecoveryCodes" type="button" variant="outline" size="sm"><CopyIcon />{msg('recovery-codes-copy')}</Button>
        </div>
        <CheckboxField
          id="kcRecoveryCodesConfirmationCheck"
          name="kcRecoveryCodesConfirmationCheck"
          label={msg('recovery-codes-confirmation-message')}
          checked={confirmed}
          onCheckedChange={setConfirmed}
        />
        <form action={url.loginAction} id="kc-recovery-codes-settings-form" method="post" className="space-y-4">
          <input type="hidden" name="generatedRecoveryAuthnCodes" value={recoveryAuthnCodesConfigBean.generatedRecoveryAuthnCodesAsString} />
          <input type="hidden" name="generatedAt" value={recoveryAuthnCodesConfigBean.generatedAt} />
          <input type="hidden" id="userLabel" name="userLabel" value={msgStr('recovery-codes-label-default')} />
          <LogoutOtherSessions i18n={i18n} />
          <ActionButtons
            i18n={i18n}
            isAppInitiatedAction={isAppInitiatedAction}
            disabled={!confirmed}
            submitId="saveRecoveryAuthnCodesBtn"
            submitLabel={msgStr('recovery-codes-action-complete')}
          />
        </form>
      </div>
    </Template>
  )
}

/** login-recovery-authn-code-input.ftl — sign in with a recovery code. */
export function LoginRecoveryAuthnCodeInput({ kcContext, i18n }: PageProps<'login-recovery-authn-code-input.ftl'>) {
  const { url, messagesPerField, recoveryAuthnCodesInputBean } = kcContext
  const { msg, msgStr } = i18n
  const error = messagesPerField.existsError('recoveryCodeInput') ? messagesPerField.get('recoveryCodeInput') : undefined
  return (
    <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={false} headerNode={msg('auth-recovery-code-header')} displayMessage={!error}>
      <form id="kc-recovery-code-login-form" action={url.loginAction} method="post" className="space-y-4">
        <Field label={msg('auth-recovery-code-prompt', `${recoveryAuthnCodesInputBean.codeNumber}`)} htmlFor="recoveryCodeInput" error={error}>
          <TextInput id="recoveryCodeInput" name="recoveryCodeInput" autoComplete="off" autoFocus className="font-mono tracking-wider" invalid={!!error} />
        </Field>
        <SubmitButton id="kc-login" name="login">{msgStr('doLogIn')}</SubmitButton>
      </form>
    </Template>
  )
}

/** webauthn-authenticate.ftl — use a security key / passkey as second factor or passwordless. */
export function WebauthnAuthenticate({ kcContext, i18n }: PageProps<'webauthn-authenticate.ftl'>) {
  const { url, realm, registrationDisabled, authenticators, shouldDisplayAuthenticators } = kcContext
  const { msg, msgStr, advancedMsg } = i18n
  useWebauthnAuthenticateScript({ authButtonId: AUTH_BUTTON, kcContext, i18n })
  return (
    <Template
      kcContext={kcContext}
      i18n={i18n}
      doUseDefaultCss={false}
      headerNode={msg('webauthn-login-title')}
      displayInfo={realm.registrationAllowed && !registrationDisabled}
      infoNode={url.registrationUrl && <RegisterLink i18n={i18n} href={url.registrationUrl} />}
    >
      <div id="kc-form-webauthn" className="space-y-5">
        <PageIcon><FingerprintIcon /></PageIcon>
        <WebauthnHiddenForm action={url.loginAction} />
        {authenticators && (
          <>
            <form id="authn_select">
              {authenticators.authenticators.map((a) => (
                <input key={a.credentialId} type="hidden" name="authn_use_chk" value={a.credentialId} />
              ))}
            </form>
            {shouldDisplayAuthenticators && (
              <div className="space-y-2">
                {authenticators.authenticators.length > 1 && <p className="text-muted-foreground text-xs font-medium">{msg('webauthn-available-authenticators')}</p>}
                {authenticators.authenticators.map((a, i) => (
                  <div key={i} id={`kc-webauthn-authenticator-item-${i}`} className="flex items-center gap-3 rounded-xl border p-3">
                    <span className="bg-muted flex size-9 items-center justify-center rounded-lg">
                      {a.transports.iconClass?.includes('usb') ? <UsbIcon className="size-4" /> : <KeyRoundIcon className="size-4" />}
                    </span>
                    <div className="min-w-0 text-sm">
                      <p id={`kc-webauthn-authenticator-label-${i}`} className="truncate font-medium">{advancedMsg(a.label)}</p>
                      {a.transports.displayNameProperties?.length ? (
                        <p id={`kc-webauthn-authenticator-transport-${i}`} className="text-muted-foreground text-xs">
                          {a.transports.displayNameProperties.flatMap((p, idx) => (idx ? [', ', advancedMsg(p)] : [advancedMsg(p)]))}
                        </p>
                      ) : null}
                      <p className="text-muted-foreground text-xs">
                        <span id={`kc-webauthn-authenticator-createdlabel-${i}`}>{msg('webauthn-createdAt-label')}</span>{' '}
                        <span id={`kc-webauthn-authenticator-created-${i}`}>{a.createdAt}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        <SubmitButton id={AUTH_BUTTON} type="button" autoFocus className="gap-2">
          <FingerprintIcon />
          {msgStr('webauthn-doAuthenticate')}
        </SubmitButton>
      </div>
    </Template>
  )
}

/** webauthn-register.ftl — register a passkey (passwordless) or security key (2FA). */
export function WebauthnRegister({ kcContext, i18n }: PageProps<'webauthn-register.ftl'>) {
  const { url, isSetRetry, isAppInitiatedAction } = kcContext
  const { msg, msgStr } = i18n
  useWebauthnRegisterScript({ authButtonId: AUTH_BUTTON, kcContext, i18n })
  return (
    <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={false} headerNode={msg('webauthn-registration-title')}>
      <div className="space-y-5">
        <PageIcon><FingerprintIcon /></PageIcon>
        <Prose>
          <p>Use your fingerprint, face, screen lock or a security key to sign in. Nothing to remember, nothing to phish.</p>
        </Prose>
        <form id="register" action={url.loginAction} method="post" className="space-y-4">
          <input type="hidden" id="clientDataJSON" name="clientDataJSON" />
          <input type="hidden" id="attestationObject" name="attestationObject" />
          <input type="hidden" id="publicKeyCredentialId" name="publicKeyCredentialId" />
          <input type="hidden" id="authenticatorLabel" name="authenticatorLabel" />
          <input type="hidden" id="transports" name="transports" />
          <input type="hidden" id="authenticatorAttachment" name="authenticatorAttachment" />
          <input type="hidden" id="error" name="error" />
          <LogoutOtherSessions i18n={i18n} />
        </form>
        <SubmitButton id={AUTH_BUTTON} type="button" className="gap-2">
          <KeyRoundIcon />
          {msgStr('doRegisterSecurityKey')}
        </SubmitButton>
        {!isSetRetry && isAppInitiatedAction && (
          <form action={url.loginAction} id="kc-webauthn-settings-form" method="post">
            <SecondaryButton type="submit" id="cancelWebAuthnAIA" name="cancel-aia" value="true">
              {msg('doCancel')}
            </SecondaryButton>
          </form>
        )}
      </div>
    </Template>
  )
}

/** webauthn-error.ftl */
export function WebauthnError({ kcContext, i18n }: PageProps<'webauthn-error.ftl'>) {
  const { url, isAppInitiatedAction, execution } = kcContext
  const { msg, msgStr } = i18n
  const [executionValue, setExecutionValue] = useState('')
  const [retry, setRetry] = useState('')
  return (
    <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={false} displayMessage headerNode={msg('webauthn-error-title')}>
      <div className="space-y-3">
        <form
          id="kc-error-credential-form"
          action={url.loginAction}
          method="post"
          onSubmit={(e) => {
            if (!retry) {
              e.preventDefault()
              setExecutionValue(execution ?? '')
              setRetry('retry')
              requestAnimationFrame(() => (e.target as HTMLFormElement).requestSubmit())
            }
          }}
        >
          <input type="hidden" id="executionValue" name="authenticationExecution" value={executionValue} />
          <input type="hidden" id="isSetRetry" name="isSetRetry" value={retry} />
          <SubmitButton id="kc-try-again" name="try-again">{msgStr('doTryAgain')}</SubmitButton>
        </form>
        {isAppInitiatedAction && (
          <form action={url.loginAction} id="kc-webauthn-settings-form" method="post">
            <SecondaryButton type="submit" id="cancelWebAuthnAIA" name="cancel-aia" value="true">
              {msgStr('doCancel')}
            </SecondaryButton>
          </form>
        )}
      </div>
    </Template>
  )
}

const authenticatorIcons: Record<string, ReactNode> = {
  kcAuthenticatorOTPClass: <SmartphoneIcon />,
  kcAuthenticatorWebAuthnClass: <KeyRoundIcon />,
  kcAuthenticatorWebAuthnPasswordlessClass: <FingerprintIcon />,
  kcAuthenticatorPasswordClass: <LockOpenIcon />,
  kcAuthenticatorDefaultClass: <ListIcon />,
}

/** select-authenticator.ftl — "Try another way". */
export function SelectAuthenticator({ kcContext, i18n }: PageProps<'select-authenticator.ftl'>) {
  const { url, auth } = kcContext
  const { msg, advancedMsg } = i18n
  return (
    <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={false} displayInfo={false} headerNode={msg('loginChooseAuthenticator')}>
      <form id="kc-select-credential-form" action={url.loginAction} method="post" className="grid gap-2">
        {auth.authenticationSelections.map((s, i) => (
          <button
            key={i}
            type="submit"
            name="authenticationExecution"
            value={s.authExecId}
            className="hover:bg-muted/60 focus-visible:ring-ring/50 group flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-colors outline-none focus-visible:ring-3"
          >
            <span className="bg-primary/8 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg]:size-5">
              {authenticatorIcons[s.iconCssClass ?? ''] ?? <ShieldCheckIcon />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{advancedMsg(s.displayName)}</span>
              <span className="text-muted-foreground block text-xs">{advancedMsg(s.helpText)}</span>
            </span>
            <ChevronRightIcon className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        ))}
      </form>
    </Template>
  )
}
