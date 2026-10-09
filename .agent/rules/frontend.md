# Frontend rules (two independent React projects, npm only)

## Projects

| Folder | Purpose | Notes |
|---|---|---|
| `frontend/` | Product SPA, served by nginx | Playwright e2e suite in `frontend/e2e` |
| `keycloakify/` | Keycloakify login theme, baked into the Keycloak image | Never imports from `frontend/` |

The two projects share no code and have their own `package.json`, `package-lock.json` and copy of the UI kit
(`src/components/ui`, `src/lib/utils.ts`, `src/styles/globals.css`). When you change a design token or a shared
component, apply it to both copies so the app and the sign-in pages keep looking the same.

## Stack and style

- npm only (never pnpm or yarn). React 19, TypeScript 7 (strict), Vite 8, Tailwind 4 (tokens in
  `src/styles/globals.css`), shadcn (`radix-nova` style), TanStack Query 5, React Router 8. Lint with Biome (`npm run lint`, config in `biome.jsonc`; linter only, no formatter).
- Imports: `@/components/ui/<name>`, `@/lib/utils`, `@/hooks/<name>` (`@` = the project's `src/`).
- New shadcn components: `cd frontend && npx shadcn@latest add <name>` (or in `keycloakify/`).
- Colors only through tokens (`bg-primary`, `text-muted-foreground`, ...). Every screen works in light and dark mode
  and at phone width.
- Accessible by default: labelled inputs, `aria-label` on icon buttons, keyboard reachable, visible focus.

## Talking to the server (frontend/)

- Only `src/lib/api.ts` performs requests: same origin, cookies, XSRF header, `ApiError` from problem details.
- Server state lives in TanStack Query (`src/lib/queries.ts`, keys in `keys`). No duplicated server state in React state.
- Never call Keycloak, never handle tokens. Auth is full-page navigation: `auth.signIn()`, `auth.signUp()`,
  `auth.withGoogle()`, `auth.runAction('<action>')`, `auth.signOut()`.
- Role checks in the UI (`RequireRole`) only hide dead ends; the BFF enforces authorization.

## Keycloak theme (keycloakify/)

- Every Keycloak page has a component (mapped in `src/login/KcPage.tsx`). Keep Keycloak's form field names and ids
  (`username`, `password`, `password-new`, `kc-login`, ...): Keycloak and its scripts depend on them.
- Use Keycloakify's `use*Script` hooks for passkey/WebAuthn pages; don't reimplement WebAuthn calls.
- Text comes from `i18n` (`msg`, `msgStr`); override Keycloak's messages in `src/login/i18n.ts`. Render Keycloak HTML
  messages only through `kcSanitize`.
- Error and info messages are short, plain and say what to do next.
