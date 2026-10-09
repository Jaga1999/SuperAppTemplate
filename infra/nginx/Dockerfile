# syntax=docker/dockerfile:1.7
# Edge image: unprivileged, read-only nginx. The only public entry point: pages go to the Next.js server,
# /api, /oauth2, /login/oauth2 and /auth go to the BFF. Build context: repository root.

FROM nginxinc/nginx-unprivileged:1.30.5-alpine
COPY infra/nginx/nginx.conf /etc/nginx/nginx.conf
COPY infra/nginx/templates/ /etc/nginx/templates/
EXPOSE 8080
