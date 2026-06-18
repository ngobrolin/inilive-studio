export function classifyPipelineFailure(stderrTail) {
  const lines = meaningfulLines(stderrTail);
  if (lines.length === 0) {
    return "Broadcast Bridge failed before reporting an error.";
  }

  const missingElement = lines
    .map((line) => line.match(/no element ["'“]?([^"'”\s]+)["'”]?/i))
    .find(Boolean);
  if (missingElement) {
    return `Broadcast Bridge is missing required GStreamer element: ${missingElement[1]}.`;
  }

  const rtmpLine = lines.find((line) =>
    /GstRtmp2Sink|rtmp2sink|rtmpsink|rtmpclient|connection refused|netconnection|publish/i.test(
      line,
    ),
  );
  if (rtmpLine) {
    return `RTMP destination connection failed: ${clip(rtmpLine)}`;
  }

  const whipLine = lines.find((line) =>
    /whip|webrtc|ice|dtls|signall|not-negotiated/i.test(line),
  );
  if (whipLine) {
    return `WHIP ingest failed: ${clip(whipLine)}`;
  }

  return `Broadcast Bridge pipeline failed: ${clip(lines[0])}`;
}

function meaningfulLines(stderrTail) {
  const ignored = [
    /^Setting pipeline /i,
    /^Pipeline is /i,
    /^Redistribute latency/i,
    /^Freeing pipeline/i,
    /^Got EOS/i,
  ];

  return stderrTail
    .replace(/\x1b\[[0-9;]*m/g, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !ignored.some((pattern) => pattern.test(line)));
}

function clip(line) {
  return line.length > 400 ? `${line.slice(0, 397)}...` : line;
}
