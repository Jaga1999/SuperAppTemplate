import type { I18n } from '../i18n'

export function usernameLabel(kcContext: { realm: { loginWithEmailAllowed: boolean; registrationEmailAsUsername: boolean } }, i18n: I18n) {
  if (!kcContext.realm.loginWithEmailAllowed) return i18n.msg('username')
  if (!kcContext.realm.registrationEmailAsUsername) return i18n.msg('usernameOrEmail')
  return i18n.msg('email')
}
