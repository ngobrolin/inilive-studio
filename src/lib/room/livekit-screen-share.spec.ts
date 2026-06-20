import { describe, expect, it, vi } from "vitest";
import {
  registerScreenSharePublisher,
  requestScreenShareToggle,
} from "./livekit-screen-share";

describe("livekit screen share bridge", () => {
  it("allows server state updates when no Room media publisher is registered", async () => {
    registerScreenSharePublisher(null);

    await expect(requestScreenShareToggle(true)).resolves.toEqual({ ok: true });
  });

  it("toggles screen share through the registered publisher", async () => {
    const setEnabled = vi.fn().mockResolvedValue(undefined);
    registerScreenSharePublisher({ setEnabled });

    await expect(requestScreenShareToggle(true)).resolves.toEqual({ ok: true });
    expect(setEnabled).toHaveBeenCalledWith(true);
  });

  it("returns a readable error when screen share setup fails", async () => {
    registerScreenSharePublisher({
      setEnabled: vi.fn().mockRejectedValue(new Error("permission denied")),
    });

    await expect(requestScreenShareToggle(true)).resolves.toEqual({
      ok: false,
      error: "permission denied",
    });
  });
});
