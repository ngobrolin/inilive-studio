import { describe, expect, it } from "vitest";
import { createHostRoom, listHostRooms } from "./rooms";
import { createInMemoryRoomStore } from "./store";

describe("host rooms", () => {
  it("lets a signed-in Host create a Room with a Room Title", async () => {
    const store = createInMemoryRoomStore();

    const result = await createHostRoom(
      { hostAccountId: "host-1", title: "Weekly show" },
      { store },
    );

    expect(result.error).toBeNull();
    expect(result.room).toMatchObject({
      hostAccountId: "host-1",
      title: "Weekly show",
    });
    expect(result.room?.id).toMatch(/^room-/);
  });

  it("shows only the signed-in Host's Rooms on the dashboard list", async () => {
    const store = createInMemoryRoomStore();

    await createHostRoom({ hostAccountId: "host-1", title: "Weekly show" }, { store });
    await createHostRoom({ hostAccountId: "host-1", title: "Guest hour" }, { store });
    await createHostRoom({ hostAccountId: "host-2", title: "Other Host room" }, { store });

    const hostOneRooms = await listHostRooms("host-1", { store });
    const hostTwoRooms = await listHostRooms("host-2", { store });

    expect(hostOneRooms.map((room) => room.title)).toEqual(["Weekly show", "Guest hour"]);
    expect(hostTwoRooms.map((room) => room.title)).toEqual(["Other Host room"]);
  });
});
