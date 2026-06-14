# Run Postgres Under Podman Compose for V1

V1 should run Postgres as a Podman Compose service with persistent database storage on the VPS. This is operationally clearer than managing SQLite files inside containers and gives the product a straightforward path to backups, concurrent writes, and eventual migration to managed Postgres if the app outgrows the single-server setup.
