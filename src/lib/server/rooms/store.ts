export type HostRoom = {
  id: string;
  hostAccountId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
};

export type RoomStore = {
  createRoom(hostAccountId: string, title: string): Promise<HostRoom>;
  listRoomsForHost(hostAccountId: string): Promise<HostRoom[]>;
};

export function createInMemoryRoomStore(): RoomStore {
  const rooms = new Map<string, HostRoom>();
  const roomsByHost = new Map<string, HostRoom[]>();
  let nextId = 1;

  return {
    async createRoom(hostAccountId, title) {
      const now = new Date();
      const room: HostRoom = {
        id: `room-${nextId++}`,
        hostAccountId,
        title,
        createdAt: now,
        updatedAt: now,
      };
      rooms.set(room.id, room);
      const hostRooms = roomsByHost.get(hostAccountId) ?? [];
      hostRooms.push(room);
      roomsByHost.set(hostAccountId, hostRooms);
      return room;
    },

    async listRoomsForHost(hostAccountId) {
      return [...(roomsByHost.get(hostAccountId) ?? [])];
    },
  };
}
