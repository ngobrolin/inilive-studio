import { describe, expect, it } from "vitest";
import { buildGstLaunchArgs } from "./pipeline.mjs";

describe("Broadcast Bridge GStreamer pipeline", () => {
  it("requests plain VP8 and Opus RTP pads from WHIP", () => {
    const args = buildGstLaunchArgs({
      whipPort: 8790,
      rtmpLocation: "rtmp://test.example/live/secret",
    });

    expect(args).toContain("application/x-rtp,media=video,encoding-name=VP8,clock-rate=90000");
    expect(args).toContain("application/x-rtp,media=audio,encoding-name=OPUS,clock-rate=48000");
    expect(args).not.toContain("video-codecs=<H264>");
    expect(args).not.toContain("decodebin");
  });

  it("recovers VP8 decoding at the next keyframe after packet loss", () => {
    const args = buildGstLaunchArgs({
      whipPort: 8790,
      rtmpLocation: "rtmp://test.example/live/secret",
    });

    const depayIndex = args.indexOf("rtpvp8depay");
    const decoderIndex = args.indexOf("vp8dec");

    expect(depayIndex).toBeGreaterThan(-1);
    expect(args.slice(depayIndex, decoderIndex)).toContain("request-keyframe=true");
    expect(args.slice(depayIndex, decoderIndex)).toContain("wait-for-keyframe=true");
    expect(decoderIndex).toBeGreaterThan(depayIndex);
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

  it("repeats H.264 codec headers at every IDR frame for downstream recovery", () => {
    const args = buildGstLaunchArgs({
      whipPort: 8790,
      rtmpLocation: "rtmp://test.example/live/secret",
    });

    const parserIndex = args.indexOf("h264parse");
    expect(parserIndex).toBeGreaterThan(-1);
    expect(args[parserIndex + 1]).toBe("config-interval=-1");
  });
});
