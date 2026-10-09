# Testing rules

| Level | Tooling | Where |
|---|---|---|
| Unit | JUnit 5, AssertJ | `backend/src/test/.../<feature>/internal` |
| API / integration | `@SpringBootTest` + `MockMvcTester`, Testcontainers 2 (Postgres, Redis, Kafka) | `ApiIntegrationTest` pattern |
| Architecture | ArchUnit | `ArchitectureTest` |
| End to end | Playwright (Chrome channel) against the running stack | `frontend/e2e` |

- Every bug fix comes with a test that fails without the fix.
- New endpoints: test the happy path, validation (400), authorization (401/403), and CSRF for writes.
- Integration tests reuse one Spring context: same annotations and properties as `ApiIntegrationTest`, otherwise a
  new context (and new containers) starts.
- Container images in tests are pinned in `TestcontainersConfiguration` to the versions in `compose.yaml`.
- e2e tests create their own fresh account per run (`newIdentity()`), read confirmation links from Mailpit's API, and
  never depend on seed passwords or `.env`. Passkeys use the Chrome DevTools virtual authenticator.
- Never weaken an assertion to make a test pass, and never skip a failing test without reporting it.
