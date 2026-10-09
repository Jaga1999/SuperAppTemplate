# syntax=docker/dockerfile:1.7
# Edge image: builds the React SPA (frontend/) and serves it with an unprivileged, read-only nginx.
# Build context: repository root.

FROM node:24.21.0-trixie-slim AS spa
WORKDIR /src
# Manifests first (cached install layer). Only the product SPA is built here; the login theme is in the Keycloak image.
COPY frontend/package.json frontend/package-lock.json ./
RUN --mount=type=cache,id=npm,target=/root/.npm npm ci --no-audit --no-fund
COPY frontend/ ./
# legal/*.md (repo root) is rendered by /legal/terms and /legal/privacy; vite alias @legal → ../legal = /legal
COPY legal/ /legal/
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.30.5-alpine
COPY infra/nginx/nginx.conf /etc/nginx/nginx.conf
COPY infra/nginx/templates/ /etc/nginx/templates/
COPY --from=spa /src/dist/ /usr/share/nginx/html/
EXPOSE 8080
