export const BRIDGE_OUTPUT_PROFILE = {
  width: 1280,
  height: 720,
  frameRate: 30,
  videoBitrateKbps: 4000,
  keyframeIntervalSeconds: 2,
  audioSampleRateHz: 44100,
  audioChannels: 2,
};

export function buildRtmpSinkLocation({ rtmpServerUrl, streamKey }) {
  const base = rtmpServerUrl.trim().replace(/\/+$/, "");
  return `${base}/${streamKey.trim()}`;
}

export function redactRtmpSinkLocation(location) {
  const lastSlash = location.lastIndexOf("/");
  if (lastSlash === -1) {
    return "[redacted]";
  }

  return `${location.slice(0, lastSlash + 1)}[redacted]`;
}

export function buildGstLaunchArgs({ whipPort, rtmpLocation }) {
  const profile = BRIDGE_OUTPUT_PROFILE;
  const keyIntMax = profile.frameRate * profile.keyframeIntervalSeconds;

  return [
    "-e",
    "whipserversrc",
    "name=ws",
    `signaller::host-addr=http://127.0.0.1:${whipPort}`,
    "stun-server=stun://stun.l.google.com:19302",
    // Chromium is already constrained to plain VP8 and Opus. The plugin's RTP
    // recovery bin inserts rtpulpfecdec for the Opus stream and rejects its
    // valid in-band-FEC caps, terminating ingest with not-negotiated (-4).
    "do-retransmission=false",
    "ws.",
    "!",
    "application/x-rtp,media=audio,encoding-name=OPUS,clock-rate=48000",
    "!",
    "queue",
    "!",
    "rtpopusdepay",
    "!",
    "opusdec",
    "plc=true",
    "use-inband-fec=true",
    "!",
    "audioconvert",
    "!",
    "audioresample",
    "!",
    `audio/x-raw,rate=${profile.audioSampleRateHz},channels=${profile.audioChannels}`,
    "!",
    "avenc_aac",
    "bitrate=128000",
    "!",
    "queue",
    "!",
    "mux.",
    "ws.",
    "!",
    "application/x-rtp,media=video,encoding-name=VP8,clock-rate=90000",
    "!",
    "queue",
    "!",
    "rtpvp8depay",
    "request-keyframe=true",
    "wait-for-keyframe=true",
    "!",
    "vp8dec",
    "automatic-request-sync-points=true",
    "discard-corrupted-frames=true",
    "!",
    "videoconvert",
    "!",
    "videoscale",
    "!",
    "videorate",
    "!",
    `video/x-raw,width=${profile.width},height=${profile.height},framerate=${profile.frameRate}/1`,
    "!",
    "x264enc",
    `bitrate=${profile.videoBitrateKbps}`,
    "pass=cbr",
    "vbv-buf-capacity=600",
    "option-string=nal-hrd=cbr",
    "speed-preset=veryfast",
    `key-int-max=${keyIntMax}`,
    "tune=zerolatency",
    "!",
    "video/x-h264,profile=main",
    "!",
    "h264parse",
    "config-interval=-1",
    "!",
    "queue",
    "!",
    "mux.",
    "flvmux",
    "name=mux",
    "streamable=true",
    "!",
    "rtmp2sink",
    "name=rtmp",
    // Defer the RTMP connect until the first muxed buffer arrives (after WHIP
    // ingest starts) instead of connecting eagerly on state change. This keeps
    // the pipeline alive while the Host browser is still negotiating WHIP, and
    // surfaces real connection errors only once media is actually flowing.
    "async-connect=false",
    `location=${rtmpLocation}`,
  ];
}
