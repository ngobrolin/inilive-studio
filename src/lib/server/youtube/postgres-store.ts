import type { Kysely } from "kysely";
import type { Database } from "$lib/server/db/database";
import type { YouTubeStore } from "./store";

export function createPostgresYouTubeStore(db: Kysely<Database>): YouTubeStore {
  return {
    async saveOAuthState(state) {
      await db
        .insertInto("youtube_oauth_states")
        .values({
          state: state.state,
          host_account_id: state.hostAccountId,
          expires_at: state.expiresAt,
        })
        .executeTakeFirstOrThrow();
    },

    async consumeOAuthState(state) {
      return db.transaction().execute(async (trx) => {
        const row = await trx
          .selectFrom("youtube_oauth_states")
          .select(["state", "host_account_id", "expires_at"])
          .where("state", "=", state)
          .where("consumed_at", "is", null)
          .where("expires_at", ">", new Date())
          .executeTakeFirst();

        if (!row) {
          return null;
        }

        await trx
          .updateTable("youtube_oauth_states")
          .set({ consumed_at: new Date() })
          .where("state", "=", state)
          .execute();

        return {
          state: row.state,
          hostAccountId: row.host_account_id,
          expiresAt: row.expires_at,
        };
      });
    },

    async saveChannelLink(link) {
      await db
        .insertInto("youtube_channel_links")
        .values({
          host_account_id: link.hostAccountId,
          youtube_channel_id: link.youtubeChannelId,
          youtube_channel_title: link.youtubeChannelTitle,
          refresh_token_ciphertext: link.refreshTokenCiphertext,
        })
        .onConflict((oc) =>
          oc.column("host_account_id").doUpdateSet({
            youtube_channel_id: link.youtubeChannelId,
            youtube_channel_title: link.youtubeChannelTitle,
            refresh_token_ciphertext: link.refreshTokenCiphertext,
            updated_at: new Date(),
          }),
        )
        .executeTakeFirstOrThrow();
    },

    async getChannelLinkForHost(hostAccountId) {
      const row = await db
        .selectFrom("youtube_channel_links")
        .select([
          "host_account_id",
          "youtube_channel_id",
          "youtube_channel_title",
          "refresh_token_ciphertext",
        ])
        .where("host_account_id", "=", hostAccountId)
        .executeTakeFirst();

      if (!row) {
        return null;
      }

      return {
        hostAccountId: row.host_account_id,
        youtubeChannelId: row.youtube_channel_id,
        youtubeChannelTitle: row.youtube_channel_title,
        refreshTokenCiphertext: row.refresh_token_ciphertext,
      };
    },
  };
}
