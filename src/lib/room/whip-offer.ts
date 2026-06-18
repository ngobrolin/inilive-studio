interface WhipOfferPeerConnection {
  iceGatheringState: RTCIceGatheringState;
  localDescription: RTCSessionDescription | null;
  createOffer(): Promise<RTCSessionDescriptionInit>;
  setLocalDescription(description?: RTCLocalSessionDescriptionInit): Promise<void>;
  addEventListener(type: "icegatheringstatechange", listener: EventListener): void;
  removeEventListener(type: "icegatheringstatechange", listener: EventListener): void;
}

interface WhipCodecTransceiver {
  sender: {
    track: {
      kind: string;
    } | null;
  };
  setCodecPreferences?(codecs: RTCRtpCodec[]): void;
}

interface WhipCodecPeerConnection {
  getTransceivers(): WhipCodecTransceiver[];
}

export function preferPlainWhipCodecs(
  peerConnection: WhipCodecPeerConnection,
  capabilities: {
    video: RTCRtpCapabilities | null;
    audio: RTCRtpCapabilities | null;
  },
): void {
  const preferredCodecs = {
    video:
      capabilities.video?.codecs.filter(
        (codec) => codec.mimeType.toLowerCase() === "video/vp8",
      ) ?? [],
    audio:
      capabilities.audio?.codecs.filter(
        (codec) => codec.mimeType.toLowerCase() === "audio/opus",
      ) ?? [],
  };

  for (const transceiver of peerConnection.getTransceivers()) {
    const kind = transceiver.sender.track?.kind;
    if (kind !== "video" && kind !== "audio") {
      continue;
    }

    const codecs = preferredCodecs[kind];
    if (codecs.length > 0) {
      transceiver.setCodecPreferences?.(codecs);
    }
  }
}

export async function createCompleteWhipOfferSdp(
  peerConnection: WhipOfferPeerConnection,
): Promise<string> {
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  await waitForIceGatheringComplete(peerConnection);

  const sdp = peerConnection.localDescription?.sdp;
  if (!sdp) {
    throw new Error("WHIP offer SDP is unavailable after ICE gathering.");
  }

  return sdp;
}

function waitForIceGatheringComplete(peerConnection: WhipOfferPeerConnection): Promise<void> {
  if (peerConnection.iceGatheringState === "complete") {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const handleStateChange = () => {
      if (peerConnection.iceGatheringState !== "complete") {
        return;
      }

      peerConnection.removeEventListener("icegatheringstatechange", handleStateChange);
      resolve();
    };

    peerConnection.addEventListener("icegatheringstatechange", handleStateChange);
  });
}
