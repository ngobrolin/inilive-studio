import { describe, expect, it, vi } from "vitest";
import { startCompositorClock, type CompositorClockWorker } from "./compositor-clock";

describe("startCompositorClock", () => {
  it("uses worker ticks so composition is not tied to foreground animation frames", () => {
    const draw = vi.fn();
    const requestFrame = vi.fn();
    const worker: CompositorClockWorker = {
      onmessage: null,
      terminate: vi.fn(),
    };

    const clock = startCompositorClock({
      draw,
      createWorker: () => worker,
      requestFrame,
      cancelFrame: vi.fn(),
      now: () => 1234,
    });

    worker.onmessage?.({} as MessageEvent);
    worker.onmessage?.({} as MessageEvent);

    expect(draw).toHaveBeenNthCalledWith(1, 1234);
    expect(draw).toHaveBeenCalledTimes(2);
    expect(requestFrame).not.toHaveBeenCalled();

    clock.stop();
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it("falls back to requestAnimationFrame when workers are unavailable", () => {
    const draw = vi.fn();
    const cancelFrame = vi.fn();
    let animationCallback: FrameRequestCallback = () => {
      throw new Error("animation callback was not registered");
    };
    const requestFrame = vi.fn((callback: FrameRequestCallback) => {
      animationCallback = callback;
      return 17;
    });

    const clock = startCompositorClock({
      draw,
      createWorker: () => null,
      requestFrame,
      cancelFrame,
      now: () => 0,
    });

    expect(requestFrame).toHaveBeenCalledOnce();
    animationCallback(42);
    expect(draw).toHaveBeenCalledWith(42);

    clock.stop();
    expect(cancelFrame).toHaveBeenCalledWith(17);
  });
});
