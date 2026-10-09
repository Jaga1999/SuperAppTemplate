# Backend rules (Spring Boot 4.1, Java 25, Gradle Kotlin DSL)

## Structure

- Feature packages under `com.superapp`: `auth`, `identity`, `user`, `admin`, plus `shared`.
- A feature's root package is its public API (facades, events, DTOs). Implementation lives in `<feature>.internal`.
- Never import another feature's `internal` package. `shared` imports no feature. No cycles. `ArchitectureTest` enforces
  this; don't weaken it.
- Cross-feature communication: public interfaces (`UserDirectory`, `IdentityDirectory`, `SessionRevocation`) or events.

## Code

- Java 25: records for data, sealed interfaces plus pattern-matching `switch`, `_` for unused variables, flexible
  constructor bodies, `ScopedValue` instead of `ThreadLocal`, virtual threads (already on).
- Null safety: JSpecify. Packages are `@NullMarked`; mark nullable things with `@Nullable`.
- Constructor injection only. Configuration via `@ConfigurationProperties` records, never scattered `@Value`
  (exception: single values in `@Configuration` classes).
- Imports, not fully qualified names. Compiler runs with `-Werror` and `-Xlint` (deprecation, removal, unchecked,
  rawtypes, ...).
- Use the Spring Framework 7 / Boot 4 way: API versioning (`@RequestMapping(path = "/api/{version}/…", version = "1")`),
  `@HttpExchange` clients registered with `@ImportHttpServices`, `@Retryable` from `org.springframework.resilience`,
  `RestClient`, `JdbcClient`, `MockMvcTester`.

## HTTP API

- Base path `/api/v1/…`. JSON records in and out. Bean Validation on every input.
- Errors: throw `DomainException` (slug, title, detail) → RFC 9457 problem details. Never hand-build error bodies.
- The signed-in user is a `CurrentUser` parameter; authorize ownership in the service, roles with method security.
- `@RequestParam` only for query strings. Form bodies: `@RequestBody MultiValueMap<String, String>` (Spring Cloud
  Gateway's `FormFilter` hides form fields from `@RequestParam`).

## JSON (Jackson 3, `tools.jackson`)

- Inject the Boot-managed `JsonMapper`; never create one. Policy: `shared/config/JacksonConfig`.
- Optional fields are nullable wrappers (`@Nullable Boolean`), never primitives. Primitive = required.
- Inbound contracts from other systems (Keycloak, Kafka): mark required fields `@JsonProperty(required = true)`;
  consumers define their own records instead of reusing the producer's classes.
- Annotations stay in `com.fasterxml.jackson.annotation` (shared by Jackson 2 and 3); everything else is `tools.jackson`.

## Persistence and events

- Schema only through Flyway (`db/migration/V<n>__*.sql`); `ddl-auto: none`.
- Integration events go through `Outbox.publish(...)` in the business transaction (`Propagation.MANDATORY`).
- New topic → declare it and its `.DLT` in `KafkaTopicsConfig`. Consumers are idempotent (de-duplicate on `eventId`).
- Times are `Instant` in UTC; the JVM runs with `-Duser.timezone=UTC`.
