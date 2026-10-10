# syntax=docker/dockerfile:1.7
# SuperApp Keycloak image. Build context: repository root.
#
#  1. theme  – builds the Keycloakify login theme JAR (keycloakify/, a standalone React project)
#  2. spi    – builds our Keycloak extensions (Java 25): Kafka event listener, legal-consent required action
#  3. build  – Keycloak 26.8.0 distribution on Temurin 25, providers added, `kc.sh build` (optimized image)
#  4. final  – minimal Temurin 25 JRE runtime, non-root

ARG KEYCLOAK_VERSION=26.8.0

# ── 1. Keycloakify theme ─────────────────────────────────────────────────────
FROM maven:3.10.0-eclipse-temurin-25-noble AS theme
COPY --from=node:24.21.0-trixie-slim /usr/local/bin/node /usr/local/bin/node
COPY --from=node:24.21.0-trixie-slim /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
 && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx \
 && node --version && npm --version && mvn --version
WORKDIR /src
# Only the theme project: product (frontend/) changes never rebuild Keycloak.
COPY keycloakify/package.json keycloakify/package-lock.json ./
RUN --mount=type=cache,id=npm,target=/root/.npm npm ci --no-audit --no-fund
COPY keycloakify/ ./
RUN --mount=type=cache,id=m2,target=/root/.m2 npm run build-keycloak-theme

# ── 2. Kafka event listener SPI ──────────────────────────────────────────────
FROM eclipse-temurin:25-jdk-noble AS spi
WORKDIR /src
# One Gradle wrapper for the whole repository: the backend's.
COPY backend/gradlew ./
COPY backend/gradle/ gradle/
COPY keycloak/extensions/ ./
RUN --mount=type=cache,id=gradle,target=/root/.gradle chmod +x gradlew && ./gradlew assemble --no-daemon --console=plain

# ── 3. Optimized Keycloak build on Java 25 ───────────────────────────────────
FROM quay.io/keycloak/keycloak:${KEYCLOAK_VERSION} AS distribution

FROM eclipse-temurin:25-jdk-ubi10-minimal AS build
COPY --from=distribution /opt/keycloak /opt/keycloak
COPY --from=theme /src/dist_keycloak/superapp-keycloak-theme.jar /opt/keycloak/providers/
COPY --from=spi   /src/build/providers/ /opt/keycloak/providers/
COPY keycloak/themes/ /opt/keycloak/themes/
# Legal documents: the legal-consent required action reads their versions at startup (single source: keycloak/legal/*.md)
COPY keycloak/legal/ /opt/keycloak/legal/
COPY keycloak/realm/ /opt/keycloak/data/import/
# Build-time options (baked into the optimized image).
# KC_FEATURES_DISABLED: deprecated features Keycloak enables by default that we don't use
# (identity-brokering-api v1: retrieving stored IdP tokens; twitter-broker v1: Twitter login).
ENV KC_DB=postgres \
    KC_HTTP_RELATIVE_PATH=/auth \
    KC_HEALTH_ENABLED=true \
    KC_METRICS_ENABLED=true \
    KC_FEATURES=passkeys,dpop,recovery-codes \
    KC_FEATURES_DISABLED=identity-brokering-api,twitter-broker \
    KC_CACHE=ispn
RUN /opt/keycloak/bin/kc.sh build

# ── 4. Runtime ───────────────────────────────────────────────────────────────
FROM eclipse-temurin:25-jre-ubi10-minimal
RUN microdnf install -y shadow-utils && microdnf clean all \
 && useradd --uid 1000 --gid 0 --no-create-home --home-dir /opt/keycloak keycloak
COPY --from=build --chown=1000:0 /opt/keycloak /opt/keycloak
USER 1000
# should-attach-route: deprecated option (default true). No sticky-session route suffix is needed: Keycloak pages are
# reached only through the BFF, and the Infinispan cluster shares auth sessions.
ENV KC_DB=postgres \
    KC_HTTP_RELATIVE_PATH=/auth \
    KC_HEALTH_ENABLED=true \
    KC_METRICS_ENABLED=true \
    KC_SPI_STICKY_SESSION_ENCODER__INFINISPAN__SHOULD_ATTACH_ROUTE=false \
    JAVA_OPTS_KC_HEAP="-XX:MaxRAMPercentage=70 -XX:InitialRAMPercentage=50"
EXPOSE 8080 9000
ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
