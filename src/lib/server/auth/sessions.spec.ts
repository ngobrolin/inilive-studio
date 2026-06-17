import { beforeEach, describe, expect, it } from "vitest";
import {
  exchangeMagicLinkForSession,
  SESSION_ABSOLUTE_TTL_MS,
  SESSION_SLIDING_TTL_MS,
} from "./sessions";
import { createInMemoryAuthStore, type AuthStore } from "./store";
import { generateSecureToken, hashToken } from "./tokens";

describe("host sessions", () => {
  let store: AuthStore;

  beforeEach(() => {
    store = createInMemoryAuthStore();
  });

  it("creates a Host session when a valid magic link token is exchanged once", async () => {
    const host = await store.createHostAccount("host@example.com");
    const token = generateSecureToken();
    await store.createMagicLink(host.id, hashToken(token), new Date(Date.now() + 60_000));

    const first = await exchangeMagicLinkForSession({ token }, { store });
    const second = await exchangeMagicLinkForSession({ token }, { store });

    expect(first.error).toBeNull();
    expect(first.sessionToken).toMatch(/^session_/);
    expect(first.hostEmail).toBe("host@example.com");
    expect(second.error).toBe("invalid_or_expired_token");
  });

  it("rejects expired magic link tokens", async () => {
    const host = await store.createHostAccount("host@example.com");
    const token = generateSecureToken();
    await store.createMagicLink(host.id, hashToken(token), new Date(Date.now() - 1_000));

    const result = await exchangeMagicLinkForSession({ token }, { store });

    expect(result.sessionToken).toBeNull();
    expect(result.error).toBe("invalid_or_expired_token");
  });

  it("invalidates prior Host sessions when a new magic link is exchanged", async () => {
    const host = await store.createHostAccount("host@example.com");
    const firstToken = generateSecureToken();
    const secondToken = generateSecureToken();
    await store.createMagicLink(host.id, hashToken(firstToken), new Date(Date.now() + 60_000));

    const firstSession = await exchangeMagicLinkForSession({ token: firstToken }, { store });
    expect(firstSession.sessionToken).not.toBeNull();

    await store.invalidateMagicLinksForHost(host.id);
    await store.createMagicLink(host.id, hashToken(secondToken), new Date(Date.now() + 60_000));

    const secondSession = await exchangeMagicLinkForSession({ token: secondToken }, { store });
    expect(secondSession.sessionToken).not.toBeNull();

    const firstLookup = await store.findHostSession(firstSession.sessionToken!);
    const secondLookup = await store.findHostSession(secondSession.sessionToken!);

    expect(firstLookup).toBeNull();
    expect(secondLookup?.hostEmail).toBe("host@example.com");
  });

  it("uses a 30-day absolute session expiry with sliding activity", async () => {
    const host = await store.createHostAccount("host@example.com");
    const token = generateSecureToken();
    await store.createMagicLink(host.id, hashToken(token), new Date(Date.now() + 60_000));

    const now = Date.now();
    const exchange = await exchangeMagicLinkForSession({ token }, { store, now });
    const session = await store.findHostSession(exchange.sessionToken!);

    expect(session?.expiresAt.getTime()).toBe(now + SESSION_ABSOLUTE_TTL_MS);
    expect(SESSION_ABSOLUTE_TTL_MS).toBe(30 * 24 * 60 * 60 * 1000);
    expect(SESSION_SLIDING_TTL_MS).toBeGreaterThan(0);
  });
});
