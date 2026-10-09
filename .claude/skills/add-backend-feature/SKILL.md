---
name: add-backend-feature
description: Add a new backend feature module (entity, migration, service, versioned REST API, events, tests) to the SuperApp Spring Boot BFF following its feature-package architecture. Use when asked to add a backend feature, domain, resource or endpoint group.
---

# Add a backend feature

Reference implementation: the `user` feature (`backend/src/main/java/com/superapp/user`: entity, repository, public
`UserDirectory` facade, controller, identity-event listener). Read it first, then mirror its shape.
Rules: `.agent/rules/backend.md`, `.agent/rules/security.md`, `.agent/rules/testing.md`.

## Steps

1. **Public API** — `com.superapp.<feature>`: only what other features may use (facade interface, sealed event
   interface of records with `TOPIC`, shared DTOs). Add `package-info.java` with `@NullMarked`.
2. **Internals** — `com.superapp.<feature>.internal`: entity (UUIDv7 id, `@Version`), repository, service,
   controller, errors. Prefer package-private classes.
3. **Migration** — new `backend/src/main/resources/db/migration/V<next>__<feature>.sql`. Check the highest existing
   version first. Never edit an applied migration.
4. **API** — `@RestController @RequestMapping(path = "/api/{version}/<plural>", version = "1")`. Records for requests
   (Bean Validation; optional fields as `@Nullable` wrappers) and responses. `CurrentUser user` for the caller.
   Ownership checks in the service; failures as `DomainException`.
5. **Events (if other features react)** — `Outbox.publish(TOPIC, ownerId, event)` inside the service transaction;
   declare topic and `.DLT` in `shared/config/KafkaTopicsConfig`; the consumer reads its own record and is idempotent.
6. **User deletion** — if the feature stores per-user data, delete it on `IdentityEvent.UserDeleted` (see
   `user/internal/UserProjection`).
7. **Tests** — service unit test; API tests in the `ApiIntegrationTest` style (same annotations so the context is
   reused): happy path, 400, 401/403, CSRF on writes.
8. **Frontend (if needed)** — use the `add-frontend-page` skill.

## Verify

```bash
cd backend && ./gradlew test
```

All tests green (including `ArchitectureTest`), zero compiler warnings. Then rebuild and smoke-test:
`docker compose up -d --build --wait backend`.
