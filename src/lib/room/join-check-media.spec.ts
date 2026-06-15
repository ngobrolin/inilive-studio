import { describe, expect, it } from "vitest";
import { readMicrophoneLevel } from "./join-check-media";

describe("readMicrophoneLevel", () => {
  it("returns zero for silence", () => {
    const silence = new Uint8Array(128).fill(128);
    expect(readMicrophoneLevel(silence)).toBe(0);
  });

  it("returns a higher level for stronger input", () => {
    const quiet = new Uint8Array(128).fill(132);
    const loud = new Uint8Array(128).fill(180);

    expect(readMicrophoneLevel(loud)).toBeGreaterThan(readMicrophoneLevel(quiet));
  });
});
