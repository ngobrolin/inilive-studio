import type { HostRoom, RoomStore } from "./store";

export type CreateHostRoomResult = {
  room: HostRoom | null;
  error: "invalid_title" | null;
};

export async function createHostRoom(
  input: { hostAccountId: string; title: string },
  deps: { store: RoomStore },
): Promise<CreateHostRoomResult> {
  const title = input.title.trim();
  if (!title) {
    return { room: null, error: "invalid_title" };
  }

  const room = await deps.store.createRoom(input.hostAccountId, title);
  return { room, error: null };
}

export async function listHostRooms(
  hostAccountId: string,
  deps: { store: RoomStore },
): Promise<HostRoom[]> {
  return deps.store.listRoomsForHost(hostAccountId);
}
