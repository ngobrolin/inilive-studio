import { describe, expect, it } from "vitest";
import { buildGstLaunchArgs } from "./pipeline.mjs";

describe("Broadcast Bridge GStreamer pipeline", () => {
  it("does not insert RTP recovery decoders for the plain VP8 and Opus offer", () => {
    const args = buildGstLaunchArgs({
      whipPort: 8790,
      rtmpLocation: "rtmp://test.example/live/secret",
    });

    expect(args).toContain("do-retransmission=false");
  });

  it("depaylods the plain VP8 and Opus RTP streams after WebRTC receive", () => {
    const args = buildGstLaunchArgs({
      whipPort: 8790,
      rtmpLocation: "rtmp://test.example/live/secret",
    });

    expect(args).toContain("application/x-rtp,media=video,encoding-name=VP8,clock-rate=90000");
    expect(args).toContain("application/x-rtp,media=audio,encoding-name=OPUS,clock-rate=48000");
    expect(args).toContain("rtpvp8depay");
    expect(args).toContain("rtpopusdepay");
  });

  it("declares the Opus branch before VP8 to match the Host offer order", () => {
    const args = buildGstLaunchArgs({
      whipPort: 8790,
      rtmpLocation: "rtmp://test.example/live/secret",
    });

    expect(args.indexOf("rtpopusdepay")).toBeLessThan(args.indexOf("rtpvp8depay"));
  });

  it("drops corrupted VP8 frames and requests a replacement sync point", () => {
    const args = buildGstLaunchArgs({
      whipPort: 8790,
      rtmpLocation: "rtmp://test.example/live/secret",
    });

    const depayIndex = args.indexOf("rtpvp8depay");
    const decoderIndex = args.indexOf("vp8dec");

    expect(args[depayIndex + 1]).toBe("request-keyframe=true");
    expect(args[depayIndex + 2]).toBe("wait-for-keyframe=true");
    expect(decoderIndex).toBeGreaterThan(-1);
    expect(args[decoderIndex + 1]).toBe("automatic-request-sync-points=true");
    expect(args[decoderIndex + 2]).toBe("discard-corrupted-frames=true");
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

  it("uses a strict 4 Mbps CBR encoder profile for YouTube", () => {
    const args = buildGstLaunchArgs({
      whipPort: 8790,
      rtmpLocation: "rtmp://test.example/live/secret",
    });

    const encoderIndex = args.indexOf("x264enc");
    const outputCapsIndex = args.indexOf("video/x-h264,profile=main");
    const encoderArgs = args.slice(encoderIndex, outputCapsIndex);

    expect(encoderArgs).toContain("bitrate=4000");
    expect(encoderArgs).toContain("pass=cbr");
    expect(encoderArgs).toContain("vbv-buf-capacity=600");
    expect(encoderArgs).toContain("option-string=nal-hrd=cbr");
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
