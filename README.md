# SuperApp

<!-- template:start -->
## Start a new project from this template

```bash
git clone <this-repo-url> SuperApp
cd SuperApp
node scripts/init-project.mjs "Acme Shop" --fresh-git
```

The script (Node 22+, no dependencies) renames everything in place and then renames the folder:

| Template | Becomes (for `"Acme Shop"`) | Where |
|---|---|---|
| `superapp` | `acme-shop` | project folder, realm, OAuth clients, login/email themes, Docker images, npm packages, Spring config keys |
| `SuperApp` | `AcmeShop` | classes (`AcmeShopApplication`), product name in UI and emails |
| `SUPERAPP_*` | `ACME_SHOP_*` | environment variables |
| `com.superapp` | `com.acmeshop` (or `--package com.example.shop`) | Java packages of the backend and the Keycloak extensions |
| database `superapp` | `acme_shop` | app database name and user |

Options: `--package <java.package>`, `--fresh-git` (drop the template history, start a new repository with one commit),
`--dry-run`. The script refuses to run twice and deletes itself (and this section) when done. If the folder is open in
an editor or terminal on Windows, it prints the one command to rename it yourself.
<!-- template:end -->

A production-shaped starter: Spring Boot 4.1 / Java 25 **BFF** behind **nginx**, with **Keycloak 26.8** hidden behind
the BFF. The browser never holds a token.

| Folder | What |
|---|---|
| `backend/` | Spring Boot BFF (Gradle). Flyway migrations in `src/main/resources/db/migration` |
| `frontend/` | Product SPA (React 19, Vite, Tailwind 4, shadcn). Playwright e2e tests in `frontend/e2e` |
| `keycloakify/` | Keycloak login theme (Keycloakify, React), packaged into the Keycloak image |
| `keycloak/` | Keycloak image, realm JSON, email theme, Java extensions (Kafka events, legal consent) |
| `infra/` | nginx edge, Postgres init |
| `legal/` | Terms and Privacy Policy (shown in the app, versioned consent in Keycloak) |

Data stores are separate per side: the app has its own Postgres, Redis and Kafka; Keycloak has its own Postgres and
Kafka (Keycloak caches in memory, so it needs no Redis). Both React projects use **npm**.

## Run it

Needs Docker, plus JDK 25 and Node 22+ for local development.

```bash
cp .env.example .env
```

Change every `CHANGE_ME` value in `.env`, then:

```bash
docker compose up -d --build --wait
```

Open http://localhost:8080. Emails (verification, password reset) land in Mailpit at http://localhost:8025; the
Keycloak admin console is at http://localhost:8180/auth.

## Develop

| Task | Command |
|---|---|
| Backend tests (Docker running) | `cd backend && ./gradlew test` |
| SPA with hot reload (stack running) | `npm --prefix frontend run dev` → http://localhost:5173 |
| Login pages with mock data | `npm --prefix keycloakify run dev` → http://localhost:5174/?kc=login.ftl |
| Type check / lint | `npm run typecheck` and `npm run lint` in `frontend/` or `keycloakify/` |
| End-to-end tests (stack running) | `npm --prefix frontend run e2e` |

More: [docs/development.md](docs/development.md) · [docs/architecture.md](docs/architecture.md) ·
[docs/keycloak.md](docs/keycloak.md) · [docs/deployment.md](docs/deployment.md)
