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
  };
}
