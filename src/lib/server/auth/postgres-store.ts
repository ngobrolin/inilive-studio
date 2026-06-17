import type { Kysely } from "kysely";
import type { Database } from "$lib/server/db/database";
import type { AuthStore } from "./store";
import { hashToken } from "./tokens";

export function createPostgresAuthStore(db: Kysely<Database>): AuthStore {
  return {
    async findHostByEmail(email) {
      const row = await db
        .selectFrom("host_accounts")
        .select(["id", "email"])
        .where("email", "=", email.trim().toLowerCase())
        .executeTakeFirst();

      return row ? { id: row.id, email: row.email } : null;
    },

    async createHostAccount(email) {
      const normalizedEmail = email.trim().toLowerCase();
      const existing = await this.findHostByEmail(normalizedEmail);
      if (existing) {
        return existing;
      }

      const row = await db
        .insertInto("host_accounts")
        .values({ email: normalizedEmail })
        .returning(["id", "email"])
        .executeTakeFirstOrThrow();

      return { id: row.id, email: row.email };
    },

    async invalidateMagicLinksForHost(hostAccountId) {
      await db
        .updateTable("magic_link_tokens")
        .set({ used_at: new Date() })
        .where("host_account_id", "=", hostAccountId)
        .where("used_at", "is", null)
        .execute();
    },

    async createMagicLink(hostAccountId, tokenHash, expiresAt) {
      await db
        .insertInto("magic_link_tokens")
        .values({
          host_account_id: hostAccountId,
          token_hash: tokenHash,
          expires_at: expiresAt,
        })
        .execute();
    },

    async exchangeMagicLinkToken(token) {
      const tokenHash = hashToken(token);
      const link = await db
        .selectFrom("magic_link_tokens")
        .select(["id", "host_account_id", "expires_at", "used_at"])
        .where("token_hash", "=", tokenHash)
        .executeTakeFirst();

      if (!link || link.used_at || link.expires_at.getTime() <= Date.now()) {
        return null;
      }

      await db
        .updateTable("magic_link_tokens")
        .set({ used_at: new Date() })
        .where("id", "=", link.id)
        .execute();

      const host = await db
        .selectFrom("host_accounts")
        .select(["id", "email"])
        .where("id", "=", link.host_account_id)
        .executeTakeFirst();

      return host ? { id: host.id, email: host.email } : null;
    },

    async invalidateHostSessions(hostAccountId) {
      await db.deleteFrom("host_sessions").where("host_account_id", "=", hostAccountId).execute();
    },

    async createHostSession(hostAccountId, tokenHash, expiresAt) {
      const row = await db
        .insertInto("host_sessions")
        .values({
          host_account_id: hostAccountId,
          token_hash: tokenHash,
          expires_at: expiresAt,
        })
        .returning(["id", "host_account_id", "token_hash", "expires_at", "last_seen_at"])
        .executeTakeFirstOrThrow();

      return {
        id: row.id,
        hostAccountId: row.host_account_id,
        tokenHash: row.token_hash,
        expiresAt: row.expires_at,
        lastSeenAt: row.last_seen_at,
      };
    },

    async findHostSession(token) {
      const row = await db
        .selectFrom("host_sessions")
        .innerJoin("host_accounts", "host_accounts.id", "host_sessions.host_account_id")
        .select([
          "host_sessions.id",
          "host_sessions.host_account_id",
          "host_sessions.token_hash",
          "host_sessions.expires_at",
          "host_sessions.last_seen_at",
          "host_accounts.email as host_email",
        ])
        .where("host_sessions.token_hash", "=", hashToken(token))
        .executeTakeFirst();

      if (!row || row.expires_at.getTime() <= Date.now()) {
        return null;
      }

      return {
        id: row.id,
        hostAccountId: row.host_account_id,
        tokenHash: row.token_hash,
        expiresAt: row.expires_at,
        lastSeenAt: row.last_seen_at,
        hostEmail: row.host_email,
      };
    },

    async touchHostSession(sessionId, lastSeenAt) {
      await db
        .updateTable("host_sessions")
        .set({ last_seen_at: lastSeenAt })
        .where("id", "=", sessionId)
        .execute();
    },
  };
}
