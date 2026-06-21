import { env } from "$env/dynamic/private";
import { generateSecureToken } from "$lib/server/auth/tokens";
import { createDatabase } from "$lib/server/db/database";
import { createPostgresYouTubeStore } from "./postgres-store";
import { createInMemoryYouTubeStore, type YouTubeStore } from "./store";

let youtubeStore: YouTubeStore | null = null;
let inMemoryYouTubeStore: YouTubeStore | null = null;

export function getYouTubeStore(): YouTubeStore {
  if (youtubeStore) {
    return youtubeStore;
  }

  if (!env.DATABASE_URL) {
    inMemoryYouTubeStore ??= createInMemoryYouTubeStore();
    return inMemoryYouTubeStore;
  }

  return createPostgresYouTubeStore(createDatabase(env.DATABASE_URL));
}

export function getYouTubeOAuthConfig() {
  return {
    clientId: env.GOOGLE_CLIENT_ID ?? "dev-google-client-id",
    redirectUri: `${env.APP_ORIGIN ?? "http://localhost"}/youtube/callback`,
    createState: generateSecureToken,
  };
}

export function setYouTubeStoreForTests(store: YouTubeStore | null) {
  youtubeStore = store;
}

export function clearYouTubeRuntimeForTests() {
  youtubeStore = null;
}
