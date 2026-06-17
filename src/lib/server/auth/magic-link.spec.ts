import { beforeEach, describe, expect, it } from "vitest";
import { requestMagicLink } from "./magic-link";
import { createInMemoryAuthStore, type AuthStore } from "./store";

describe("magic link request", () => {
  let store: AuthStore;

  beforeEach(() => {
    store = createInMemoryAuthStore();
  });

  it("returns the same response whether or not the email already exists", async () => {
    await store.createHostAccount("existing@example.com");

    const existing = await requestMagicLink(
      { email: "existing@example.com" },
      { store, sendEmail: async () => {} },
    );
    const unknown = await requestMagicLink(
      { email: "new@example.com" },
      { store, sendEmail: async () => {} },
    );

    expect(existing).toEqual(unknown);
    expect(existing).toMatchObject({
      ok: true,
      message: "If that email can sign in, a magic link is on the way.",
    });
  });

  it("creates a Host Account when the email is new", async () => {
    await requestMagicLink({ email: "new-host@example.com" }, { store, sendEmail: async () => {} });

    expect(await store.findHostByEmail("new-host@example.com")).not.toBeNull();
  });

  it("invalidates prior magic links when a new one is requested", async () => {
    const sentTokens: string[] = [];
    const sendEmail = async (input: { token: string }) => {
      sentTokens.push(input.token);
    };

    await requestMagicLink({ email: "host@example.com" }, { store, sendEmail });
    await requestMagicLink({ email: "host@example.com" }, { store, sendEmail });

    expect(sentTokens).toHaveLength(2);
    expect(sentTokens[0]).not.toBe(sentTokens[1]);

    const firstExchange = await store.exchangeMagicLinkToken(sentTokens[0]!);
    const secondExchange = await store.exchangeMagicLinkToken(sentTokens[1]!);

    expect(firstExchange).toBeNull();
    expect(secondExchange).not.toBeNull();
  });
});
