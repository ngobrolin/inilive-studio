import { beforeEach, describe, expect, it } from "vitest";
import {
  cancelBroadcastCountdown,
  completeBroadcastCountdown,
  markBroadcastEnded,
  markBroadcastFailed,
  recoverInterruptedBroadcast,
  startBroadcastCountdown,
} from "./broadcasts";
import { clearBroadcastStoreForTests, setBroadcastStoreForTests } from "./runtime";
import { createInMemoryBroadcastStore } from "./store";

describe("product-backed broadcasts", () => {
  beforeEach(() => {
    clearBroadcastStoreForTests();
  });

  it("creates a countdown Broadcast record when starting Countdown for a reusable Room", async () => {
    const store = createInMemoryBroadcastStore();
    const result = await startBroadcastCountdown({ roomId: "room-1" }, { store });

    expect(result.error).toBeNull();
    expect(result.broadcast).toMatchObject({
      roomId: "room-1",
      state: "countdown",
      failureMessage: null,
      startedAt: null,
      endedAt: null,
    });
    expect(result.broadcast?.countdownEndsAt?.getTime()).toBeGreaterThan(Date.now());
  });

  it("deletes the Broadcast record when the Host cancels Countdown", async () => {
    const store = createInMemoryBroadcastStore();
    const started = await startBroadcastCountdown({ roomId: "room-1" }, { store });
    const broadcastId = started.broadcast!.id;

    const result = await cancelBroadcastCountdown({ broadcastId }, { store });

    expect(result.error).toBeNull();
    expect(await store.getActiveBroadcast("room-1")).toBeNull();
  });

  it("persists Broadcasting when Countdown completes", async () => {
    const store = createInMemoryBroadcastStore();
    const started = await startBroadcastCountdown(
      { roomId: "room-1", now: 1_000 },
      { store },
    );
    const now = 6_000;

    const result = await completeBroadcastCountdown(
      { broadcastId: started.broadcast!.id, now },
      { store },
    );

    expect(result.error).toBeNull();
    expect(result.broadcast).toMatchObject({
      roomId: "room-1",
      state: "broadcasting",
      startedAt: new Date(now),
      endedAt: null,
      countdownEndsAt: null,
    });
  });

  it("persists Ended and Failed Broadcast states", async () => {
    const store = createInMemoryBroadcastStore();
    const started = await startBroadcastCountdown(
      { roomId: "room-1", now: 1_000 },
      { store },
    );
    const broadcasting = await completeBroadcastCountdown(
      { broadcastId: started.broadcast!.id, now: 6_000 },
      { store },
    );

    const ended = await markBroadcastEnded(
      { broadcastId: broadcasting.broadcast!.id, now: 10_000 },
      { store },
    );
    expect(ended.broadcast?.state).toBe("ended");
    expect(ended.broadcast?.endedAt).toEqual(new Date(10_000));

    const failedStart = await startBroadcastCountdown({ roomId: "room-2", now: 11_000 }, { store });
    const failedBroadcasting = await completeBroadcastCountdown(
      { broadcastId: failedStart.broadcast!.id, now: 16_000 },
      { store },
    );
    const failed = await markBroadcastFailed(
      {
        broadcastId: failedBroadcasting.broadcast!.id,
        failureMessage: "YouTube rejected the stream credentials.",
        now: 20_000,
      },
      { store },
    );

    expect(failed.broadcast?.state).toBe("failed");
    expect(failed.broadcast?.failureMessage).toBe("YouTube rejected the stream credentials.");
    expect(failed.broadcast?.endedAt).toEqual(new Date(20_000));
  });

  it("allows a new Countdown after a Failed Broadcast", async () => {
    const store = createInMemoryBroadcastStore();
    const first = await startBroadcastCountdown({ roomId: "room-1", now: 1_000 }, { store });
    const broadcasting = await completeBroadcastCountdown(
      { broadcastId: first.broadcast!.id, now: 6_000 },
      { store },
    );
    await markBroadcastFailed(
      {
        broadcastId: broadcasting.broadcast!.id,
        failureMessage: "Bridge failed.",
        now: 7_000,
      },
      { store },
    );

    const retry = await startBroadcastCountdown({ roomId: "room-1", now: 8_000 }, { store });

    expect(retry.error).toBeNull();
    expect(retry.broadcast?.state).toBe("countdown");
  });

  it("recovers a durable Broadcasting record after process-local Room state is lost", async () => {
    const store = createInMemoryBroadcastStore();
    const first = await startBroadcastCountdown({ roomId: "room-1", now: 1_000 }, { store });
    const broadcasting = await completeBroadcastCountdown(
      { broadcastId: first.broadcast!.id, now: 6_000 },
      { store },
    );

    const result = await recoverInterruptedBroadcast(
      { roomId: "room-1", hasActiveRuntimeBroadcast: false, now: 7_000 },
      { store },
    );

    expect(result.recovered).toBe(true);
    expect(await store.getBroadcastById(broadcasting.broadcast!.id)).toMatchObject({
      state: "failed",
      failureMessage: "Broadcast interrupted by an application restart.",
      endedAt: new Date(7_000),
    });
    await expect(
      startBroadcastCountdown({ roomId: "room-1", now: 8_000 }, { store }),
    ).resolves.toMatchObject({ error: null });
  });
});
