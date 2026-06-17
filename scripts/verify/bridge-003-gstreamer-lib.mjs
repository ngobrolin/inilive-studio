/**
 * @param {{
 *   containerBuilt: boolean,
 *   containerGStreamer: { major: number, minor: number, meetsMinimum: boolean } | null,
 *   containerElementsAvailable: boolean,
 *   controlApiSessionLifecycle: boolean,
 * }} results
 */
export function evaluateBridgeVerification(results) {
  const failures = [];

  if (!results.containerBuilt) {
    failures.push("pinned bridge container image was not built");
  }

  if (!results.containerGStreamer?.meetsMinimum) {
    failures.push("container GStreamer is missing or below 1.22");
  }

  if (!results.containerElementsAvailable) {
    failures.push("container is missing required WHIP-to-RTMP GStreamer elements");
  }

  if (!results.controlApiSessionLifecycle) {
    failures.push("bridge control API session lifecycle did not pass");
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}
