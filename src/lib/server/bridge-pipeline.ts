export const BRIDGE_OUTPUT_PROFILE = {
  width: 1280,
  height: 720,
  frameRate: 30,
  videoBitrateKbps: 4000,
  keyframeIntervalSeconds: 2,
  audioSampleRateHz: 44100,
  audioChannels: 2,
} as const;

const MIN_GSTREAMER_MAJOR = 1;
const MIN_GSTREAMER_MINOR = 22;

export function buildRtmpSinkLocation(input: {
  rtmpServerUrl: string;
  streamKey: string;
}): string {
  const rtmpServerUrl = input.rtmpServerUrl.trim().replace(/\/+$/, "");
  const streamKey = input.streamKey.trim();

  return `${rtmpServerUrl}/${streamKey}`;
}

export function redactRtmpSinkLocation(location: string): string {
  const lastSlash = location.lastIndexOf("/");
  if (lastSlash === -1) {
    return "[redacted]";
  }

  return `${location.slice(0, lastSlash + 1)}[redacted]`;
}

export function buildWhipIngestUrl(input: { bridgeBaseUrl: string; roomId: string }): string {
  const bridgeBaseUrl = input.bridgeBaseUrl.trim().replace(/\/+$/, "");
  const roomId = encodeURIComponent(input.roomId);

  return `${bridgeBaseUrl}/whip/${roomId}`;
}

export function parseGStreamerVersion(output: string): {
  major: number;
  minor: number;
  meetsMinimum: boolean;
} {
  const match = output.match(/version\s+(\d+)\.(\d+)/i) ?? output.match(/(\d+)\.(\d+)(?:\.\d+)?\s*$/);
  const major = Number(match?.[1] ?? 0);
  const minor = Number(match?.[2] ?? 0);
  const meetsMinimum =
    major > MIN_GSTREAMER_MAJOR ||
    (major === MIN_GSTREAMER_MAJOR && minor >= MIN_GSTREAMER_MINOR);

  return { major, minor, meetsMinimum };
}
