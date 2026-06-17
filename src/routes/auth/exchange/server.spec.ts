import { beforeEach, describe, expect, it } from "vitest";
import { POST as postExchange } from "./+server";
import { createInMemoryAuthStore } from "$lib/server/auth/store";
import { clearAuthRuntimeForTests, setAuthRuntimeForTests } from "$lib/server/auth/runtime";
import { generateSecureToken, hashToken } from "$lib/server/auth/tokens";
import { SESSION_COOKIE_NAME } from "$lib/server/auth/sessions";

describe("auth exchange endpoint", () => {
  beforeEach(() => {
    clearAuthRuntimeForTests();
  });

  it("sets an HttpOnly SameSite=Lax Host session cookie for a valid magic link token", async () => {
    const store = createInMemoryAuthStore();
    setAuthRuntimeForTests({ store });
    const host = await store.createHostAccount("host@example.com");
    const token = generateSecureToken();
    await store.createMagicLink(host.id, hashToken(token), new Date(Date.now() + 60_000));

    const response = await postExchangeRequest(token);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      hostEmail: "host@example.com",
    });

    const cookie = response.headers.get("Set-Cookie") ?? "";
    expect(cookie).toContain(`${SESSION_COOKIE_NAME}=session_`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
  });

  it("returns 401 for invalid magic link tokens", async () => {
    setAuthRuntimeForTests({ store: createInMemoryAuthStore() });

    const response = await postExchangeRequest("not-a-real-token");

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: "invalid_or_expired_token",
    });
  });
});

function postExchangeRequest(token: string): Promise<Response> {
  return Promise.resolve(
    postExchange({
      request: new Request("http://localhost/auth/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }),
      url: new URL("http://localhost/auth/exchange"),
    } as never),
  );
}
