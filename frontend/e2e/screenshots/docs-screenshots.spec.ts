import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { expect, type Page, test } from '@playwright/test'
import { api, completeRequiredActions, expectInApp, kcPage, newIdentity, signIn } from '../tests/support'

/**
 * Captures the screenshots used in docs/ from the running stack (real Keycloak, real BFF) and from the Keycloak
 * theme preview (mock data) for pages that are hard to reach in a scripted run. Overwrites docs/images/*.png.
 */
const REPO = path.resolve(import.meta.dirname, '../../..')
const OUT = path.join(REPO, 'docs', 'images')
const REALM = process.env.DOCS_REALM ?? 'superapp'
const THEME_PREVIEW = 'http://localhost:5174'

async function shot(page: Page, name: string, options: { fullPage?: boolean } = {}) {
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: options.fullPage ?? false, animations: 'disabled' })
}

/** Grants the realm role `admin` with kcadm inside the Keycloak container, using the container's own admin login. */
function grantAdmin(email: string) {
  const kcadm = (command: string) =>
    execFileSync('docker', ['compose', 'exec', '-T', 'keycloak', 'bash', '-c', command], {
      cwd: REPO,
      stdio: ['ignore', 'ignore', 'inherit'],
    })
  kcadm(
    '/opt/keycloak/bin/kcadm.sh config credentials --config /tmp/kcadm.config --server http://localhost:8080/auth ' +
      '--realm master --user "$KC_BOOTSTRAP_ADMIN_USERNAME" --password "$KC_BOOTSTRAP_ADMIN_PASSWORD"',
  )
  kcadm(`/opt/keycloak/bin/kcadm.sh add-roles --config /tmp/kcadm.config -r ${REALM} --uusername ${email} --rolename admin`)
}

test.describe.serial('documentation screenshots', () => {
  const user = newIdentity()

  test('public pages', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await shot(page, 'landing')
    await shot(page, 'landing-full', { fullPage: true })

    await page.emulateMedia({ colorScheme: 'dark' })
    await page.reload()
    await shot(page, 'landing-dark')
    await page.emulateMedia({ colorScheme: 'light' })

    await page.setViewportSize({ width: 390, height: 844 })
    await page.reload()
    await shot(page, 'landing-mobile')
    await page.setViewportSize({ width: 1440, height: 900 })

    await page.goto('/legal/terms')
    await shot(page, 'legal-terms')
  })

  test('sign-in and sign-up through the BFF', async ({ page }) => {
    await page.goto('/app')
    await expect.poll(() => kcPage(page)).toBe('login.ftl')
    await shot(page, 'signin')

    await page.getByText('Create account', { exact: true }).click()
    await expect.poll(() => kcPage(page)).toBe('register.ftl')
    await page.locator('#email').fill(user.email)
    await page.locator('#firstName').fill(user.firstName)
    await page.locator('#lastName').fill('Tester')
    await shot(page, 'signup')
    await page.locator('#kc-register-form button[type=submit]').click()

    await completeRequiredActions(page, user)
    await expectInApp(page)
  })

  test('signed-in app', async ({ page }) => {
    await signIn(page, user.email, user.password)
    await expectInApp(page)
    await shot(page, 'app-home')

    await page.goto('/app/settings')
    await expect(page.getByRole('heading', { level: 2, name: 'Settings' })).toBeVisible()
    await shot(page, 'settings-profile')
    await page.goto('/app/settings/security')
    await expect(page.getByText(/password/i).first()).toBeVisible()
    await shot(page, 'settings-security')
    await page.goto('/app/settings/sessions')
    await expect(page.getByText("Where you're signed in")).toBeVisible()
    await shot(page, 'settings-devices')

    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/app')
    await expectInApp(page)
    await shot(page, 'app-home-dark')
    await page.emulateMedia({ colorScheme: 'light' })

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/app')
    await expectInApp(page)
    await shot(page, 'app-mobile')
  })

  test('admin area', async ({ page }) => {
    grantAdmin(user.email)
    // Roles come with the next token: sign in again.
    await signIn(page, user.email, user.password)
    await expectInApp(page)
    await api(page, 'POST', '/api/auth/logout')
    await signIn(page, user.email, user.password)
    await expectInApp(page)

    await page.goto('/app/admin')
    await expect(page.getByRole('heading', { level: 2, name: 'Admin' })).toBeVisible()
    await shot(page, 'admin-overview')

    await page.getByRole('link', { name: new RegExp(user.email) }).click()
    await expect(page.getByText('Every device signed in right now')).toBeVisible()
    await shot(page, 'admin-user')
  })

  test('Keycloak theme pages (preview with mock data)', async ({ page }) => {
    const pages = [
      'login-otp.ftl',
      'login-config-totp.ftl',
      'webauthn-register.ftl',
      'login-reset-password.ftl',
      'login-verify-email.ftl',
      'legal-consent.ftl',
      'login-recovery-authn-code-config.ftl',
      'error.ftl',
    ]
    for (const pageId of pages) {
      await page.goto(`${THEME_PREVIEW}/?kc=${pageId}`)
      await page.locator('main').first().waitFor()
      await shot(page, `theme-${pageId.replace('.ftl', '')}`)
    }
  })

  test('developer tools: Swagger UI and Mailpit', async ({ page }) => {
    await page.goto('http://localhost:8081/swagger-ui.html')
    await page.locator('.opblock').first().waitFor()
    await shot(page, 'swagger')

    await page.goto('http://localhost:8025')
    await page.getByText(user.email).first().waitFor()
    await shot(page, 'mailpit')
    await page.getByText(user.email).first().click()
    await page.waitForTimeout(1000)
    await shot(page, 'mailpit-email')
  })
})
