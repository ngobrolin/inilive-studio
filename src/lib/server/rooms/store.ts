export type HostRoom = {
  id: string;
  hostAccountId: string;
  title: string;
  guestInviteToken: string;
  createdAt: Date;
  updatedAt: Date;
};

export type RoomStore = {
  createRoom(hostAccountId: string, title: string, guestInviteTokenHash: string): Promise<HostRoom>;
  listRoomsForHost(hostAccountId: string): Promise<HostRoom[]>;
  getRoom(roomId: string): Promise<HostRoom | null>;
  roomExists(roomId: string): Promise<boolean>;
  hasActiveGuestInvite(roomId: string, tokenHash: string): Promise<boolean>;
  regenerateGuestInvite(
    hostAccountId: string,
    roomId: string,
    guestInviteTokenHash: string,
  ): Promise<boolean>;
};

export function createInMemoryRoomStore(): RoomStore {
  const rooms = new Map<string, HostRoom>();
  const roomsByHost = new Map<string, HostRoom[]>();
  const activeGuestInviteHashes = new Map<string, string>();
  let nextId = 1;

  return {
    async createRoom(hostAccountId, title, guestInviteTokenHash) {
      const now = new Date();
      const room: HostRoom = {
        id: `room-${nextId++}`,
        hostAccountId,
        title,
        guestInviteToken: guestInviteTokenHash,
        createdAt: now,
        updatedAt: now,
      };
      rooms.set(room.id, room);
      activeGuestInviteHashes.set(room.id, guestInviteTokenHash);
      const hostRooms = roomsByHost.get(hostAccountId) ?? [];
      hostRooms.push(room);
      roomsByHost.set(hostAccountId, hostRooms);
      return room;
    },

    async listRoomsForHost(hostAccountId) {
      return [...(roomsByHost.get(hostAccountId) ?? [])];
    },

    async getRoom(roomId) {
      return rooms.get(roomId) ?? null;
    },

    async roomExists(roomId) {
      return rooms.has(roomId);
    },

    async hasActiveGuestInvite(roomId, tokenHash) {
      return activeGuestInviteHashes.get(roomId) === tokenHash;
    },

    async regenerateGuestInvite(hostAccountId, roomId, guestInviteTokenHash) {
      const room = rooms.get(roomId);
      if (room?.hostAccountId !== hostAccountId) {
        return false;
      }

      activeGuestInviteHashes.set(roomId, guestInviteTokenHash);
      room.guestInviteToken = guestInviteTokenHash;
      room.updatedAt = new Date();
      return true;
    },
  };
}
