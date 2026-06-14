# Use Podman Compose on the VPS

V1 should use Podman and Podman Compose on the persistent VPS to run the SvelteKit web app, Broadcast Bridge worker, Caddy reverse proxy (TLS termination), and supporting media tools as separate containers. This keeps deployment compatible with the Node-based stack while preserving simple single-server operations and avoiding Kubernetes or serverless deployment models. HTTPS is required for browser media APIs outside localhost.
