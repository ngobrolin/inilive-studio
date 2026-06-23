export type BroadcastRecordState = "countdown" | "broadcasting" | "ended" | "failed";

export type BroadcastRecord = {
  id: string;
  roomId: string;
  state: BroadcastRecordState;
  youtubeBroadcastId: string | null;
  failureMessage: string | null;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  countdownEndsAt: Date | null;
};

export type BroadcastStore = {
  createCountdownBroadcast(
    roomId: string,
    countdownEndsAt: Date,
  ): Promise<BroadcastRecord>;
  getBroadcastById(broadcastId: string): Promise<BroadcastRecord | null>;
  getActiveBroadcast(roomId: string): Promise<BroadcastRecord | null>;
  deleteBroadcast(broadcastId: string): Promise<boolean>;
  attachYouTubeBroadcast(
    broadcastId: string,
    youtubeBroadcastId: string,
  ): Promise<BroadcastRecord | null>;
  markBroadcastBroadcasting(broadcastId: string, startedAt: Date): Promise<BroadcastRecord | null>;
  markBroadcastEnded(broadcastId: string, endedAt: Date): Promise<BroadcastRecord | null>;
  markBroadcastFailed(
    broadcastId: string,
    failureMessage: string,
    endedAt: Date,
  ): Promise<BroadcastRecord | null>;
};

export function createInMemoryBroadcastStore(): BroadcastStore {
  const records = new Map<string, BroadcastRecord>();
  let nextId = 1;

  return {
    async createCountdownBroadcast(roomId, countdownEndsAt) {
      const record: BroadcastRecord = {
        id: `broadcast-${nextId++}`,
        roomId,
        state: "countdown",
        youtubeBroadcastId: null,
        failureMessage: null,
        startedAt: null,
        endedAt: null,
        createdAt: new Date(),
        countdownEndsAt,
      };
      records.set(record.id, record);
      return record;
    },

    async getBroadcastById(broadcastId) {
      return records.get(broadcastId) ?? null;
    },

    async getActiveBroadcast(roomId) {
      for (const record of records.values()) {
        if (
          record.roomId === roomId &&
          (record.state === "countdown" || record.state === "broadcasting")
        ) {
          return record;
        }
      }
      return null;
    },

    async deleteBroadcast(broadcastId) {
      return records.delete(broadcastId);
    },

    async attachYouTubeBroadcast(broadcastId, youtubeBroadcastId) {
      const record = records.get(broadcastId);
      if (!record) return null;
      const updated = {
        ...record,
        youtubeBroadcastId,
      };
      records.set(broadcastId, updated);
      return updated;
    },

    async markBroadcastBroadcasting(broadcastId, startedAt) {
      const record = records.get(broadcastId);
      if (!record) return null;
      const updated = {
        ...record,
        state: "broadcasting" as const,
        startedAt,
        countdownEndsAt: null,
      };
      records.set(broadcastId, updated);
      return updated;
    },

    async markBroadcastEnded(broadcastId, endedAt) {
      const record = records.get(broadcastId);
      if (!record) return null;
      const updated = {
        ...record,
        state: "ended" as const,
        endedAt,
        countdownEndsAt: null,
      };
      records.set(broadcastId, updated);
      return updated;
    },

    async markBroadcastFailed(broadcastId, failureMessage, endedAt) {
      const record = records.get(broadcastId);
      if (!record) return null;
      const updated = {
        ...record,
        state: "failed" as const,
        failureMessage,
        endedAt,
        countdownEndsAt: null,
      };
      records.set(broadcastId, updated);
      return updated;
    },
  };
}
