import { describe, expect, it } from "vitest";
import { generateSecureToken, hashToken } from "./tokens";

describe("auth tokens", () => {
  it("generates tokens with at least 128 bits of entropy", () => {
    const token = generateSecureToken();

    expect(token.length).toBeGreaterThanOrEqual(22);
    expect(new Set(token).size).toBeGreaterThan(10);
  });

  it("hashes tokens for storage without exposing the raw value", () => {
    const token = generateSecureToken();
    const digest = hashToken(token);

    expect(digest).not.toBe(token);
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken(token)).toBe(digest);
  });
});
