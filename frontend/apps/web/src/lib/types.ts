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
  premium: boolean
  admin: boolean
  sessionId: string
  memberSince: string | null
}

export type Priority = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'

export type Todo = {
  id: string
  title: string
  notes: string | null
  completed: boolean
  completedAt: string | null
  priority: Priority
  dueDate: string | null
  createdAt: string
  updatedAt: string
  version: number
}

export type Page<T> = {
  content: T[]
  page: { size: number; number: number; totalElements: number; totalPages: number }
}

export type TodoStats = {
  total: number
  open: number
  completed: number
  overdue: number
  freeOpenLimit: number | null
}

export type TodoStatus = 'ALL' | 'OPEN' | 'DONE'

export type ActivityEntry = {
  id: string
  type: 'TodoCreated' | 'TodoCompleted' | 'TodoReopened' | 'TodoDeleted' | 'CompletedTodosCleared'
  todoId: string | null
  title: string | null
  count: number | null
  occurredAt: string
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
  todos: number
  completedTodos: number
  overdueTodos: number
}

export type AdminUser = {
  id: string
  email: string | null
  displayName: string | null
  status: 'ACTIVE' | 'DISABLED' | 'DELETED'
  createdAt: string
  lastLoginAt: string | null
  todos: number
}
