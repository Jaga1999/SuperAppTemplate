export function initials(name: string | null | undefined, email: string | null | undefined) {
  const source = name?.trim() || email || '?'
  return source
    .split(/[s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

/** Evaluated once per page load (render functions must stay pure). */
export const CURRENT_YEAR = new Date().getFullYear()
