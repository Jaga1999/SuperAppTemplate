# syntax=docker/dockerfile:1.7
# SuperApp product app (Next.js standalone server). Build context: repository root.
# It talks to nobody: browsers call the BFF through nginx; this server only renders pages.

FROM node:24.21.0-trixie-slim AS deps
WORKDIR /src
COPY frontend/package.json frontend/package-lock.json ./
RUN --mount=type=cache,id=npm,target=/root/.npm npm ci --no-audit --no-fund

FROM node:24.21.0-trixie-slim AS build
WORKDIR /src
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /src/node_modules ./node_modules
COPY frontend/ ./
RUN npm run build

FROM node:24.21.0-trixie-slim
RUN groupadd --system --gid 10001 app && useradd --system --uid 10001 --gid app --no-create-home app
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=app:app /src/.next/standalone ./
COPY --from=build --chown=app:app /src/.next/static ./.next/static
# keycloak/legal/*.md backs /legal/terms and /legal/privacy; read at runtime from ../keycloak/legal (= /keycloak/legal).
COPY --chown=app:app keycloak/legal/ /keycloak/legal/
USER app
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/manifest.webmanifest').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "server.js"]
