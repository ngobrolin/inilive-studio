# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
npx sv@0.16.1 create --template minimal --types ts --add vitest="usages:unit,component" playwright tailwindcss="plugins:none" sveltekit-adapter="adapter:node" --install npm .
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Local database

Milestone 3 product data uses Postgres through Podman Compose, Kysely, and plain SQL migrations.

```sh
podman compose up -d postgres
export DATABASE_URL=postgres://inilive:inilive_dev_password@127.0.0.1:5432/inilive_studio
npm run db:migrate
npm run db:smoke
```

Migrations live in `src/lib/server/db/migrations/` and are intentionally plain SQL. Stream keys and Room Chat messages are not part of the persisted v1 schema.
