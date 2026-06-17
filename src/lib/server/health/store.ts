export type BroadcastHealthEventStatus =
  | "connecting"
  | "connected"
  | "degraded"
  | "failed"
  | "ended";

export type BroadcastHealthEventRecord = {
  id: string;
  broadcastId: string;
  status: BroadcastHealthEventStatus;
  message: string | null;
  payload: Record<string, unknown>;
  createdAt: Date;
};

export type HealthEventStore = {
  createEvent(input: {
    broadcastId: string;
    status: BroadcastHealthEventStatus;
    message: string | null;
    payload: Record<string, unknown>;
  }): Promise<BroadcastHealthEventRecord>;
  listEventsForBroadcast(broadcastId: string): Promise<BroadcastHealthEventRecord[]>;
};

export function createInMemoryHealthEventStore(): HealthEventStore {
  const records = new Map<string, BroadcastHealthEventRecord[]>();
  let nextId = 1;

  return {
    async createEvent(input) {
      const event: BroadcastHealthEventRecord = {
        id: `health-event-${nextId++}`,
        broadcastId: input.broadcastId,
        status: input.status,
        message: input.message,
        payload: input.payload,
        createdAt: new Date(),
      };
      const existing = records.get(input.broadcastId) ?? [];
      existing.push(event);
      records.set(input.broadcastId, existing);
      return event;
    },

    async listEventsForBroadcast(broadcastId) {
      return [...(records.get(broadcastId) ?? [])];
    },
  };
}
