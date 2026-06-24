# iniLive Studio

iniLive Studio is a browser-based production Room for a signed-in Host and up to three Guests. Hosts can prepare in Backstage, bring Guests into a private Room, compose a 720p Room Feed, and broadcast it to YouTube through the local Broadcast Bridge.

This repository is a SvelteKit/TypeScript app with Vitest, Playwright, Tailwind CSS, Kysely, Postgres, and a Node/GStreamer Broadcast Bridge service.

## Requirements

- Node.js and npm
- Playwright browser dependencies, installed by the test script
- Podman or Docker-compatible Compose for local Postgres and the optional Broadcast Bridge
- LiveKit Cloud credentials for real multi-participant media testing
- Google OAuth credentials for managed YouTube broadcast testing

## Setup

```sh
npm install
cp .env.example .env
```

Fill in `.env` only with local credentials. Keep `.env` out of Git.

## Development

Start the SvelteKit development server:

```sh
npm run dev
```

Run the standard startup and smoke-test path used by this repo:

```sh
./init.sh
```

Set `RUN_START_COMMAND=1` if you want `init.sh` to launch the dev server after verification.

## Verification

```sh
npm test
npm run check
npm run lint
npm run fmt:check
npm run build
```

`npm test` runs Vitest and Playwright. Some integration tests are skipped unless the required external services and environment variables are configured.

## Build

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

## Local database

Product data uses Postgres through Compose, Kysely, and plain SQL migrations.

```sh
podman compose up -d postgres
export DATABASE_URL=postgres://inilive:inilive_dev_password@127.0.0.1:5432/inilive_studio
npm run db:migrate
npm run db:smoke
```

Migrations live in `src/lib/server/db/migrations/` and are intentionally plain SQL. Stream keys and Room Chat messages are not part of the persisted v1 schema.

## Local Broadcast Bridge

Live broadcasting with `BRIDGE_ENABLED=1` requires the separate Broadcast Bridge container. Start it before pressing **Start Broadcasting**:

```sh
podman compose --profile bridge up -d broadcast-bridge
```

The first run builds the pinned GStreamer image and can take several minutes. The bridge listens on:

- Control API: `http://127.0.0.1:8787`
- WHIP proxy: `http://127.0.0.1:8788`
- WebRTC media UDP ports: `8790-8810`

For local macOS Podman callbacks, set `BRIDGE_CALLBACK_ORIGIN=http://host.containers.internal:5173` when running `npm run dev`.

## Environment variables

See `.env.example` for the full local environment template. The most common variables are:

- `DATABASE_URL` for Postgres persistence
- `APP_ORIGIN` for absolute callback and magic-link URLs
- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` for media Rooms
- `BRIDGE_ENABLED`, `BRIDGE_CONTROL_URL`, `BRIDGE_WHIP_URL`, and `BRIDGE_CALLBACK_HMAC_SECRET` for local broadcasting
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `YOUTUBE_REFRESH_TOKEN_ENCRYPTION_KEY` for managed YouTube broadcasts

## Publishing checklist

Before publishing this repository to GitHub:

1. Confirm `.env` and other local credential files are not tracked.
2. Run `./init.sh` and any additional gates relevant to the change.
3. Run a secret scan such as `gitleaks detect --source .` if available.
4. Decide whether planning artifacts such as `PLAN.org`, `PROGRESS.org`, `CONTEXT.md`, and `session-handoff.md` should be public.
5. Add a `LICENSE` file if this repository will be public and reusable.

## License

MIT. See `LICENSE`.
