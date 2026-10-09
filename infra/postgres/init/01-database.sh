#!/usr/bin/env bash
# Creates one database with its own non-superuser owner. Used by both Postgres instances:
#   - postgres           : the application database (owned by the BFF's user)
#   - keycloak-postgres  : the Keycloak database (owned by Keycloak's user)
# Inputs (container environment): DB_NAME, DB_USER, DB_PASSWORD.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
  -v db="$DB_NAME" -v db_user="$DB_USER" -v db_pw="$DB_PASSWORD" <<-'EOSQL'
	CREATE ROLE :"db_user" LOGIN PASSWORD :'db_pw';
	CREATE DATABASE :"db" OWNER :"db_user";
	REVOKE ALL ON DATABASE :"db" FROM PUBLIC;
EOSQL

# Lock down the public schema to its owner only.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$DB_NAME" <<-EOSQL
	ALTER SCHEMA public OWNER TO "$DB_USER";
	REVOKE ALL ON SCHEMA public FROM PUBLIC;
EOSQL
