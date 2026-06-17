import { describe, expect, it } from "vitest";
import { evaluateBridgeVerification } from "../../../scripts/verify/bridge-003-gstreamer-lib.mjs";

describe("bridge-003 verification gate", () => {
  it("requires the pinned container, supported GStreamer, pipeline elements, and control API lifecycle", () => {
    expect(
      evaluateBridgeVerification({
        containerBuilt: false,
        containerGStreamer: null,
        containerElementsAvailable: false,
        controlApiSessionLifecycle: true,
      }),
    ).toEqual({
      passed: false,
      failures: [
        "pinned bridge container image was not built",
        "container GStreamer is missing or below 1.22",
        "container is missing required WHIP-to-RTMP GStreamer elements",
      ],
    });

    expect(
      evaluateBridgeVerification({
        containerBuilt: true,
        containerGStreamer: { major: 1, minor: 24, meetsMinimum: true },
        containerElementsAvailable: true,
        controlApiSessionLifecycle: true,
      }),
    ).toEqual({ passed: true, failures: [] });
  });
});
