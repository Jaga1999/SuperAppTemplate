/** Mirrors the BFF's JSON contracts (Java records in backend/src/main/java/com/superapp/**). */

export type Me = {
  id: string
  email: string | null
  emailVerified: boolean
  displayName: string | null
  givenName: string | null
  familyName: string | null
  pictureUrl: string | null
  roles: string[]
  admin: boolean
  sessionId: string
  memberSince: string | null
}

export type Page<T> = {
  content: T[]
  page: { size: number; number: number; totalElements: number; totalPages: number }
}

export type SessionView = {
  id: string
  ipAddress: string | null
  startedAt: string
  lastAccessAt: string
  rememberMe: boolean
  current: boolean
}

export type Credential = { id: string; type: string; label: string | null; createdAt: string | null }

export type SecurityOverview = {
  hasPassword: boolean
  totpEnabled: boolean
  passkeys: number
  securityKeys: number
  recoveryCodes: boolean
  credentials: Credential[]
  linkedProviders: { alias: string; username: string | null }[]
  linkableProviders: string[]
}

export type PublicConfig = { googleLoginEnabled: boolean }

export type AdminOverview = {
  activeUsers: number
  keycloakUsers: number
  signupsLast7Days: number
}

export type AdminUser = {
  id: string
  email: string | null
  displayName: string | null
  status: 'ACTIVE' | 'DISABLED' | 'DELETED'
  createdAt: string
  lastLoginAt: string | null
}

export type AdminSession = {
  id: string
  ipAddress: string | null
  startedAt: string
  lastAccessAt: string
  rememberMe: boolean
  clients: string[]
}

export type AdminUserDetail = {
  user: AdminUser
  inKeycloak: boolean
  enabled: boolean
  emailVerified: boolean
  firstName: string | null
  lastName: string | null
  credentialTypes: string[]
  linkedProviders: { alias: string; username: string | null }[]
  sessions: AdminSession[]
}
