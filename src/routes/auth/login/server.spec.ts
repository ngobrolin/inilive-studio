import { beforeEach, describe, expect, it } from "vitest";
import { POST as postLogin } from "./+server";
import { MAGIC_LINK_REQUEST_RESPONSE } from "$lib/server/auth/magic-link";
import { createInMemoryAuthStore } from "$lib/server/auth/store";
import { createCapturingEmailSender } from "$lib/server/auth/email";
import { clearAuthRuntimeForTests, setAuthRuntimeForTests } from "$lib/server/auth/runtime";

describe("auth login endpoint", () => {
  beforeEach(() => {
    clearAuthRuntimeForTests();
  });

  it("returns the same response for known and unknown emails", async () => {
    const store = createInMemoryAuthStore();
    const emailSender = createCapturingEmailSender();
    await store.createHostAccount("known@example.com");
    setAuthRuntimeForTests({ store, sendEmail: emailSender.sendEmail });

    const known = await postLoginRequest("known@example.com");
    const unknown = await postLoginRequest("unknown@example.com");

    expect(known.status).toBe(202);
    expect(unknown.status).toBe(202);
    expect(await known.json()).toEqual(MAGIC_LINK_REQUEST_RESPONSE);
    expect(await unknown.json()).toEqual(MAGIC_LINK_REQUEST_RESPONSE);
    expect(emailSender.getSentEmails()).toHaveLength(2);
  });
});

function postLoginRequest(email: string): Promise<Response> {
  return Promise.resolve(
    postLogin({
      request: new Request("http://localhost/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }),
    } as never),
  );
}
