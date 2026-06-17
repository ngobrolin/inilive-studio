import type { Kysely } from "kysely";
import type { Database } from "$lib/server/db/database";
import type { HostRoom, RoomStore } from "./store";

export function createPostgresRoomStore(db: Kysely<Database>): RoomStore {
  return {
    async createRoom(hostAccountId, title) {
      const row = await db
        .insertInto("rooms")
        .values({
          host_account_id: hostAccountId,
          title,
        })
        .returning(["id", "host_account_id", "title", "created_at", "updated_at"])
        .executeTakeFirstOrThrow();

      return {
        id: row.id,
        hostAccountId: row.host_account_id,
        title: row.title,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    },

    async listRoomsForHost(hostAccountId) {
      const rows = await db
        .selectFrom("rooms")
        .select(["id", "host_account_id", "title", "created_at", "updated_at"])
        .where("host_account_id", "=", hostAccountId)
        .orderBy("updated_at", "desc")
        .execute();

      return rows.map(
        (row): HostRoom => ({
          id: row.id,
          hostAccountId: row.host_account_id,
          title: row.title,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }),
      );
    },
  };
}
