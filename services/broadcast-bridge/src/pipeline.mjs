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
    "ws.",
    "!",
    "queue",
    "!",
    "decodebin",
    "!",
    "videoconvert",
    "!",
    "videoscale",
    "!",
    `video/x-raw,width=${profile.width},height=${profile.height},framerate=${profile.frameRate}/1`,
    "!",
    "x264enc",
    `bitrate=${profile.videoBitrateKbps}`,
    "speed-preset=veryfast",
    `key-int-max=${keyIntMax}`,
    "!",
    "video/x-h264,profile=main",
    "!",
    "h264parse",
    "!",
    "queue",
    "!",
    "mux.",
    "ws.",
    "!",
    "queue",
    "!",
    "decodebin",
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
    "flvmux",
    "name=mux",
    "streamable=true",
    "!",
    "rtmpsink",
    `location=${rtmpLocation}`,
  ];
}
