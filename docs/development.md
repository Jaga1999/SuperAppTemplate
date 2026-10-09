# Development

## Daily workflow

| Goal | Command (from the repo root) |
|---|---|
| Start or rebuild everything | `docker compose up -d --build --wait` |
| Rebuild one service after a change | `docker compose up -d --build --wait backend` (or `keycloak`, `nginx`) |
| Follow logs | `docker compose logs -f backend` |
| App with hot reload (stack must be running) | `npm --prefix frontend run dev` → http://localhost:5173 |
| Keycloak pages with mock data | `npm --prefix keycloakify run dev` → http://localhost:5174/?kc=login.ftl |
| Backend tests (Docker must be running) | `cd backend && ./gradlew test` |
| Frontend type check and lint | `npm run typecheck` and `npm run lint` inside `frontend/` and `keycloakify/` |
| End-to-end tests (stack must be running) | `npm --prefix frontend run e2e` |
| API docs (Swagger UI, management port only) | http://localhost:8081/swagger-ui.html · JSON: http://localhost:8081/v3/api-docs |
| Reset all local data (needed after realm JSON changes) | `docker compose down -v` |

Which change needs which rebuild:

| You changed | Rebuild |
|---|---|
| `backend/**` | `backend` |
| `frontend/**` | `frontend` (or use `npm run dev`) |
| `keycloakify/**`, `keycloak/themes/**`, `keycloak/extensions/**` | `keycloak` |
| `keycloak/realm/**` | `docker compose down -v`, then up again |
| `legal/*.md` | `keycloak` and `nginx` (change `version` only when users must re-accept) |
| `keycloak/extensions/**` tests | `cd keycloak/extensions/superapp-extensions && ./gradlew build` |
| `infra/nginx/**` | `nginx` |

## Adding a backend feature

Use `user` as the reference for shape (public facade + `internal`). For a feature called `notes`:

1. `com.superapp.notes` holds only what other features may use: a facade interface, events (sealed interface of
   records), DTOs. Everything else goes in `com.superapp.notes.internal` (package-private where possible).
2. Schema changes: a new Flyway migration `backend/src/main/resources/db/migration/V<n>__<what>.sql`. Never edit an
   applied migration. `ddl-auto` is `none`.
3. Controller: `@RequestMapping(path = "/api/{version}/notes", version = "1")` (Spring Framework 7 API versioning, see
   `MeController`), records for requests and responses, Bean Validation on inputs, `CurrentUser` as a parameter for the signed-in user.
4. Errors: throw a `DomainException` (stable slug, title, detail); never return error bodies by hand.
   API docs: put every `@Operation`/`@ApiResponse` in `notes/internal/docs/NotesApiDocs.java` (an interface the
   controller `implements`), never on the controller. Describe each response a client can get (success, 404, 409, …);
   `OpenApiConfig` adds the shared 400/401/403/429/500 responses, the cookie + CSRF security and the `/api/v1` paths.
   Mark `CurrentUser` parameters `@Parameter(hidden = true)`. Public endpoints get an empty `@SecurityRequirements`.

5. Events: declare the topic and its `.DLT` in `KafkaTopicsConfig` (app cluster), publish with `KafkaTemplate`,
   consume with `@KafkaListener` into a consumer-side record, and make consumers idempotent.
6. Tests: unit tests for the service, plus an `@SpringBootTest` slice through MockMvcTester (`ApiIntegrationTest`
   shows auth, CSRF and Testcontainers). `ArchitectureTest` must stay green.

Conventions: Java 25 (records, sealed types, pattern matching, `_` for unused), JSpecify `@NullMarked` packages with
`@Nullable` where needed, constructor injection, no field injection, `-Werror` with lint warnings on, imports instead
of fully qualified names, no deprecated APIs.

## Adding a frontend page

1. Route: `frontend/src/app/app/<name>/page.tsx`, a small server component that exports `metadata` (title) and
   renders a view. Everything under `/app` is signed-in only (`app/app/layout.tsx`) and `noindex`. Admin pages go
   under `app/app/admin/` (guarded by `RequireRole`; the BFF enforces the same rule).
2. View: `frontend/src/views/<name>.tsx`, a client component (`'use client'`) composed from `@/components/ui/*`.
   Handle loading (skeletons), empty and error states.
3. Data: server state in TanStack Query (`src/lib/queries.ts`, keys in `keys`); requests only through
   `src/lib/api.ts` (same origin, XSRF header, `ApiError` from problem details). Client UI state that must outlive a
   component goes in a Zustand store created per provider (see `src/stores/admin-users-store.tsx`), never a
   module-level store.
4. UI: compose the components in `src/components/ui` (import `@/components/ui/<name>`). Add new shadcn components:
   `cd frontend && npx shadcn@latest add <component>`.
5. Auth actions (passkey, password, MFA, delete account) are full-page navigations: `auth.runAction('…')`. Allowed
   actions are listed in `LoginOptions.java` and `src/lib/auth.ts`; add to both.
6. Public pages: export `metadata` with a `canonical` URL and add them to `src/app/sitemap.ts`.

## Changing a Keycloak page

1. Find the page id (`window.kcContext.pageId` in the browser console on that page).
2. Edit its component under `keycloakify/src/login/pages/` (mapping in `KcPage.tsx`).
3. Preview: `npm --prefix keycloakify run dev` → `http://localhost:5174/?kc=<page-id>`.
4. Text: override Keycloak message keys in `src/login/i18n.ts`.
5. Rebuild the `keycloak` image and test the real flow (`npm --prefix frontend run e2e`).

## Tests

| Suite | Where | Needs |
|---|---|---|
| Unit and slice | `backend/src/test` | JDK 25 |
| Integration (Postgres, Redis, Kafka) | `ApiIntegrationTest` | Docker (Testcontainers) |
| Architecture | `ArchitectureTest` | — |
| End to end | `frontend/e2e` | Running stack, Google Chrome |

The e2e suite registers a **new** account on every run (credentials generated in memory, confirmation links read from
Mailpit's API), so it needs no stored secrets. It covers registration, every API, wrong-password handling,
forgot password, passkey registration and sign-in (Chrome virtual authenticator) and the passkey-cancelled message.

## Troubleshooting

| Symptom | Check |
|---|---|
| Backend tests all fail at once | Docker Desktop isn't running (Testcontainers can't start containers) |
| Realm change has no effect | The realm is imported only into an empty DB: `docker compose down -v` |
| 429 from nginx | Edge limits in `infra/nginx/nginx.conf`; the BFF has its own in `superapp.bff.rate-limit` |
| Login loops back to Keycloak | `PUBLIC_URL` must match the browser's origin exactly (scheme, host, port) |
| Emails don't arrive | Mailpit UI at http://localhost:8025; Keycloak logs (`docker compose logs keycloak`) |
| Kafka consumers idle after boot | `NOT_COORDINATOR` lines for a few seconds at first start are normal |

More Keycloak-specific issues: [keycloak.md](keycloak.md#gotchas-we-hit-and-their-fixes).
