# SuperApp

<!-- template:start -->
## Start a new project from this template

From your local copy of the template, create a project in a new folder (the template stays untouched, so you can
reuse it as often as you like):

```bash
node scripts/init-project.mjs "Acme Shop" ../acme-shop --fresh-git
```

The name is optional when you give a folder (`node scripts/init-project.mjs ../acme-shop` names it `acme-shop`).
The copy includes everything except git history, build output and `node_modules`: sources, docs, your `.env`
(renamed to match; review it and use new secrets for a new product) and the agent setup (`AGENTS.md`, `CLAUDE.md`,
`.claude/` settings and skills).

Or convert a fresh clone in place (this also renames its folder):

```bash
node scripts/init-project.mjs "Acme Shop" --fresh-git
```

Or straight from GitHub, without cloning anything yourself (needs Node 22+ and git). Set `"repository"` in the root
`package.json` to your repo first (e.g. `"github:you/SuperApp"`):

```bash
npx github:you/SuperApp "Acme Shop" --fresh-git
```

npm fetches only the generator script; it shallow-clones the template from `repository` and creates `./acme-shop`.
A project created this way gets a fresh `.env` from `.env.example` with generated secrets (your local `.env` is never
on GitHub): add your Google client and SMTP settings to it. `--from <git-url>` clones any other repository or fork.

The script (Node 22+, no dependencies) renames every spelling of the template name:

| Template | Becomes (for `"Acme Shop"`) | Where |
|---|---|---|
| `superapp` | `acme-shop` | project folder, realm, OAuth clients, login/email themes, Docker images, npm packages, Spring config keys |
| `SuperApp` | `AcmeShop` | classes (`AcmeShopApplication`), product name in UI and emails |
| `SUPERAPP_*` | `ACME_SHOP_*` | environment variables |
| `com.superapp` | `com.acmeshop` (or `--package com.example.shop`) | Java packages of the backend and the Keycloak extensions |
| database `superapp` | `acme_shop` | app database name and user |

Options: `--package <java.package>`, `--fresh-git` (drop the template history, start a new repository with one commit),
`--dry-run`. The new project gets no copy of the script or of this section. In place, the script refuses to run
twice, and if the folder is open in an editor or terminal on Windows it prints the one command to rename it yourself.
<!-- template:end -->

A production-shaped starter: Spring Boot 4.1 / Java 25 **BFF** behind **nginx**, with **Keycloak 26.8** hidden behind
the BFF. The browser never holds a token.

| Folder | What |
|---|---|
| `backend/` | Spring Boot BFF (Gradle). Flyway migrations in `src/main/resources/db/migration` |
| `frontend/` | Product app: Next.js 16 (App Router), React 19, TanStack Query, Zustand, Tailwind 4, shadcn. Playwright e2e in `frontend/e2e` |
| `keycloakify/` | Keycloak login theme (Keycloakify, React + Vite), packaged into the Keycloak image |
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

Open http://localhost:8080: landing page, Keycloak sign-in/sign-up (themed), then the app with profile, security
and devices settings. Users with the `admin` role also get the admin area: an overview, all users, and each user's
sign-in methods and live sessions (end one, or sign them out everywhere). Roles: `user` (everyone) and `admin`
(seed user `admin@superapp.local`). Emails (verification, password reset) land in Mailpit at http://localhost:8025; the
Keycloak admin console is at http://localhost:8180/auth.

## Develop

| Task | Command |
|---|---|
| Backend tests (Docker running) | `cd backend && ./gradlew test` |
| App with hot reload (stack running) | `npm --prefix frontend run dev` → http://localhost:5173 |
| Login pages with mock data | `npm --prefix keycloakify run dev` → http://localhost:5174/?kc=login.ftl |
| Type check / lint | `npm run typecheck` and `npm run lint` in `frontend/` or `keycloakify/` |
| End-to-end tests (stack running) | `npm --prefix frontend run e2e` |
| API docs (Swagger UI) | http://localhost:8081/swagger-ui.html (BFF port, never routed by nginx) |

More: [docs/development.md](docs/development.md) · [docs/architecture.md](docs/architecture.md) ·
[docs/keycloak.md](docs/keycloak.md) · [docs/deployment.md](docs/deployment.md)
