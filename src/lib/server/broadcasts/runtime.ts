import { createDatabase } from "$lib/server/db/database";
import { createPostgresBroadcastStore } from "$lib/server/broadcasts/postgres-store";
import { createInMemoryBroadcastStore, type BroadcastStore } from "$lib/server/broadcasts/store";
import { env } from "$env/dynamic/private";

let broadcastStore: BroadcastStore | null = null;
let inMemoryBroadcastStore: BroadcastStore | null = null;

export function getBroadcastStore(): BroadcastStore {
  if (broadcastStore) {
    return broadcastStore;
  }

  if (!env.DATABASE_URL) {
    inMemoryBroadcastStore ??= createInMemoryBroadcastStore();
    return inMemoryBroadcastStore;
  }

  return createPostgresBroadcastStore(createDatabase(env.DATABASE_URL));
}

export function setBroadcastStoreForTests(store: BroadcastStore | null) {
  broadcastStore = store;
}

export function clearBroadcastStoreForTests() {
  broadcastStore = null;
  inMemoryBroadcastStore = null;
}
