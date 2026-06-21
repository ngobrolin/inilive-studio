import { describe, expect, it } from "vitest";
import { readMigrationFiles } from "./migrations";

describe("database migrations", () => {
  it("keeps v1 product schema in ordered plain SQL migrations without persisted stream keys or Room Chat", async () => {
    const migrations = await readMigrationFiles();

    expect(migrations.map((migration) => migration.name)).toEqual([
      "0001_product_shell_foundation.sql",
      "0002_magic_link_tokens.sql",
      "0003_broadcast_countdown.sql",
      "0004_youtube_channel_links.sql",
    ]);
    expect(migrations[0]?.sql).toContain("CREATE TABLE host_accounts");
    expect(migrations[0]?.sql).toContain("CREATE TABLE host_sessions");
    expect(migrations[1]?.sql).toContain("CREATE TABLE magic_link_tokens");
    expect(migrations[0]?.sql).toContain("CREATE TABLE rooms");
    expect(migrations[0]?.sql).toContain("CREATE TABLE guest_invites");
    expect(migrations[0]?.sql).toContain("CREATE TABLE broadcasts");
    expect(migrations[0]?.sql).toContain("CREATE TABLE broadcast_health_events");
    expect(migrations[3]?.sql).toContain("CREATE TABLE youtube_oauth_states");
    expect(migrations[3]?.sql).toContain("CREATE TABLE youtube_channel_links");
    expect(migrations[3]?.sql).toContain("refresh_token_ciphertext");
    expect(migrations[0]?.sql).not.toMatch(/stream_key|room_chat|chat_messages/i);
  });
});
