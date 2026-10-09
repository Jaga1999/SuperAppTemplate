# syntax=docker/dockerfile:1.7
# Edge image: builds the React SPA and serves it with an unprivileged, read-only nginx.
# Build context: repository root.

FROM node:24.21.0-trixie-slim AS spa
WORKDIR /src
RUN corepack enable
# Manifests first (cached install layer). Only the web app and the design system are installed and built.
COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml frontend/tsconfig.base.json ./
COPY frontend/packages/ui/package.json packages/ui/
COPY frontend/apps/web/package.json apps/web/
COPY frontend/apps/keycloak-theme/package.json apps/keycloak-theme/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store     pnpm install --frozen-lockfile --filter "@superapp/web..."
COPY frontend/packages/ui/ packages/ui/
COPY frontend/apps/web/ apps/web/
# legal/*.md (repo root) is rendered by /legal/terms and /legal/privacy; vite alias @legal → ../../../legal = /legal
COPY legal/ /legal/
RUN pnpm --filter @superapp/web build

FROM nginxinc/nginx-unprivileged:1.30.5-alpine
COPY infra/nginx/nginx.conf /etc/nginx/nginx.conf
COPY infra/nginx/templates/ /etc/nginx/templates/
COPY --from=spa /src/apps/web/dist/ /usr/share/nginx/html/
EXPOSE 8080
