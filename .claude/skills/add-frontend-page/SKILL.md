---
name: add-frontend-page
description: Add a page or screen to the SuperApp React SPA (frontend/apps/web) using the shared @superapp/ui design system, TanStack Query and the BFF API client. Use when asked to add or change a UI page, route, form or dashboard in the product app (not the Keycloak login pages).
---

# Add a frontend page

Rules: `.agent/rules/frontend.md`. Reference pages: `frontend/apps/web/src/pages/todos.tsx`,
`pages/settings/sessions.tsx`.

## Steps

1. **Data** — add the response type to `src/lib/types.ts`; add a query or mutation hook in `src/lib/queries.ts`
   (keys in `keys`, `errorToast` on errors, invalidate affected keys on success). Requests only through `api`.
2. **Page** — `src/pages/<name>.tsx`, composed from `@superapp/ui/components/*`. Handle loading (skeletons), empty
   and error states. Tokens only for colors; check light and dark mode and phone width.
3. **Route** — lazy route in `src/main.app.tsx` under the `app` route (`RequireAuth`); wrap admin or premium pages in
   `RequireRole`. Add a sidebar entry in `src/layout/app-shell.tsx` if it's a top-level page.
4. **Auth actions** — anything that changes credentials or identity is `auth.runAction('<action>')` (allowed actions
   in `src/lib/auth.ts` and `LoginOptions.java`).
5. **New shadcn component** — `cd frontend/packages/ui && pnpm dlx shadcn@latest add <name>`.

## Verify

```bash
pnpm --dir frontend typecheck
```
```bash
pnpm --dir frontend lint
```

Then check it in a browser: `pnpm --dir frontend dev` (stack running) at http://localhost:5173, or rebuild nginx
(`docker compose up -d --build --wait nginx`) and use http://localhost:8080. For flows that matter, add a Playwright
test in `frontend/apps/e2e/tests`.
