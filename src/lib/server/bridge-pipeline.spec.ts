import { describe, expect, it } from "vitest";
import {
  BRIDGE_OUTPUT_PROFILE,
  buildRtmpSinkLocation,
  buildWhipIngestUrl,
  parseGStreamerVersion,
  redactRtmpSinkLocation,
} from "./bridge-pipeline";

describe("bridge pipeline config", () => {
  it("targets 720p30 H.264 at 4 Mbps with 2s keyframes and AAC stereo", () => {
    expect(BRIDGE_OUTPUT_PROFILE).toEqual({
      width: 1280,
      height: 720,
      frameRate: 30,
      videoBitrateKbps: 4000,
      keyframeIntervalSeconds: 2,
      audioSampleRateHz: 44100,
      audioChannels: 2,
    });
  });

  it("builds an RTMP sink location from server URL and stream key", () => {
    expect(
      buildRtmpSinkLocation({
        rtmpServerUrl: "rtmp://a.rtmp.youtube.com/live2",
        streamKey: "abcd-efgh",
      }),
    ).toBe("rtmp://a.rtmp.youtube.com/live2/abcd-efgh");
  });

  it("redacts stream keys from RTMP locations for logs", () => {
    const location = buildRtmpSinkLocation({
      rtmpServerUrl: "rtmp://a.rtmp.youtube.com/live2",
      streamKey: "super-secret-key",
    });

    expect(redactRtmpSinkLocation(location)).toBe("rtmp://a.rtmp.youtube.com/live2/[redacted]");
    expect(redactRtmpSinkLocation(location)).not.toContain("super-secret-key");
  });

  it("builds a room-scoped WHIP ingest URL on the bridge host", () => {
    expect(
      buildWhipIngestUrl({
        bridgeBaseUrl: "http://127.0.0.1:8788",
        roomId: "demo",
      }),
    ).toBe("http://127.0.0.1:8788/whip/demo");
  });

  it("parses GStreamer versions and accepts 1.22 or newer", () => {
    expect(parseGStreamerVersion("gst-launch-1.0 version 1.24.2")).toEqual({
      major: 1,
      minor: 24,
      meetsMinimum: true,
    });
    expect(parseGStreamerVersion("gst-launch-1.0 version 1.21.9").meetsMinimum).toBe(false);
  });
});
