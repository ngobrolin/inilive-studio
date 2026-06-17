import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Kysely } from "kysely";
import { createDatabase, type Database } from "$lib/server/db/database";
import { migrateDatabase } from "$lib/server/db/migrations";
import { createPostgresAuthStore } from "$lib/server/auth/postgres-store";
import { createPostgresBroadcastStore } from "$lib/server/broadcasts/postgres-store";
import { createPostgresRoomStore } from "$lib/server/rooms/postgres-store";
import { createHostRoom } from "$lib/server/rooms/rooms";
import { recordBroadcastHealthEvent } from "./health";
import { createPostgresHealthEventStore } from "./postgres-store";

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)("postgres broadcast health events integration", () => {
  let db: Kysely<Database>;

  beforeAll(async () => {
    db = createDatabase(databaseUrl);
    await migrateDatabase(db);
  });

  afterAll(async () => {
    await db.destroy();
  });

  it("persists Broadcast Health events for a product Broadcast", async () => {
    const authStore = createPostgresAuthStore(db);
    const host = await authStore.createHostAccount(`health-host-${randomUUID()}@example.com`);
    const roomStore = createPostgresRoomStore(db);
    const room = await createHostRoom(
      { hostAccountId: host.id, title: "Health event room" },
      { store: roomStore },
    );
    const broadcastStore = createPostgresBroadcastStore(db);
    const broadcast = await broadcastStore.createCountdownBroadcast(
      room.room!.id,
      new Date(Date.now() + 5_000),
    );
    await broadcastStore.markBroadcastBroadcasting(broadcast.id, new Date());

    const writeStore = createPostgresHealthEventStore(db);
    await recordBroadcastHealthEvent(
      {
        broadcastId: broadcast.id,
        status: "connected",
        message: "Broadcast Bridge is connected.",
        payload: { status: "connected", message: "Broadcast Bridge is connected." },
      },
      { store: writeStore },
    );

    const readStore = createPostgresHealthEventStore(db);
    const events = await readStore.listEventsForBroadcast(broadcast.id);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      broadcastId: broadcast.id,
      status: "connected",
      message: "Broadcast Bridge is connected.",
    });
  });
});
