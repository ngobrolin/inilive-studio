import { describe, expect, it } from "vitest";
import { createCompleteWhipOfferSdp, preferPlainWhipCodecs } from "./whip-offer";

describe("createCompleteWhipOfferSdp", () => {
  it("waits for ICE gathering and returns the completed local SDP", async () => {
    const peerConnection = new FakePeerConnection();
    let resolved = false;

    const offerSdp = createCompleteWhipOfferSdp(peerConnection).then((sdp) => {
      resolved = true;
      return sdp;
    });

    await peerConnection.localDescriptionSet;
    expect(resolved).toBe(false);

    peerConnection.completeIceGathering();

    await expect(offerSdp).resolves.toContain("candidate:complete");
  });
});

describe("preferPlainWhipCodecs", () => {
  it("excludes recovery codecs from WHIP video and audio transceivers", () => {
    const videoTransceiver = new FakeTransceiver("video");
    const audioTransceiver = new FakeTransceiver("audio");

    preferPlainWhipCodecs(
      {
        getTransceivers: () => [videoTransceiver, audioTransceiver],
      },
      {
        video: {
          codecs: [
            { mimeType: "video/VP8", clockRate: 90000 },
            { mimeType: "video/red", clockRate: 90000 },
            { mimeType: "video/ulpfec", clockRate: 90000 },
          ],
          headerExtensions: [],
        },
        audio: {
          codecs: [
            { mimeType: "audio/opus", clockRate: 48000, channels: 2 },
            { mimeType: "audio/red", clockRate: 48000, channels: 2 },
          ],
          headerExtensions: [],
        },
      },
    );

    expect(videoTransceiver.codecPreferences).toEqual([
      { mimeType: "video/VP8", clockRate: 90000 },
    ]);
    expect(audioTransceiver.codecPreferences).toEqual([
      { mimeType: "audio/opus", clockRate: 48000, channels: 2 },
    ]);
  });
});

class FakeTransceiver {
  sender: { track: { kind: string } };
  codecPreferences: RTCRtpCodec[] = [];

  constructor(kind: string) {
    this.sender = { track: { kind } };
  }

  setCodecPreferences(codecs: RTCRtpCodec[]) {
    this.codecPreferences = codecs;
  }
}

class FakePeerConnection extends EventTarget {
  iceGatheringState: RTCIceGatheringState = "new";
  localDescription: RTCSessionDescription | null = null;
  localDescriptionSet: Promise<void>;
  private resolveLocalDescriptionSet!: () => void;

  constructor() {
    super();
    this.localDescriptionSet = new Promise((resolve) => {
      this.resolveLocalDescriptionSet = resolve;
    });
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    return { type: "offer", sdp: "v=0\r\n" };
  }

  async setLocalDescription(description?: RTCLocalSessionDescriptionInit): Promise<void> {
    const localDescription = {
      type: description?.type ?? "offer",
      sdp: description?.sdp ?? "",
    };
    this.localDescription = {
      ...localDescription,
      toJSON: () => localDescription,
    };
    this.iceGatheringState = "gathering";
    this.resolveLocalDescriptionSet();
  }

  completeIceGathering() {
    this.localDescription = {
      type: "offer",
      sdp: "v=0\r\na=candidate:complete\r\n",
      toJSON: () => ({ type: "offer", sdp: "v=0\r\na=candidate:complete\r\n" }),
    };
    this.iceGatheringState = "complete";
    this.dispatchEvent(new Event("icegatheringstatechange"));
  }
}
