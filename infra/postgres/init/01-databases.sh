#!/usr/bin/env bash
# Creates two isolated databases with their own owners:
#   - the application database (owned by the BFF)
#   - the Keycloak database (owned by Keycloak; the app never touches it)
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
  -v app_db="$APP_DB_NAME" -v app_user="$APP_DB_USER" -v app_pw="$APP_DB_PASSWORD" \
  -v kc_db="$KEYCLOAK_DB_NAME" -v kc_user="$KEYCLOAK_DB_USER" -v kc_pw="$KEYCLOAK_DB_PASSWORD" <<-'EOSQL'
	CREATE ROLE :"app_user" LOGIN PASSWORD :'app_pw';
	CREATE DATABASE :"app_db" OWNER :"app_user";
	REVOKE ALL ON DATABASE :"app_db" FROM PUBLIC;

	CREATE ROLE :"kc_user" LOGIN PASSWORD :'kc_pw';
	CREATE DATABASE :"kc_db" OWNER :"kc_user";
	REVOKE ALL ON DATABASE :"kc_db" FROM PUBLIC;
EOSQL

# Lock down the public schema in each database to its owner only.
for pair in "$APP_DB_NAME:$APP_DB_USER" "$KEYCLOAK_DB_NAME:$KEYCLOAK_DB_USER"; do
  db="${pair%%:*}"; owner="${pair##*:}"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$db" <<-EOSQL
	ALTER SCHEMA public OWNER TO "$owner";
	REVOKE ALL ON SCHEMA public FROM PUBLIC;
EOSQL
done
