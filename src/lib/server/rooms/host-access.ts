import type { RoomStore } from "./store";

export type ProductRoomHostAccess =
  | { kind: "not_found" }
  | { kind: "sign_in_required" }
  | { kind: "forbidden" }
  | { kind: "allowed"; hostAccountId: string };

export async function resolveProductRoomHostAccess(
  roomId: string,
  session: { hostAccountId: string } | null,
  deps: { store: RoomStore },
): Promise<ProductRoomHostAccess> {
  const room = await deps.store.getRoom(roomId);
  if (!room) {
    return { kind: "not_found" };
  }

  if (!session) {
    return { kind: "sign_in_required" };
  }

  if (room.hostAccountId !== session.hostAccountId) {
    return { kind: "forbidden" };
  }

  return { kind: "allowed", hostAccountId: session.hostAccountId };
}
