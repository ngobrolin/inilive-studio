import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Kysely } from "kysely";
import { createDatabase, type Database } from "$lib/server/db/database";
import { migrateDatabase } from "$lib/server/db/migrations";
import { createPostgresAuthStore } from "$lib/server/auth/postgres-store";
import { createPostgresRoomStore } from "./postgres-store";
import { createHostRoom, listHostRooms } from "./rooms";

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)("postgres host rooms integration", () => {
  let db: Kysely<Database>;

  beforeAll(async () => {
    db = createDatabase(databaseUrl);
    await migrateDatabase(db);
  });

  afterAll(async () => {
    await db.destroy();
  });

  it("persists reusable Host Rooms across fresh store connections", async () => {
    const authStore = createPostgresAuthStore(db);
    const host = await authStore.createHostAccount(`rooms-host-${randomUUID()}@example.com`);

    const writeStore = createPostgresRoomStore(db);
    await createHostRoom({ hostAccountId: host.id, title: "Weekly show" }, { store: writeStore });
    await createHostRoom({ hostAccountId: host.id, title: "Guest hour" }, { store: writeStore });

    const readStore = createPostgresRoomStore(db);
    const rooms = await listHostRooms(host.id, { store: readStore });

    expect(rooms.map((room) => room.title)).toEqual(["Guest hour", "Weekly show"]);
  });
});
