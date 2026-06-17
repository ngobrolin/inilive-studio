import { Kysely, PostgresDialect, type Generated } from "kysely";
import pg from "pg";

export type Database = {
  schema_migrations: {
    name: string;
    applied_at: Generated<Date>;
  };
  host_accounts: {
    id: Generated<string>;
    email: string;
    created_at: Generated<Date>;
  };
  host_sessions: {
    id: Generated<string>;
    host_account_id: string;
    token_hash: string;
    expires_at: Date;
    last_seen_at: Generated<Date>;
    created_at: Generated<Date>;
  };
  magic_link_tokens: {
    id: Generated<string>;
    host_account_id: string;
    token_hash: string;
    expires_at: Date;
    used_at: Date | null;
    created_at: Generated<Date>;
  };
  rooms: {
    id: Generated<string>;
    host_account_id: string;
    title: string;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
  };
  guest_invites: {
    id: Generated<string>;
    room_id: string;
    token_hash: string;
    revoked_at: Date | null;
    created_at: Generated<Date>;
  };
  broadcasts: {
    id: Generated<string>;
    room_id: string;
    state: "countdown" | "broadcasting" | "ended" | "failed";
    failure_message: string | null;
    started_at: Date | null;
    ended_at: Date | null;
    created_at: Generated<Date>;
    countdown_ends_at: Date | null;
  };
  broadcast_health_events: {
    id: Generated<string>;
    broadcast_id: string;
    status: "connecting" | "connected" | "degraded" | "failed" | "ended";
    message: string | null;
    payload: unknown;
    created_at: Generated<Date>;
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
