import type { HostRoom, RoomStore } from "./store";
import { generateSecureToken, hashToken } from "$lib/server/auth/tokens";

export type CreateHostRoomResult = {
  room: HostRoom | null;
  error: "invalid_title" | null;
};

export type RegenerateGuestInviteResult = {
  guestInviteToken: string | null;
  error: "not_found" | null;
};

export async function createHostRoom(
  input: { hostAccountId: string; title: string },
  deps: { store: RoomStore },
): Promise<CreateHostRoomResult> {
  const title = input.title.trim();
  if (!title) {
    return { room: null, error: "invalid_title" };
  }

  const guestInviteToken = generateSecureToken();
  const room = await deps.store.createRoom(input.hostAccountId, title, hashToken(guestInviteToken));
  room.guestInviteToken = guestInviteToken;
  return { room, error: null };
}

export async function listHostRooms(
  hostAccountId: string,
  deps: { store: RoomStore },
): Promise<HostRoom[]> {
  return deps.store.listRoomsForHost(hostAccountId);
}

export async function validateGuestInvite(
  input: { roomId: string; token: string },
  deps: { store: RoomStore },
): Promise<"valid" | "invalid" | "prototype_room"> {
  const roomExists = await deps.store.roomExists(input.roomId);
  if (!roomExists) {
    return "prototype_room";
  }

  const tokenHash = hashToken(input.token);
  const hasInvite =
    (await deps.store.hasActiveGuestInvite(input.roomId, tokenHash)) ||
    (await deps.store.hasActiveGuestInvite(input.roomId, input.token));

  return hasInvite ? "valid" : "invalid";
}

export async function regenerateGuestInvite(
  input: { hostAccountId: string; roomId: string },
  deps: { store: RoomStore },
): Promise<RegenerateGuestInviteResult> {
  const guestInviteToken = generateSecureToken();
  const regenerated = await deps.store.regenerateGuestInvite(
    input.hostAccountId,
    input.roomId,
    hashToken(guestInviteToken),
  );

  if (!regenerated) {
    return { guestInviteToken: null, error: "not_found" };
  }

  return { guestInviteToken, error: null };
}
