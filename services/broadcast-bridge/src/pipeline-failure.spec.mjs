import { describe, expect, it } from "vitest";
import { classifyPipelineFailure } from "./pipeline-failure.mjs";

describe("classifyPipelineFailure", () => {
  it("reports the primary RTMP failure instead of later WHIP cleanup noise", () => {
    expect(
      classifyPipelineFailure(`
ERROR: from element /GstPipeline:pipeline0/GstRtmp2Sink:rtmp: Connection refused
ERROR webrtcsrc session "abc" not found
`),
    ).toBe(
      "RTMP destination connection failed: ERROR: from element /GstPipeline:pipeline0/GstRtmp2Sink:rtmp: Connection refused",
    );
  });

  it("reports negotiation failures as WHIP ingest failures", () => {
    expect(classifyPipelineFailure("streaming stopped, reason not-negotiated (-4)")).toBe(
      "WHIP ingest failed: streaming stopped, reason not-negotiated (-4)",
    );
  });
});
