import { describe, expect, it } from "vitest";
import { createHostRoom } from "./rooms";
import { resolveProductRoomHostAccess } from "./host-access";
import { createInMemoryRoomStore } from "./store";

describe("product room host access", () => {
  it("allows authless access to prototype Rooms that are not in the product store", async () => {
    const store = createInMemoryRoomStore();

    await expect(resolveProductRoomHostAccess("demo", null, { store })).resolves.toEqual({
      kind: "prototype_room",
    });
  });

  it("requires a Host session to enter a product Room", async () => {
    const store = createInMemoryRoomStore();
    const { room } = await createHostRoom(
      { hostAccountId: "host-1", title: "Weekly show" },
      {
        store,
      },
    );

    await expect(resolveProductRoomHostAccess(room!.id, null, { store })).resolves.toEqual({
      kind: "sign_in_required",
    });
  });

  it("allows only the Room owner Host to enter a product Room", async () => {
    const store = createInMemoryRoomStore();
    const { room } = await createHostRoom(
      { hostAccountId: "host-1", title: "Weekly show" },
      {
        store,
      },
    );

    await expect(
      resolveProductRoomHostAccess(room!.id, { hostAccountId: "host-2" }, { store }),
    ).resolves.toEqual({ kind: "forbidden" });

    await expect(
      resolveProductRoomHostAccess(room!.id, { hostAccountId: "host-1" }, { store }),
    ).resolves.toEqual({ kind: "allowed", hostAccountId: "host-1" });
  });
});
