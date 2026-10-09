---
name: verify-stack
description: Build and verify the whole SuperApp stack end to end (backend tests, frontend checks, Docker images, health, e2e browser tests, log scan). Use before declaring work done, after dependency upgrades, or when the user asks to test or check everything.
---

# Verify the stack

Run in order; stop and fix at the first failure. Report each step's real result.

1. Backend (needs Docker Desktop running):
   ```bash
   cd backend && ./gradlew test
   ```
   Keycloak extensions (event listener, legal consent; includes a test that parses `legal/*.md`):
   ```bash
   cd keycloak/extensions/superapp-extensions && ./gradlew build
   ```
2. Frontend:
   ```bash
   pnpm --dir frontend typecheck
   ```
   ```bash
   pnpm --dir frontend lint
   ```
3. Images and health (every service must be `healthy`):
   ```bash
   docker compose up -d --build --wait
   ```
   ```bash
   docker compose ps
   ```
4. End to end (registration, legal consent once, all APIs, wrong password, forgot password, passkeys):
   ```bash
   pnpm --dir frontend/apps/e2e test
   ```
5. Log scan after the e2e run. Each count should be 0:
   ```bash
   docker compose logs backend | grep -cE '"level":"ERROR"'
   ```
   ```bash
   docker compose logs backend | grep -c 'logout token rejected'
   ```
   ```bash
   docker compose logs nginx | grep -cE '" (429|5[0-9][0-9]) '
   ```

Investigate any non-zero count before reporting success. If the realm JSON changed, the stack needs a fresh import
first (`docker compose down -v`, destructive: ask the user).
