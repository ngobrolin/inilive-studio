# Use SvelteKit, Node, and Postgres for V1

V1 should use SvelteKit on a Node runtime with Postgres as the application database. This fits the Podman Compose deployment model, gives the app a standard hosted database for Accounts, reusable Rooms, Guest Invites, Broadcast records, and Broadcast Health, and leaves the hardest risks where they belong: the Room experience, WebRTC SFU integration, browser-composed output, and Broadcast Bridge.
