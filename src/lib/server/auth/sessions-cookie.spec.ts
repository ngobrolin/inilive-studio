import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildHostSessionCookie, clearHostSessionCookie } from "./sessions";

describe("host session cookies", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-17T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sets HttpOnly Secure SameSite=Lax session cookies with max-age", () => {
    const cookie = buildHostSessionCookie("session_example", new Date("2026-07-17T12:00:00.000Z"), {
      secure: true,
    });

    expect(cookie).toContain("host_session=session_example");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Max-Age=2592000");
  });

  it("clears the Host session cookie on logout", () => {
    const cookie = clearHostSessionCookie({ secure: true });

    expect(cookie).toContain("host_session=");
    expect(cookie).toContain("Max-Age=0");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Lax");
  });
});
