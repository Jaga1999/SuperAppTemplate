# Deployment checklist

`compose.yaml` alone is the production shape (no `compose.override.yaml`): only nginx publishes a port. Use it as is on
a single host, or translate it to your orchestrator. Go through every item before going live.

## Secrets and configuration

- [ ] Every value in `.env` is unique and random (generate with `openssl rand -base64 32`). Use your platform's secret
      store, not a file on disk.
- [ ] `PUBLIC_URL` is the exact public origin (`https://app.example.com`, no trailing slash).
- [ ] `BFF_COOKIE_SECURE=true` (it may only be false for plain-http localhost development).
- [ ] `BFF_COOKIE_ENCRYPTION_KEY` is 32 random bytes. Rotating it signs every user out.
- [ ] Seed users removed from the realm JSON, or their passwords changed and the accounts disabled.
- [ ] `KEYCLOAK_BOOTSTRAP_ADMIN_*` used once to create a real admin with MFA, then the bootstrap admin deleted.

## Network and TLS

- [ ] TLS terminates at nginx (add a `listen 443 ssl` server with your certificates) or at a load balancer in front of it.
- [ ] HSTS enabled once HTTPS works everywhere.
- [ ] Behind a cloud load balancer or CDN: configure nginx `real_ip_header` / `set_real_ip_from` so `$remote_addr` is
      the client, because nginx overwrites `X-Forwarded-For` with it.
- [ ] The BFF, Keycloak, Postgres, Redis and Kafka are reachable **only** from the private network. The BFF trusts all
      `X-Forwarded-*` values (`trusted-proxies: ".*"`), which is safe only while nginx is its sole ingress.
- [ ] nginx blocks `/api/auth/backchannel-logout` from the outside (already in the template); Keycloak reaches it
      internally.

## Keycloak

- [ ] Hostname: `KC_HOSTNAME` = `${PUBLIC_URL}/auth`; admin console on a separate internal hostname
      (`KC_HOSTNAME_ADMIN`) or not exposed at all.
- [ ] Real SMTP (`SMTP_*`) with SPF/DKIM for the sender domain; send a test email from the admin console.
- [ ] Google OAuth client for the production redirect URI
      `${PUBLIC_URL}/auth/realms/superapp/broker/google/endpoint`, and the OAuth consent screen published.
- [ ] Realm changes after go-live are applied with the admin API or a migration tool, never by re-importing over an
      existing realm.
- [ ] Database backups for the `keycloak` database (it holds users, credentials and passkeys).

## Data and messaging

- [ ] Managed Postgres with backups and point-in-time recovery for both databases.
- [ ] Redis with a password and persistence (revocation markers must survive restarts; they expire on their own).
- [ ] Kafka with 3 brokers: set `superapp.kafka.replicas=3`. If topics are provisioned by infrastructure-as-code, set
      `spring.kafka.admin.auto-create=false`.
- [ ] Monitor the `.DLT` topics; a message there needs a human.

## Operations

- [ ] Health: nginx `/nginx-health`; BFF `:9090/actuator/health/readiness` (management port stays internal).
- [ ] Metrics: Prometheus scrapes `:9090/actuator/prometheus` (BFF) and `:9000/auth/metrics` (Keycloak).
- [ ] Logs: the `docker` profile emits ECS JSON with request ids; ship them to your log store.
- [ ] Rate limits reviewed for real traffic (`infra/nginx/nginx.conf`, `superapp.bff.rate-limit.*`).
- [ ] Run the e2e suite against staging: `E2E_BASE_URL=https://staging.example.com npm --prefix frontend run e2e`
      (needs a reachable mail API, or adapt `linkFromEmail`).
