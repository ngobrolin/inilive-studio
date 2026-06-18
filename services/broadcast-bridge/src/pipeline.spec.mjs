import { describe, expect, it } from "vitest";
import { buildGstLaunchArgs } from "./pipeline.mjs";

describe("Broadcast Bridge GStreamer pipeline", () => {
  it("allows WHIP to negotiate the browser codec while requesting decoded pads", () => {
    const args = buildGstLaunchArgs({
      whipPort: 8790,
      rtmpLocation: "rtmp://test.example/live/secret",
    });

    expect(args).toContain("video/x-raw");
    expect(args).toContain("audio/x-raw");
    expect(args).not.toContain("video-codecs=<H264>");
    expect(args).not.toContain("decodebin");
  });

  it("normalizes an unspecified WebRTC framerate to the 30fps RTMP profile", () => {
    const args = buildGstLaunchArgs({
      whipPort: 8790,
      rtmpLocation: "rtmp://test.example/live/secret",
    });

    const videoRateIndex = args.indexOf("videorate");
    const outputCapsIndex = args.indexOf("video/x-raw,width=1280,height=720,framerate=30/1");

    expect(videoRateIndex).toBeGreaterThan(-1);
    expect(outputCapsIndex).toBeGreaterThan(videoRateIndex);
  });

  it("uses the modern rtmp2sink and defers the RTMP connect until media flows", () => {
    const args = buildGstLaunchArgs({
      whipPort: 8790,
      rtmpLocation: "rtmp://test.example/live/secret",
    });

    expect(args).toContain("rtmp2sink");
    expect(args).toContain("async-connect=false");
    expect(args).not.toContain("rtmpsink");
    expect(args).toContain("location=rtmp://test.example/live/secret");
  });
});
