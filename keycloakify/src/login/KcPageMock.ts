import { createGetKcContextMock } from 'keycloakify/login/KcContext'
import { kcEnvDefaults, themeNames } from '../kc.gen'
import type { KcContext, KcContextExtension, KcContextExtensionPerPage } from './KcContext'

/**
 * Dev-only: render any Keycloak page inside `npm run dev` without a Keycloak server.
 *   http://localhost:5174/?kc=login.ftl
 *   http://localhost:5174/?kc=register.ftl
 *   http://localhost:5174/?kc=login-config-totp.ftl
 * Imported dynamically from main.tsx only when import.meta.env.DEV, so it never ships to production.
 */
const kcContextExtension: KcContextExtension = {
  themeName: themeNames[0],
  properties: { ...kcEnvDefaults, SUPERAPP_GOOGLE_LOGIN_ENABLED: 'true' },
}

export const { getKcContextMock } = createGetKcContextMock({
  kcContextExtension,
  kcContextExtensionPerPage: {
    'legal-consent.ftl': {
      legalTerms: {
        title: 'Terms and Conditions',
        version: '2026-10-09',
        effective: '2026-10-09',
        summary: 'The rules for using SuperApp, your responsibilities, and ours.',
        acceptedVersion: '2026-01-15',
        updated: true,
      },
      legalPrivacy: {
        title: 'Privacy Policy',
        version: '2026-10-09',
        effective: '2026-10-09',
        summary: 'What personal data SuperApp collects, why, how long we keep it, and your rights.',
        acceptedVersion: '',
        updated: false,
      },
    },
  } satisfies KcContextExtensionPerPage,
  overrides: { realm: { displayName: 'SuperApp', registrationEmailAsUsername: true } },
  overridesPerPage: {
    'login.ftl': {
      realm: { registrationAllowed: true, rememberMe: true, resetPasswordAllowed: true },
      social: { providers: [{ alias: 'google', displayName: 'Google', loginUrl: '#', providerId: 'google', iconClasses: '' }] },
    },
  },
})

export function mockFor(pageId: string): KcContext {
  return getKcContextMock({ pageId: pageId as KcContext['pageId'], overrides: {} }) as KcContext
}
