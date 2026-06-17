import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";

export type Database = {
  host_accounts: {
    id: string;
    email: string;
    created_at: Date;
  };
  host_sessions: {
    id: string;
    host_account_id: string;
    token_hash: string;
    expires_at: Date;
    last_seen_at: Date;
    created_at: Date;
  };
  rooms: {
    id: string;
    host_account_id: string;
    title: string;
    created_at: Date;
    updated_at: Date;
  };
  guest_invites: {
    id: string;
    room_id: string;
    token_hash: string;
    revoked_at: Date | null;
    created_at: Date;
  };
  broadcasts: {
    id: string;
    room_id: string;
    state: "countdown" | "broadcasting" | "ended" | "failed";
    failure_message: string | null;
    started_at: Date | null;
    ended_at: Date | null;
    created_at: Date;
  };
  broadcast_health_events: {
    id: string;
    broadcast_id: string;
    status: "connecting" | "connected" | "degraded" | "failed" | "ended";
    message: string | null;
    payload: unknown;
    created_at: Date;
  };
};

const { Pool } = pg;

export function createDatabase(databaseUrl = process.env.DATABASE_URL): Kysely<Database> {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for database access");
  }

  return new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({ connectionString: databaseUrl }),
    }),
  });
}
