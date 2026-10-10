import { expect, test } from '@playwright/test'
import { api, completeRequiredActions, expectInApp, kcPage, linkFromEmail, newIdentity, newPassword, signIn } from './support'

/**
 * One account's whole life: register → verify email → set password → terms → app → every API → sign out →
 * wrong password → password sign-in → forgot password → passkey sign-in. Serial: later steps reuse the account.
 */
test.describe.serial('account lifecycle', () => {
  const user = newIdentity()
  let consentVersions: string[] = []

  test('register, verify email, set password, accept terms', async ({ page }) => {
    await page.goto('/app')
    await expect.poll(() => kcPage(page)).toBe('login.ftl')
    await page.getByText('Create account', { exact: true }).click()

    await expect.poll(() => kcPage(page)).toBe('register.ftl')
    await page.locator('#email').fill(user.email)
    await page.locator('#firstName').fill(user.firstName)
    await page.locator('#lastName').fill(user.lastName)
    await page.locator('#kc-register-form button[type=submit]').click()

    // Legal consent, then email verification; Keycloak 26.8 asks for the password only after the address is proven.
    const { pages, legalVersions } = await completeRequiredActions(page, user)
    consentVersions = legalVersions
    expect(consentVersions).toHaveLength(2)
    expect(pages.filter((p) => p === 'legal-consent.ftl')).toHaveLength(1)
    expect(pages).not.toContain('terms.ftl') // the unversioned built-in action is off
    await expectInApp(page)
    await expect(page.getByRole('heading', { name: /^Welcome/ })).toContainText(user.firstName)
  })

  test('legal consent is not asked again on later sign-ins (same versions)', async ({ page }) => {
    await signIn(page, user.email, user.password)
    // Straight into the app: no legal-consent page in between.
    await expectInApp(page)
  })

  test('the legal documents are public pages, with the versions Keycloak asked users to accept', async ({ page }) => {
    // frontend/legal and keycloak/legal are separate copies (each image is self-contained): they must not drift.
    await page.goto('/legal/terms')
    await expect(page.getByRole('heading', { level: 1, name: 'Terms and Conditions' })).toBeVisible()
    await expect(page.getByText(/Effective .* · Version /)).toHaveText(consentVersions[0])
    await page.getByRole('link', { name: 'Privacy Policy' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeVisible()
    await expect(page.getByText(/Effective .* · Version /)).toHaveText(consentVersions[1])
  })

  test('every API works for a signed-in user', async ({ page }) => {
    await signIn(page, user.email, user.password)
    await expectInApp(page)

    const me = await api(page, 'GET', '/api/v1/me')
    expect(me.status).toBe(200)
    expect(me.body).toMatchObject({ email: user.email, emailVerified: true })

    expect((await api(page, 'GET', '/api/v1/public/config')).body).toMatchObject({ googleLoginEnabled: true })

    // Account APIs (Keycloak Admin API behind the BFF)
    const sessions = await api(page, 'GET', '/api/v1/account/sessions')
    expect(sessions.status).toBe(200)
    expect(sessions.body.length).toBeGreaterThanOrEqual(1)
    const security = await api(page, 'GET', '/api/v1/account/security')
    expect(security.status).toBe(200)
    expect(security.body).toMatchObject({ hasPassword: true })

    // Authorization + CSRF
    expect((await api(page, 'GET', '/api/v1/admin/overview')).status).toBe(403)
    const noCsrf = await page.evaluate(async () =>
      (await fetch('/api/v1/account/sessions/sign-out-others', { method: 'POST' })).status,
    )
    expect(noCsrf).toBe(403)

    // Sign out ends the Keycloak session too
    expect((await api(page, 'POST', '/api/auth/logout')).status).toBeLessThan(400)
    expect((await api(page, 'GET', '/api/v1/me')).status).toBe(401)
  })

  test('wrong password is rejected without revealing whether the account exists', async ({ page }) => {
    await signIn(page, user.email, 'Not-the-right-password-1')
    await expect.poll(() => kcPage(page)).toBe('login.ftl')
    const wrongForUser = await page.locator('p[aria-live=polite]').first().innerText()

    await signIn(page, `nobody-${Date.now()}@superapp.local`, 'Not-the-right-password-1')
    await expect.poll(() => kcPage(page)).toBe('login.ftl')
    expect(await page.locator('p[aria-live=polite]').first().innerText()).toBe(wrongForUser)
  })

  test('forgot password: email link, new password, sign in with it', async ({ page }) => {
    await page.goto('/app')
    await expect.poll(() => kcPage(page)).toBe('login.ftl')
    await page.getByText('Forgot password?').click()
    await expect.poll(() => kcPage(page)).toBe('login-reset-password.ftl')
    await page.locator('#username').fill(user.email)
    await page.locator('form button[type=submit]').click()

    const link = await linkFromEmail(user.email, /reset/i)
    user.password = newPassword()
    await page.goto(link)
    await completeRequiredActions(page, user)
    await expectInApp(page)

    // Old sessions were ended by the reset; the new password works on a clean sign-in.
    await api(page, 'POST', '/api/auth/logout')
    await signIn(page, user.email, user.password)
    await expectInApp(page)
  })

  test('passkey: register one, then sign in with it (virtual authenticator)', async ({ page, context }) => {
    const cdp = await context.newCDPSession(page)
    await cdp.send('WebAuthn.enable')
    await cdp.send('WebAuthn.addVirtualAuthenticator', {
      options: {
        protocol: 'ctap2',
        transport: 'internal',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true,
      },
    })

    await signIn(page, user.email, user.password)
    await expectInApp(page)
    await page.goto('/app/settings/security')
    await page.getByRole('button', { name: 'Add passkey' }).click()
    await expect.poll(() => kcPage(page)).toBe('webauthn-register.ftl')
    await page.locator('#authenticateWebAuthnButton').click()
    await expectInApp(page).catch(async () => {
      await page.waitForURL(/\/app/)
    })
    expect((await api(page, 'GET', '/api/v1/account/security')).body).toMatchObject({ passkeys: 1 })

    await api(page, 'POST', '/api/auth/logout')
    await page.goto('/app')
    await expect.poll(() => kcPage(page)).toBe('login.ftl')
    await page.getByRole('button', { name: /passkey/i }).first().click()
    await expectInApp(page)
  })

  test('passkey cancelled: short, actionable message', async ({ page, context }) => {
    // An authenticator that holds no passkey for this site → the browser rejects with NotAllowedError.
    const cdp = await context.newCDPSession(page)
    await cdp.send('WebAuthn.enable')
    await cdp.send('WebAuthn.addVirtualAuthenticator', {
      options: { protocol: 'ctap2', transport: 'usb', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true },
    })
    await page.goto('/app')
    await expect.poll(() => kcPage(page)).toBe('login.ftl')
    await page.getByRole('button', { name: /passkey/i }).first().click()
    const alert = page.locator('[role=alert]').first()
    await expect(alert).toBeVisible({ timeout: 20_000 })
    const text = await alert.innerText()
    expect(text.length).toBeLessThan(120)
    expect(text).not.toMatch(/not permitted in this context/)
  })
})
