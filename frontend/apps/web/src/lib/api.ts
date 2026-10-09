/**
 * The SPA's only network layer. It talks exclusively to its own origin (the BFF); it never sees a token.
 * - Session: HttpOnly cookies, sent automatically (credentials: 'same-origin').
 * - CSRF: echoes the XSRF-TOKEN cookie in X-XSRF-TOKEN on every mutating request.
 * - Errors: RFC 9457 problem details → ApiError with a stable `type` slug.
 */

export type Problem = {
  type?: string
  title?: string
  status?: number
  detail?: string
  errors?: Record<string, string>
}

export class ApiError extends Error {
  readonly status: number
  readonly problem: Problem

  constructor(status: number, problem: Problem) {
    super(problem.detail ?? problem.title ?? `Request failed (${status})`)
    this.status = status
    this.problem = problem
  }

  /** Last path segment of the problem type, e.g. "premium-required". */
  get slug(): string {
    return this.problem.type?.split('/').pop() ?? 'unknown'
  }
}

function readCookie(name: string): string | undefined {
  return document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${name}=`))
    ?.slice(name.length + 1)
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (method !== 'GET' && method !== 'HEAD') {
    const csrf = readCookie('XSRF-TOKEN')
    if (csrf) headers['X-XSRF-TOKEN'] = decodeURIComponent(csrf)
  }

  const response = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
    cache: 'no-store',
  })

  if (response.status === 204) return undefined as T
  const isJson = response.headers.get('content-type')?.includes('json')
  const payload = isJson ? await response.json() : undefined

  if (!response.ok) {
    throw new ApiError(response.status, (payload as Problem) ?? { title: response.statusText, status: response.status })
  }
  return payload as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T = void>(path: string) => request<T>('DELETE', path),
}

/** Primes the CSRF cookie before the first mutation (any API GET returns it). */
export async function ensureCsrfCookie() {
  if (!readCookie('XSRF-TOKEN')) {
    await fetch('/api/v1/public/config', { credentials: 'same-origin' })
  }
}
