import { beforeEach, describe, expect, it } from "vitest";
import { POST as postRoom } from "./+server";
import { createInMemoryAuthStore } from "$lib/server/auth/store";
import { createInMemoryRoomStore } from "$lib/server/rooms/store";
import { clearAuthRuntimeForTests, setAuthRuntimeForTests } from "$lib/server/auth/runtime";
import { clearRoomStoreForTests, setRoomStoreForTests } from "$lib/server/rooms/runtime";
import { generateSecureToken, hashToken } from "$lib/server/auth/tokens";
import { buildHostSessionCookie, exchangeMagicLinkForSession } from "$lib/server/auth/sessions";

describe("rooms create endpoint", () => {
  beforeEach(() => {
    clearAuthRuntimeForTests();
    clearRoomStoreForTests();
  });

  it("requires a signed-in Host session", async () => {
    setRoomStoreForTests(createInMemoryRoomStore());

    const response = await postRoomRequest({ title: "Weekly show" });

    expect(response.status).toBe(401);
  });

  it("creates a reusable Room for the signed-in Host", async () => {
    const authStore = createInMemoryAuthStore();
    const roomStore = createInMemoryRoomStore();
    setAuthRuntimeForTests({ store: authStore });
    setRoomStoreForTests(roomStore);

    const host = await authStore.createHostAccount("host@example.com");
    const token = generateSecureToken();
    await authStore.createMagicLink(host.id, hashToken(token), new Date(Date.now() + 60_000));
    const exchange = await exchangeMagicLinkForSession({ token }, { store: authStore });
    expect(exchange.sessionToken).toBeTruthy();

    const response = await postRoomRequest(
      { title: "Weekly show" },
      exchange.sessionToken!,
      exchange.expiresAt!,
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      ok: true,
      room: {
        title: "Weekly show",
      },
    });
  });
});

function postRoomRequest(
  body: { title: string },
  sessionToken?: string,
  expiresAt?: Date,
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (sessionToken && expiresAt) {
    headers.Cookie = buildHostSessionCookie(sessionToken, expiresAt, { secure: false });
  }

  return Promise.resolve(
    postRoom({
      request: new Request("http://localhost/rooms", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      }),
      cookies: {
        get(name: string) {
          const cookie = headers.Cookie ?? "";
          const match = cookie.match(new RegExp(`${name}=([^;]+)`));
          return match?.[1];
        },
      },
    } as never),
  );
}
