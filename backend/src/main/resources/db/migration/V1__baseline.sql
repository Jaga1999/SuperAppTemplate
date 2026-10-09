-- SuperApp baseline schema. Keycloak's data lives in its own database; nothing here mirrors credentials or sessions.

-- ── Users: minimal local projection of Keycloak users ───────────────────────
create table app_user (
    id              uuid primary key,                -- Keycloak user id (sub)
    email           varchar(320),
    email_verified  boolean      not null default false,
    display_name    varchar(255),
    given_name      varchar(255),
    family_name     varchar(255),
    picture_url     varchar(2048),
    status          varchar(16)  not null default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED', 'DELETED')),
    created_at      timestamptz  not null,
    updated_at      timestamptz  not null,
    last_login_at   timestamptz,
    deleted_at      timestamptz,
    version         bigint       not null default 0
);
create index app_user_created_at_idx on app_user (created_at desc);
-- Not unique on purpose: Keycloak is the authority on email uniqueness; the projection may lag briefly.
create index app_user_email_idx on app_user (lower(email));

-- ── Transactional outbox (relayed to Kafka by OutboxRelay) ──────────────────
create table outbox_event (
    id            uuid primary key,
    topic         varchar(249) not null,
    message_key   varchar(255) not null,
    event_type    varchar(128) not null,
    payload       jsonb        not null,
    created_at    timestamptz  not null,
    published_at  timestamptz,
    attempts      integer      not null default 0,
    last_error    text
);
create index outbox_event_pending_idx on outbox_event (created_at) where published_at is null;
create index outbox_event_published_idx on outbox_event (published_at) where published_at is not null;
