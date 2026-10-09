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
