import { createDatabase } from "$lib/server/db/database";
import { createPostgresAuthStore } from "$lib/server/auth/postgres-store";
import {
  createConsoleMagicLinkEmailSender,
  createCapturingEmailSender,
} from "$lib/server/auth/email";
import { createInMemoryAuthStore, type AuthStore } from "$lib/server/auth/store";
import type { MagicLinkEmailSender } from "$lib/server/auth/magic-link";
import { env } from "$env/dynamic/private";

let authStore: AuthStore | null = null;
let emailSender: MagicLinkEmailSender | null = null;
let capturingEmailSender: ReturnType<typeof createCapturingEmailSender> | null = null;
let inMemoryAuthStore: AuthStore | null = null;

export function getAuthStore(): AuthStore {
  if (authStore) {
    return authStore;
  }

  if (!env.DATABASE_URL) {
    inMemoryAuthStore ??= createInMemoryAuthStore();
    return inMemoryAuthStore;
  }

  return createPostgresAuthStore(createDatabase(env.DATABASE_URL));
}

export function getMagicLinkEmailSender(): MagicLinkEmailSender {
  if (emailSender) {
    return emailSender;
  }

  if (!env.DATABASE_URL) {
    capturingEmailSender ??= createCapturingEmailSender();
    return capturingEmailSender.sendEmail;
  }

  return createConsoleMagicLinkEmailSender(env.APP_ORIGIN ?? "http://127.0.0.1:5173");
}

export function getCapturedMagicLinkEmails() {
  return capturingEmailSender?.getSentEmails() ?? [];
}

export function setAuthRuntimeForTests(input: {
  store?: AuthStore | null;
  sendEmail?: MagicLinkEmailSender | null;
}) {
  authStore = input.store ?? null;
  emailSender = input.sendEmail ?? null;
}

export function clearAuthRuntimeForTests() {
  authStore = null;
  emailSender = null;
}
