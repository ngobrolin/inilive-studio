import { beforeEach, describe, expect, it } from "vitest";
import { recordBroadcastHealthEvent } from "./health";
import { createInMemoryHealthEventStore } from "./store";

describe("broadcast health events", () => {
  let store: ReturnType<typeof createInMemoryHealthEventStore>;

  beforeEach(() => {
    store = createInMemoryHealthEventStore();
  });

  it("persists a Broadcast Health event for a product Broadcast", async () => {
    const event = await recordBroadcastHealthEvent(
      {
        broadcastId: "broadcast-1",
        status: "connected",
        message: "Broadcast Bridge is connected.",
        payload: { status: "connected", message: "Broadcast Bridge is connected." },
      },
      { store },
    );

    expect(event).toMatchObject({
      broadcastId: "broadcast-1",
      status: "connected",
      message: "Broadcast Bridge is connected.",
    });

    const events = await store.listEventsForBroadcast("broadcast-1");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      status: "connected",
      message: "Broadcast Bridge is connected.",
      payload: { status: "connected", message: "Broadcast Bridge is connected." },
    });
  });

  it("redacts stream keys from persisted payloads", async () => {
    await recordBroadcastHealthEvent(
      {
        broadcastId: "broadcast-1",
        status: "failed",
        message: "RTMP output disconnected.",
        payload: {
          status: "failed",
          message: "RTMP output disconnected.",
          rtmpLocation: "rtmp://youtube/live/secret-stream-key",
        },
      },
      { store },
    );

    const events = await store.listEventsForBroadcast("broadcast-1");
    expect(JSON.stringify(events[0]?.payload)).not.toContain("secret-stream-key");
    expect(events[0]?.payload).toMatchObject({
      status: "failed",
      message: "RTMP output disconnected.",
      rtmpLocation: "rtmp://youtube/live/[redacted]",
    });
  });
});
