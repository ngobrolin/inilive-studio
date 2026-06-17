import { createDatabase } from "$lib/server/db/database";
import { createPostgresHealthEventStore } from "$lib/server/health/postgres-store";
import {
  createInMemoryHealthEventStore,
  type HealthEventStore,
} from "$lib/server/health/store";
import { env } from "$env/dynamic/private";

let healthEventStore: HealthEventStore | null = null;
let inMemoryHealthEventStore: HealthEventStore | null = null;

export function getHealthEventStore(): HealthEventStore {
  if (healthEventStore) {
    return healthEventStore;
  }

  if (!env.DATABASE_URL) {
    inMemoryHealthEventStore ??= createInMemoryHealthEventStore();
    return inMemoryHealthEventStore;
  }

  return createPostgresHealthEventStore(createDatabase(env.DATABASE_URL));
}

export function setHealthEventStoreForTests(store: HealthEventStore | null) {
  healthEventStore = store;
}

export function clearHealthEventStoreForTests() {
  healthEventStore = null;
  inMemoryHealthEventStore = null;
}
