import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Kysely } from "kysely";
import { createDatabase, type Database } from "$lib/server/db/database";
import { migrateDatabase } from "$lib/server/db/migrations";
import { createPostgresAuthStore } from "./postgres-store";
import { requestMagicLink } from "./magic-link";
import { exchangeMagicLinkForSession } from "./sessions";
import { createCapturingEmailSender } from "./email";

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)("postgres host auth integration", () => {
  let db: Kysely<Database>;
  const emailSender = createCapturingEmailSender();

  beforeAll(async () => {
    db = createDatabase(databaseUrl);
    await migrateDatabase(db);
  });

  afterAll(async () => {
    await db.destroy();
  });

  it("persists magic-link exchange as a Host session in Postgres", async () => {
    const store = createPostgresAuthStore(db);

    await requestMagicLink(
      { email: "postgres-host@example.com" },
      { store, sendEmail: emailSender.sendEmail },
    );

    const token = emailSender.getSentEmails().at(-1)?.token;
    expect(token).toBeTruthy();

    const exchange = await exchangeMagicLinkForSession({ token: token! }, { store });
    expect(exchange.error).toBeNull();

    const session = await store.findHostSession(exchange.sessionToken!);
    expect(session?.hostEmail).toBe("postgres-host@example.com");
  });
});
