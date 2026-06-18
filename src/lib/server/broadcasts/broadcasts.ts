import type { BroadcastRecord, BroadcastStore } from "./store";

const COUNTDOWN_DURATION_MS = 5_000;

export type StartBroadcastCountdownResult = {
  broadcast: BroadcastRecord | null;
  error: "active_broadcast" | null;
};

export type CancelBroadcastCountdownResult = {
  error: "not_found" | null;
};

export type CompleteBroadcastCountdownResult = {
  broadcast: BroadcastRecord | null;
  error: "not_found" | "not_countdown" | "countdown_not_ready" | null;
};

export type MarkBroadcastEndedResult = {
  broadcast: BroadcastRecord | null;
  error: "not_found" | "invalid_state" | null;
};

export type MarkBroadcastFailedResult = {
  broadcast: BroadcastRecord | null;
  error: "not_found" | "invalid_state" | "missing_message" | null;
};

export async function recoverInterruptedBroadcast(
  input: {
    roomId: string;
    hasActiveRuntimeBroadcast: boolean;
    now?: number;
  },
  deps: { store: BroadcastStore },
): Promise<{ recovered: boolean }> {
  if (input.hasActiveRuntimeBroadcast) {
    return { recovered: false };
  }

  const active = await deps.store.getActiveBroadcast(input.roomId);
  if (!active) {
    return { recovered: false };
  }

  if (active.state === "countdown") {
    return { recovered: await deps.store.deleteBroadcast(active.id) };
  }

  const recovered = await deps.store.markBroadcastFailed(
    active.id,
    "Broadcast interrupted by an application restart.",
    new Date(input.now ?? Date.now()),
  );
  return { recovered: recovered !== null };
}

export async function startBroadcastCountdown(
  input: { roomId: string; now?: number },
  deps: { store: BroadcastStore },
): Promise<StartBroadcastCountdownResult> {
  const now = input.now ?? Date.now();
  const active = await deps.store.getActiveBroadcast(input.roomId);

  if (active) {
    return { broadcast: null, error: "active_broadcast" };
  }

  const broadcast = await deps.store.createCountdownBroadcast(
    input.roomId,
    new Date(now + COUNTDOWN_DURATION_MS),
  );

  return { broadcast, error: null };
}

export async function cancelBroadcastCountdown(
  input: { broadcastId: string },
  deps: { store: BroadcastStore },
): Promise<CancelBroadcastCountdownResult> {
  const deleted = await deps.store.deleteBroadcast(input.broadcastId);
  return deleted ? { error: null } : { error: "not_found" };
}

export async function completeBroadcastCountdown(
  input: { broadcastId: string; now?: number },
  deps: { store: BroadcastStore },
): Promise<CompleteBroadcastCountdownResult> {
  const activeRecords = await findBroadcastById(input.broadcastId, deps.store);
  const record = activeRecords;

  if (!record) {
    return { broadcast: null, error: "not_found" };
  }

  if (record.state !== "countdown") {
    return { broadcast: null, error: "not_countdown" };
  }

  const now = input.now ?? Date.now();
  if (!record.countdownEndsAt || record.countdownEndsAt.getTime() > now + 250) {
    return { broadcast: null, error: "countdown_not_ready" };
  }

  const broadcast = await deps.store.markBroadcastBroadcasting(input.broadcastId, new Date(now));
  return broadcast ? { broadcast, error: null } : { broadcast: null, error: "not_found" };
}

export async function markBroadcastEnded(
  input: { broadcastId: string; now?: number },
  deps: { store: BroadcastStore },
): Promise<MarkBroadcastEndedResult> {
  const record = await findBroadcastById(input.broadcastId, deps.store);
  if (!record) {
    return { broadcast: null, error: "not_found" };
  }

  if (record.state !== "broadcasting") {
    return { broadcast: null, error: "invalid_state" };
  }

  const broadcast = await deps.store.markBroadcastEnded(
    input.broadcastId,
    new Date(input.now ?? Date.now()),
  );
  return broadcast ? { broadcast, error: null } : { broadcast: null, error: "not_found" };
}

export async function markBroadcastFailed(
  input: { broadcastId: string; failureMessage: string; now?: number },
  deps: { store: BroadcastStore },
): Promise<MarkBroadcastFailedResult> {
  const failureMessage = input.failureMessage.trim();
  if (!failureMessage) {
    return { broadcast: null, error: "missing_message" };
  }

  const record = await findBroadcastById(input.broadcastId, deps.store);
  if (!record) {
    return { broadcast: null, error: "not_found" };
  }

  if (record.state !== "broadcasting") {
    return { broadcast: null, error: "invalid_state" };
  }

  const broadcast = await deps.store.markBroadcastFailed(
    input.broadcastId,
    failureMessage,
    new Date(input.now ?? Date.now()),
  );
  return broadcast ? { broadcast, error: null } : { broadcast: null, error: "not_found" };
}

export async function syncProductBroadcastTerminalState(
  input: {
    productBroadcastId: string | null;
    state: "ended" | "failed";
    failureMessage?: string | null;
    now?: number;
  },
  deps: { store: BroadcastStore },
): Promise<void> {
  if (!input.productBroadcastId) {
    return;
  }

  if (input.state === "ended") {
    await markBroadcastEnded({ broadcastId: input.productBroadcastId, now: input.now }, deps);
    return;
  }

  await markBroadcastFailed(
    {
      broadcastId: input.productBroadcastId,
      failureMessage: input.failureMessage ?? "Broadcast failed.",
      now: input.now,
    },
    deps,
  );
}

async function findBroadcastById(
  broadcastId: string,
  store: BroadcastStore,
): Promise<BroadcastRecord | null> {
  return store.getBroadcastById(broadcastId);
}
