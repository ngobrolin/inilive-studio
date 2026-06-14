# Use Plain SQL Migrations

V1 should store database migrations as plain SQL files and run them with a small migration runner. Postgres is the only v1 database, and SQL migrations keep schema changes easy to inspect, review, and repair while Kysely remains focused on application queries.
