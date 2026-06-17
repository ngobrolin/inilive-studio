import type { Kysely } from "kysely";
import type { Database } from "$lib/server/db/database";
import type { BroadcastHealthEventRecord, HealthEventStore } from "./store";

function mapRow(row: {
  id: string;
  broadcast_id: string;
  status: "connecting" | "connected" | "degraded" | "failed" | "ended";
  message: string | null;
  payload: unknown;
  created_at: Date;
}): BroadcastHealthEventRecord {
  return {
    id: row.id,
    broadcastId: row.broadcast_id,
    status: row.status,
    message: row.message,
    payload:
      row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
        ? (row.payload as Record<string, unknown>)
        : {},
    createdAt: row.created_at,
  };
}

export function createPostgresHealthEventStore(db: Kysely<Database>): HealthEventStore {
  return {
    async createEvent(input) {
      const row = await db
        .insertInto("broadcast_health_events")
        .values({
          broadcast_id: input.broadcastId,
          status: input.status,
          message: input.message,
          payload: input.payload,
        })
        .returning(["id", "broadcast_id", "status", "message", "payload", "created_at"])
        .executeTakeFirstOrThrow();

      return mapRow(row);
    },

    async listEventsForBroadcast(broadcastId) {
      const rows = await db
        .selectFrom("broadcast_health_events")
        .select(["id", "broadcast_id", "status", "message", "payload", "created_at"])
        .where("broadcast_id", "=", broadcastId)
        .orderBy("created_at", "asc")
        .execute();

      return rows.map(mapRow);
    },
  };
}
