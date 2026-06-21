import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Kysely } from "kysely";
import { createPostgresAuthStore } from "$lib/server/auth/postgres-store";
import { createDatabase, type Database } from "$lib/server/db/database";
import { migrateDatabase } from "$lib/server/db/migrations";
import { createPostgresYouTubeStore } from "./postgres-store";

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)("postgres YouTube channel links integration", () => {
  let db: Kysely<Database>;

  beforeAll(async () => {
    db = createDatabase(databaseUrl);
    await migrateDatabase(db);
  });

  afterAll(async () => {
    await db.destroy();
  });

  it("deletes only the selected Host's linked channel", async () => {
    const authStore = createPostgresAuthStore(db);
    const firstHost = await authStore.createHostAccount(`youtube-host-${randomUUID()}@example.com`);
    const secondHost = await authStore.createHostAccount(
      `youtube-host-${randomUUID()}@example.com`,
    );
    const store = createPostgresYouTubeStore(db);
    await store.saveChannelLink({
      hostAccountId: firstHost.id,
      youtubeChannelId: `channel-${randomUUID()}`,
      youtubeChannelTitle: "First Channel",
      refreshTokenCiphertext: "first-encrypted-token",
    });
    await store.saveChannelLink({
      hostAccountId: secondHost.id,
      youtubeChannelId: `channel-${randomUUID()}`,
      youtubeChannelTitle: "Second Channel",
      refreshTokenCiphertext: "second-encrypted-token",
    });

    await store.deleteChannelLinkForHost(firstHost.id);

    await expect(store.getChannelLinkForHost(firstHost.id)).resolves.toBeNull();
    await expect(store.getChannelLinkForHost(secondHost.id)).resolves.toMatchObject({
      youtubeChannelTitle: "Second Channel",
    });
  });
});
