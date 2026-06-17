import { redactRtmpSinkLocation } from "$lib/server/bridge-pipeline";
import type { BroadcastHealthEventStatus, HealthEventStore } from "./store";

export function redactBroadcastHealthPayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const redacted: Record<string, unknown> = { ...payload };

  for (const key of ["rtmpLocation", "rtmpServerUrl", "streamKey"]) {
    const value = redacted[key];
    if (typeof value === "string") {
      redacted[key] =
        key === "rtmpLocation" ? redactRtmpSinkLocation(value) : "[redacted]";
    }
  }

  return redacted;
}

export async function recordBroadcastHealthEvent(
  input: {
    broadcastId: string;
    status: BroadcastHealthEventStatus;
    message: string | null;
    payload: Record<string, unknown>;
  },
  deps: { store: HealthEventStore },
) {
  return deps.store.createEvent({
    broadcastId: input.broadcastId,
    status: input.status,
    message: input.message,
    payload: redactBroadcastHealthPayload(input.payload),
  });
}
