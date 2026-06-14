# Deploy V1 on a Persistent VPS

V1 should run on a persistent VPS or equivalent single-server host with durable disk storage. This matches the Podman Compose deployment model for the SvelteKit web app, Postgres, and Broadcast Bridge worker, and avoids serverless or multi-instance deployment models where long-lived signaling connections and broadcast bridge processes are harder to reason about.
