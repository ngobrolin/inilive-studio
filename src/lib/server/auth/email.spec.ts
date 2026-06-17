import { describe, expect, it, vi } from "vitest";
import { buildMagicLinkVerifyUrl, createConsoleMagicLinkEmailSender } from "./email";

describe("magic link email", () => {
  it("builds a verify URL with the token in the fragment", () => {
    expect(buildMagicLinkVerifyUrl("http://127.0.0.1:5173", "abc123")).toBe(
      "http://127.0.0.1:5173/auth/verify#abc123",
    );
  });

  it("logs a complete sign-in URL for development", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    await createConsoleMagicLinkEmailSender("http://127.0.0.1:5173")({
      email: "host@example.com",
      token: "dev-token",
    });

    expect(info).toHaveBeenCalledWith(
      "Magic link requested for host@example.com. Open this URL to complete sign-in:\nhttp://127.0.0.1:5173/auth/verify#dev-token",
    );

    info.mockRestore();
  });
});
