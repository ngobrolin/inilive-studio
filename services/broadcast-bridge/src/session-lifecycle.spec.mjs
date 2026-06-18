import { describe, expect, it } from "vitest";
import { hasRunningPipeline } from "./session-lifecycle.mjs";

describe("Broadcast Bridge session lifecycle", () => {
  it("allows a failed pipeline session to be replaced on retry", () => {
    expect(hasRunningPipeline({ process: null })).toBe(false);
    expect(hasRunningPipeline({ process: { killed: false } })).toBe(true);
  });
});
