import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import DashboardPage from "./+page.svelte";

describe("Host dashboard YouTube channel control", () => {
  it("shows linked channel metadata and an unlink control", async () => {
    render(DashboardPage, {
      data: {
        hostEmail: "host@example.com",
        rooms: [],
        youtubeChannel: {
          id: "channel-1",
          title: "Live Channel",
        },
        youtubeLinkStatus: null,
      },
    });

    await expect.element(page.getByText("Linked as Live Channel.")).toBeInTheDocument();
    await expect
      .element(page.getByRole("button", { name: "Unlink YouTube channel" }))
      .toBeInTheDocument();
    await expect
      .element(page.getByRole("button", { name: "Link YouTube channel", exact: true }))
      .not.toBeInTheDocument();
  });
});
