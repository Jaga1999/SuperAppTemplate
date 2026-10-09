import { randomBytes } from 'node:crypto'
import { expect, type Page } from '@playwright/test'

const MAILPIT = process.env.E2E_MAILPIT_URL ?? 'http://127.0.0.1:8025'

/** A fresh identity per run. The password satisfies the realm policy (12+, upper, lower, digit). */
export function newIdentity() {
  const id = randomBytes(4).toString('hex')
  return {
    email: `e2e-${id}@superapp.local`,
    firstName: 'Eve',
    lastName: `Tester ${id}`,
    password: newPassword(),
  }
}

export function newPassword() {
  return `Aa1-${randomBytes(12).toString('base64url')}`
}

export type Identity = ReturnType<typeof newIdentity>

/** Keycloak page id of the themed page currently shown (undefined when we're in the SPA). */
export async function kcPage(page: Page): Promise<string | undefined> {
  // Mid-redirect the execution context can vanish; report "unknown" and let expect.poll retry.
  return page
    .evaluate(() => (window as unknown as { kcContext?: { pageId: string } }).kcContext?.pageId)
    .catch(() => undefined)
}

/** Waits for the newest email to `to` whose subject matches, and returns the first action link in it. */
export async function linkFromEmail(to: string, subject: RegExp): Promise<string> {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    const search = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`)
    const { messages = [] } = (await search.json()) as { messages?: { ID: string; Subject: string }[] }
    const hit = messages.find((m) => subject.test(m.Subject))
    if (hit) {
      const message = (await (await fetch(`${MAILPIT}/api/v1/message/${hit.ID}`)).json()) as { Text: string; HTML: string }
      const link = (message.Text + message.HTML).match(/https?:\/\/[^\s"'<>]+login-actions\/action-token[^\s"'<>]+/)?.[0]
      if (link) return link.replaceAll('&amp;', '&')
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`No email matching ${subject} for ${to}`)
}

/** Same-origin API call from inside the page, exactly like the SPA (cookies + XSRF echo). */
export async function api(page: Page, method: string, path: string, body?: unknown) {
  return page.evaluate(
    async ({ method, path, body }) => {
      const xsrf = document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))?.slice('XSRF-TOKEN='.length)
      const headers: Record<string, string> = { Accept: 'application/json' }
      if (body !== undefined) headers['Content-Type'] = 'application/json'
      if (method !== 'GET' && xsrf) headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrf)
      const res = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
      const text = await res.text()
      let json: unknown
      try {
        json = text ? JSON.parse(text) : undefined
      } catch {
        json = text
      }
      return { status: res.status, body: json as Record<string, unknown> & unknown[] }
    },
    { method, path, body },
  )
}

/** Fills the themed login form. */
export async function signIn(page: Page, email: string, password: string) {
  await page.goto('/app')
  await expect.poll(() => kcPage(page)).toBe('login.ftl')
  await page.locator('#username').fill(email)
  await page.locator('#password').fill(password)
  await page.locator('#kc-login').click()
}

/** Signed in and the app shell rendered. */
export async function expectInApp(page: Page) {
  await page.waitForURL(/localhost:8080\/app/)
  await expect(page.getByText(/Good (morning|afternoon|evening)/)).toBeVisible()
}

/**
 * Completes whatever required actions Keycloak asks for, in any order, until the app loads.
 * Returns the Keycloak page ids it went through (so tests can assert e.g. that consent was asked exactly once).
 */
export async function completeRequiredActions(page: Page, user: { email: string; password: string }): Promise<string[]> {
  const password = user.password
  const seen: string[] = []
  for (let i = 0; i < 8; i++) {
    await page.waitForLoadState()
    if (new URL(page.url()).pathname.startsWith('/app')) return seen
    const id = await kcPage(page)
    if (id === undefined) {
      await page.waitForTimeout(300) // between redirects
      continue
    }
    seen.push(id)
    if (id === 'login-verify-email.ftl') {
      await page.goto(await linkFromEmail(user.email, /confirm your email|verif/i))
      continue
    }
    if (id === 'login-update-password.ftl') {
      await page.locator('#password-new').fill(password)
      await page.locator('#password-confirm').fill(password)
      await page.locator('#kc-passwd-update-form button[type=submit]').last().click()
    } else if (id === 'legal-consent.ftl') {
      await acceptLegalConsent(page)
    } else if (id === 'terms.ftl') {
      await page.locator('#kc-accept').click()
    } else if (id === 'info.ftl') {
      await page.locator('a[href*="login-actions"], a[href*="/app"]').first().click()
    } else {
      throw new Error(`Unexpected Keycloak page ${id} at ${page.url()}`)
    }
    await page.waitForURL((url) => url.toString() !== page.url(), { timeout: 15_000 }).catch(() => undefined)
  }
  return seen
}

/** The versioned consent page: both documents linked, Accept enabled only once both boxes are ticked. */
export async function acceptLegalConsent(page: Page) {
  await expect(page.locator('a[href="/legal/terms"]')).toBeVisible()
  await expect(page.locator('a[href="/legal/privacy"]')).toBeVisible()
  const accept = page.locator('#kc-accept')
  await expect(accept).toBeDisabled()
  await page.locator('#acceptTerms').click()
  await expect(accept).toBeDisabled()
  await page.locator('#acceptPrivacy').click()
  await expect(accept).toBeEnabled()
  await accept.click()
}
