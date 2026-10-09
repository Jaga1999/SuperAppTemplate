import { api, ensureCsrfCookie } from './api'

/**
 * Every auth interaction is a full-page navigation to the BFF, which redirects to the themed Keycloak pages
 * (served under /auth on this same origin). The SPA never calls Keycloak and never handles tokens.
 */

/** Keycloak application-initiated actions the BFF allows (see LoginOptions.java). */
export type KeycloakAction =
  | 'CONFIGURE_TOTP'
  | 'UPDATE_PASSWORD'
  | 'UPDATE_PROFILE'
  | 'UPDATE_EMAIL'
  | 'CONFIGURE_RECOVERY_AUTHN_CODES'
  | 'webauthn-register'
  | 'webauthn-register-passwordless'
  | 'delete_account'
  | `delete_credential:${string}`
  | 'idp_link:google'

type LoginOptions = {
  returnTo?: string
  screen?: 'register'
  idp?: 'google'
  action?: KeycloakAction
  email?: string
  reauth?: boolean
}

export function loginUrl(options: LoginOptions = {}): string {
  const params = new URLSearchParams()
  if (options.returnTo) params.set('returnTo', options.returnTo)
  if (options.screen) params.set('screen', options.screen)
  if (options.idp) params.set('idp', options.idp)
  if (options.action) params.set('action', options.action)
  if (options.email) params.set('email', options.email)
  if (options.reauth) params.set('reauth', 'true')
  const query = params.toString()
  return `/oauth2/authorization/keycloak${query ? `?${query}` : ''}`
}

export const auth = {
  signIn: (returnTo = currentPath()) => window.location.assign(loginUrl({ returnTo })),
  signUp: () => window.location.assign(loginUrl({ screen: 'register' })),
  withGoogle: () => window.location.assign(loginUrl({ idp: 'google' })),
  /** Opens a themed Keycloak page for one account action, then comes back here. */
  runAction: (action: KeycloakAction, returnTo = currentPath()) => window.location.assign(loginUrl({ action, returnTo })),
  async signOut() {
    await ensureCsrfCookie()
    try {
      await api.post('/api/auth/logout')
    } finally {
      window.location.assign('/')
    }
  },
}

function currentPath() {
  return window.location.pathname + window.location.search
}
