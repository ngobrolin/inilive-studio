import type { Kysely } from "kysely";
import type { Database } from "$lib/server/db/database";
import type { BroadcastRecord, BroadcastStore } from "./store";

function mapRow(row: {
  id: string;
  room_id: string;
  state: "countdown" | "broadcasting" | "ended" | "failed";
  youtube_broadcast_id: string | null;
  failure_message: string | null;
  started_at: Date | null;
  ended_at: Date | null;
  created_at: Date;
  countdown_ends_at: Date | null;
}): BroadcastRecord {
  return {
    id: row.id,
    roomId: row.room_id,
    state: row.state,
    youtubeBroadcastId: row.youtube_broadcast_id,
    failureMessage: row.failure_message,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    createdAt: row.created_at,
    countdownEndsAt: row.countdown_ends_at,
  };
}

export function createPostgresBroadcastStore(db: Kysely<Database>): BroadcastStore {
  return {
    async createCountdownBroadcast(roomId, countdownEndsAt) {
      const row = await db
        .insertInto("broadcasts")
        .values({
          room_id: roomId,
          state: "countdown",
          countdown_ends_at: countdownEndsAt,
        })
        .returning([
          "id",
          "room_id",
          "state",
          "youtube_broadcast_id",
          "failure_message",
          "started_at",
          "ended_at",
          "created_at",
          "countdown_ends_at",
        ])
        .executeTakeFirstOrThrow();

      return mapRow(row);
    },

    async getBroadcastById(broadcastId) {
      const row = await db
        .selectFrom("broadcasts")
        .select([
          "id",
          "room_id",
          "state",
          "youtube_broadcast_id",
          "failure_message",
          "started_at",
          "ended_at",
          "created_at",
          "countdown_ends_at",
        ])
        .where("id", "=", broadcastId)
        .executeTakeFirst();

      return row ? mapRow(row) : null;
    },

    async getActiveBroadcast(roomId) {
      const row = await db
        .selectFrom("broadcasts")
        .select([
          "id",
          "room_id",
          "state",
          "youtube_broadcast_id",
          "failure_message",
          "started_at",
          "ended_at",
          "created_at",
          "countdown_ends_at",
        ])
        .where("room_id", "=", roomId)
        .where("state", "in", ["countdown", "broadcasting"])
        .orderBy("created_at", "desc")
        .executeTakeFirst();

      return row ? mapRow(row) : null;
    },

    async deleteBroadcast(broadcastId) {
      const result = await db
        .deleteFrom("broadcasts")
        .where("id", "=", broadcastId)
        .where("state", "=", "countdown")
        .executeTakeFirst();

      return Number(result.numDeletedRows) > 0;
    },

    async attachYouTubeBroadcast(broadcastId, youtubeBroadcastId) {
      const row = await db
        .updateTable("broadcasts")
        .set({ youtube_broadcast_id: youtubeBroadcastId })
        .where("id", "=", broadcastId)
        .returning([
          "id",
          "room_id",
          "state",
          "youtube_broadcast_id",
          "failure_message",
          "started_at",
          "ended_at",
          "created_at",
          "countdown_ends_at",
        ])
        .executeTakeFirst();

      return row ? mapRow(row) : null;
    },

    async markBroadcastBroadcasting(broadcastId, startedAt) {
      const row = await db
        .updateTable("broadcasts")
        .set({
          state: "broadcasting",
          started_at: startedAt,
          countdown_ends_at: null,
        })
        .where("id", "=", broadcastId)
        .where("state", "=", "countdown")
        .returning([
          "id",
          "room_id",
          "state",
          "youtube_broadcast_id",
          "failure_message",
          "started_at",
          "ended_at",
          "created_at",
          "countdown_ends_at",
        ])
        .executeTakeFirst();

      return row ? mapRow(row) : null;
    },

    async markBroadcastEnded(broadcastId, endedAt) {
      const row = await db
        .updateTable("broadcasts")
        .set({
          state: "ended",
          ended_at: endedAt,
          countdown_ends_at: null,
        })
        .where("id", "=", broadcastId)
        .where("state", "=", "broadcasting")
        .returning([
          "id",
          "room_id",
          "state",
          "youtube_broadcast_id",
          "failure_message",
          "started_at",
          "ended_at",
          "created_at",
          "countdown_ends_at",
        ])
        .executeTakeFirst();

      return row ? mapRow(row) : null;
    },

    async markBroadcastFailed(broadcastId, failureMessage, endedAt) {
      const row = await db
        .updateTable("broadcasts")
        .set({
          state: "failed",
          failure_message: failureMessage,
          ended_at: endedAt,
          countdown_ends_at: null,
        })
        .where("id", "=", broadcastId)
        .where("state", "=", "broadcasting")
        .returning([
          "id",
          "room_id",
          "state",
          "youtube_broadcast_id",
          "failure_message",
          "started_at",
          "ended_at",
          "created_at",
          "countdown_ends_at",
        ])
        .executeTakeFirst();

      return row ? mapRow(row) : null;
    },
  };
}
