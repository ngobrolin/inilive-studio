import { createDatabase } from "$lib/server/db/database";
import { createPostgresRoomStore } from "$lib/server/rooms/postgres-store";
import { createInMemoryRoomStore, type RoomStore } from "$lib/server/rooms/store";
import { env } from "$env/dynamic/private";

let roomStore: RoomStore | null = null;
let inMemoryRoomStore: RoomStore | null = null;

export function getRoomStore(): RoomStore {
  if (roomStore) {
    return roomStore;
  }

  if (!env.DATABASE_URL) {
    inMemoryRoomStore ??= createInMemoryRoomStore();
    return inMemoryRoomStore;
  }

  return createPostgresRoomStore(createDatabase(env.DATABASE_URL));
}

export function setRoomStoreForTests(store: RoomStore | null) {
  roomStore = store;
}

export function clearRoomStoreForTests() {
  roomStore = null;
}
