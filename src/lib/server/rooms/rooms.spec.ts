import { describe, expect, it } from "vitest";
import { createHostRoom, listHostRooms, validateGuestInvite } from "./rooms";
import { hashToken } from "$lib/server/auth/tokens";
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
    expect(result.room?.guestInviteToken).toMatch(/^[\w-]{43}$/);
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

  it("accepts the active Guest Invite token and rejects other tokens for product Rooms", async () => {
    const store = createInMemoryRoomStore();
    const result = await createHostRoom(
      { hostAccountId: "host-1", title: "Weekly show" },
      { store },
    );
    const room = result.room!;

    await expect(
      validateGuestInvite({ roomId: room.id, token: room.guestInviteToken }, { store }),
    ).resolves.toBe("valid");
    await expect(
      validateGuestInvite({ roomId: room.id, token: hashToken(room.guestInviteToken) }, { store }),
    ).resolves.toBe("valid");
    await expect(
      validateGuestInvite({ roomId: room.id, token: "not-the-token" }, { store }),
    ).resolves.toBe("invalid");
  });

  it("keeps the development demo Guest Invite working for product-looking Room URLs", async () => {
    const store = createInMemoryRoomStore();
    const result = await createHostRoom(
      { hostAccountId: "host-1", title: "Weekly show" },
      { store },
    );
    const room = result.room!;

    await expect(validateGuestInvite({ roomId: room.id, token: "demo" }, { store })).resolves.toBe(
      "prototype_room",
    );
  });
});
