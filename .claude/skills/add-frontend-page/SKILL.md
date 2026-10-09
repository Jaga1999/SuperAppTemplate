---
name: add-frontend-page
description: Add a page or screen to the SuperApp React SPA (frontend/) using its shadcn UI kit (src/components/ui), TanStack Query and the BFF API client. Use when asked to add or change a UI page, route, form or dashboard in the product app (not the Keycloak login pages).
---

# Add a frontend page

Rules: `.agent/rules/frontend.md`. Reference pages: `frontend/src/pages/home.tsx`,
`pages/settings/sessions.tsx`.

## Steps

1. **Data** — add the response type to `src/lib/types.ts`; add a query or mutation hook in `src/lib/queries.ts`
   (keys in `keys`, `errorToast` on errors, invalidate affected keys on success). Requests only through `api`.
2. **Page** — `src/pages/<name>.tsx`, composed from `@/components/ui/*`. Handle loading (skeletons), empty
   and error states. Tokens only for colors; check light and dark mode and phone width.
3. **Route** — lazy route in `src/main.app.tsx` under the `app` route (`RequireAuth`); wrap admin or premium pages in
   `RequireRole`. Add a sidebar entry in `src/layout/app-shell.tsx` if it's a top-level page.
4. **Auth actions** — anything that changes credentials or identity is `auth.runAction('<action>')` (allowed actions
   in `src/lib/auth.ts` and `LoginOptions.java`).
5. **New shadcn component** — `cd frontend && npx shadcn@latest add <name>`.

## Verify

```bash
npm --prefix frontend run typecheck
```
```bash
npm --prefix frontend run lint
```

Then check it in a browser: `npm --prefix frontend run dev` (stack running) at http://localhost:5173, or rebuild nginx
(`docker compose up -d --build --wait nginx`) and use http://localhost:8080. For flows that matter, add a Playwright
test in `frontend/e2e/tests`.
