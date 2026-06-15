import { describe, expect, it } from "vitest";
import {
  DISPLAY_NAME_MAX_LENGTH,
  displayNameError,
  hasDisplayName,
} from "./display-name";

describe("display name validation", () => {
  it("requires non-empty trimmed text", () => {
    expect(hasDisplayName("")).toBe(false);
    expect(hasDisplayName("   ")).toBe(false);
    expect(hasDisplayName("Riza")).toBe(true);
  });

  it("limits Display Name to 50 characters", () => {
    const withinLimit = "a".repeat(DISPLAY_NAME_MAX_LENGTH);
    const overLimit = "a".repeat(DISPLAY_NAME_MAX_LENGTH + 1);

    expect(displayNameError(withinLimit)).toBeNull();
    expect(displayNameError(overLimit)).toContain("50 characters");
  });
});
