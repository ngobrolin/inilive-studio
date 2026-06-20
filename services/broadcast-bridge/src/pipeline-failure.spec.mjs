import { describe, expect, it } from "vitest";
import { classifyPipelineFailure } from "./pipeline-failure.mjs";

describe("classifyPipelineFailure", () => {
  it("reports rejected stream credentials instead of raw RTMP publish errors", () => {
    expect(
      classifyPipelineFailure(`
ERROR: from element /GstPipeline:pipeline0/GstRtmp2Sink:rtmp: Failed to connect: 'publish' cmd failed: connection closed remotely
ERROR webrtcsrc session "abc" not found
`),
    ).toBe("YouTube rejected the stream credentials.");
  });

  it("reports the primary RTMP failure instead of later WHIP cleanup noise", () => {
    expect(
      classifyPipelineFailure(`
ERROR: from element /GstPipeline:pipeline0/GstRtmp2Sink:rtmp: Connection refused
ERROR webrtcsrc session "abc" not found
`),
    ).toBe(
      "Could not reach the RTMP server. Check the server URL and network connection.",
    );
  });

  it("reports negotiation failures as WHIP ingest failures", () => {
    expect(classifyPipelineFailure("streaming stopped, reason not-negotiated (-4)")).toBe(
      "WHIP ingest failed: streaming stopped, reason not-negotiated (-4)",
    );
  });

  it("ignores verbose diagnostic lines when selecting the terminal failure", () => {
    expect(
      classifyPipelineFailure(`
0:00:00.926 DEBUG webrtcsrc handle_webrtc_src_pad:<ws> NO decoding for session:0
0:00:00.926 WARN GST_CAPS <rtpulpfecdec0:sink> caps application/x-rtp not accepted
streaming stopped, reason not-negotiated (-4)
`),
    ).toBe("WHIP ingest failed: streaming stopped, reason not-negotiated (-4)");
  });

  it("prioritizes the terminal negotiation reason over a truncated caps diagnostic", () => {
    expect(
      classifyPipelineFailure(`
(string\\)audio\\, payload\\=\\(int\\)111\\, clock-rate\\=\\(int\\)48000
streaming stopped, reason not-negotiated (-4)
`),
    ).toBe("WHIP ingest failed: streaming stopped, reason not-negotiated (-4)");
  });
});
