import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getAudioSources,
  getAudioVersion,
  getVideoSource,
  registerAudioSource,
  registerVideoSource,
  resetMediaRegistry,
  subscribeAudioSources,
} from "./media-registry";

const fakeVideo = (label: string) => ({ label }) as unknown as HTMLVideoElement;
const fakeTrack = (label: string) => ({ label }) as unknown as MediaStreamTrack;

afterEach(() => {
  resetMediaRegistry();
});

describe("media-registry video sources", () => {
  it("keeps camera and screen sources for the same identity independent", () => {
    const camera = fakeVideo("camera");
    const screen = fakeVideo("screen");

    registerVideoSource("host-1", "camera", camera);
    registerVideoSource("host-1", "screen", screen);

    expect(getVideoSource("host-1", "camera")).toBe(camera);
    expect(getVideoSource("host-1", "screen")).toBe(screen);
  });

  it("returns null for unregistered sources", () => {
    expect(getVideoSource("missing", "camera")).toBeNull();
  });

  it("replaces an earlier registration with a later one for the same key", () => {
    const first = fakeVideo("first");
    const second = fakeVideo("second");

    registerVideoSource("guest-1", "camera", first);
    registerVideoSource("guest-1", "camera", second);

    expect(getVideoSource("guest-1", "camera")).toBe(second);
  });

  it("does not delete a newer registration when a stale unregister runs", () => {
    const stale = fakeVideo("stale");
    const fresh = fakeVideo("fresh");

    const unregisterStale = registerVideoSource("guest-2", "camera", stale);
    registerVideoSource("guest-2", "camera", fresh);
    unregisterStale();

    expect(getVideoSource("guest-2", "camera")).toBe(fresh);
  });
});

describe("media-registry audio sources", () => {
  it("collects registered tracks and notifies subscribers on change", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeAudioSources(listener);
    const startingVersion = getAudioVersion();

    const track = fakeTrack("mic");
    const unregister = registerAudioSource("host-1", track);

    expect(getAudioSources()).toEqual([track]);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getAudioVersion()).toBe(startingVersion + 1);

    unregister();
    expect(getAudioSources()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
  });
});
