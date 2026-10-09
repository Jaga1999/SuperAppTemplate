# Frontend rules (pnpm workspace in `frontend/`)

## Packages

| Package | Purpose | May import |
|---|---|---|
| `packages/ui` (`@superapp/ui`) | Design tokens, shadcn components, brand | its own files only |
| `apps/web` | Product SPA | `@superapp/ui` |
| `apps/keycloak-theme` | Keycloakify login theme | `@superapp/ui`, `keycloakify` |
| `apps/e2e` | Playwright tests | `@playwright/test` |

`apps/web` and `apps/keycloak-theme` never import each other. Shared UI goes to `packages/ui`.

## Stack and style

- React 19, TypeScript 7 (strict), Vite 8, Tailwind 4 (tokens in `packages/ui/src/styles/globals.css`), shadcn
  (`radix-nova` style), TanStack Query 5, React Router 8, oxlint.
- Imports: `@superapp/ui/components/<name>`, `@superapp/ui/lib/utils`, `@superapp/ui/hooks/<name>`.
- New shadcn components: `cd frontend/packages/ui && pnpm dlx shadcn@latest add <name>`.
- Colors only through tokens (`bg-primary`, `text-muted-foreground`, ...). Every screen works in light and dark mode
  and at phone width.
- Accessible by default: labelled inputs, `aria-label` on icon buttons, keyboard reachable, visible focus.

## Talking to the server (apps/web)

- Only `src/lib/api.ts` performs requests: same origin, cookies, XSRF header, `ApiError` from problem details.
- Server state lives in TanStack Query (`src/lib/queries.ts`, keys in `keys`). No duplicated server state in React state.
- Never call Keycloak, never handle tokens. Auth is full-page navigation: `auth.signIn()`, `auth.signUp()`,
  `auth.withGoogle()`, `auth.runAction('<action>')`, `auth.signOut()`.
- Role checks in the UI (`RequireRole`) only hide dead ends; the BFF enforces authorization.

## Keycloak theme (apps/keycloak-theme)

- Every Keycloak page has a component (mapped in `src/login/KcPage.tsx`). Keep Keycloak's form field names and ids
  (`username`, `password`, `password-new`, `kc-login`, ...): Keycloak and its scripts depend on them.
- Use Keycloakify's `use*Script` hooks for passkey/WebAuthn pages; don't reimplement WebAuthn calls.
- Text comes from `i18n` (`msg`, `msgStr`); override Keycloak's messages in `src/login/i18n.ts`. Render Keycloak HTML
  messages only through `kcSanitize`.
- Error and info messages are short, plain and say what to do next.
