import type { Kysely } from "kysely";
import type { Database } from "$lib/server/db/database";
import type { HostRoom, RoomStore } from "./store";

export function createPostgresRoomStore(db: Kysely<Database>): RoomStore {
  return {
    async createRoom(hostAccountId, title, guestInviteTokenHash) {
      const row = await db.transaction().execute(async (trx) => {
        const room = await trx
          .insertInto("rooms")
          .values({
            host_account_id: hostAccountId,
            title,
          })
          .returning(["id", "host_account_id", "title", "created_at", "updated_at"])
          .executeTakeFirstOrThrow();

        await trx
          .insertInto("guest_invites")
          .values({
            room_id: room.id,
            token_hash: guestInviteTokenHash,
          })
          .executeTakeFirstOrThrow();

        return room;
      });

      return {
        id: row.id,
        hostAccountId: row.host_account_id,
        title: row.title,
        guestInviteToken: guestInviteTokenHash,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    },

    async listRoomsForHost(hostAccountId) {
      const rows = await db
        .selectFrom("rooms")
        .innerJoin("guest_invites", "guest_invites.room_id", "rooms.id")
        .select([
          "rooms.id",
          "rooms.host_account_id",
          "rooms.title",
          "rooms.created_at",
          "rooms.updated_at",
          "guest_invites.token_hash",
        ])
        .where("host_account_id", "=", hostAccountId)
        .where("guest_invites.revoked_at", "is", null)
        .orderBy("updated_at", "desc")
        .execute();

      return rows.map(
        (row): HostRoom => ({
          id: row.id,
          hostAccountId: row.host_account_id,
          title: row.title,
          guestInviteToken: row.token_hash,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }),
      );
    },

    async getRoom(roomId) {
      const row = await db
        .selectFrom("rooms")
        .select(["id", "host_account_id", "title", "created_at", "updated_at"])
        .where("id", "=", roomId)
        .executeTakeFirst();

      if (!row) {
        return null;
      }

      return {
        id: row.id,
        hostAccountId: row.host_account_id,
        title: row.title,
        guestInviteToken: "",
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    },

    async roomExists(roomId) {
      const row = await db
        .selectFrom("rooms")
        .select("id")
        .where("id", "=", roomId)
        .executeTakeFirst();

      return Boolean(row);
    },

    async hasActiveGuestInvite(roomId, tokenHash) {
      const row = await db
        .selectFrom("guest_invites")
        .select("id")
        .where("room_id", "=", roomId)
        .where("token_hash", "=", tokenHash)
        .where("revoked_at", "is", null)
        .executeTakeFirst();

      return Boolean(row);
    },

    async regenerateGuestInvite(hostAccountId, roomId, guestInviteTokenHash) {
      return db.transaction().execute(async (trx) => {
        const room = await trx
          .selectFrom("rooms")
          .select("id")
          .where("id", "=", roomId)
          .where("host_account_id", "=", hostAccountId)
          .executeTakeFirst();

        if (!room) {
          return false;
        }

        await trx
          .updateTable("guest_invites")
          .set({ revoked_at: new Date() })
          .where("room_id", "=", roomId)
          .where("revoked_at", "is", null)
          .execute();

        await trx
          .insertInto("guest_invites")
          .values({ room_id: roomId, token_hash: guestInviteTokenHash })
          .executeTakeFirstOrThrow();

        return true;
      });
    },
  };
}
