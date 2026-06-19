export type CompositorClockWorker = {
  onmessage: ((event: MessageEvent) => void) | null;
  terminate(): void;
};

type StartCompositorClockOptions = {
  draw: (now: number) => void;
  frameRate?: number;
  createWorker?: (frameRate: number) => CompositorClockWorker | null;
  requestFrame?: (callback: FrameRequestCallback) => number;
  cancelFrame?: (handle: number) => void;
  now?: () => number;
};

export function startCompositorClock({
  draw,
  frameRate = 30,
  createWorker = createCompositorClockWorker,
  requestFrame = requestAnimationFrame,
  cancelFrame = cancelAnimationFrame,
  now = () => performance.now(),
}: StartCompositorClockOptions) {
  const worker = createWorker(frameRate);
  if (worker) {
    let stopped = false;
    worker.onmessage = () => {
      if (!stopped) {
        draw(now());
      }
    };

    return {
      stop() {
        stopped = true;
        worker.onmessage = null;
        worker.terminate();
      },
    };
  }

  let animationFrame = 0;
  function tick(timestamp: number) {
    draw(timestamp);
    animationFrame = requestFrame(tick);
  }
  animationFrame = requestFrame(tick);

  return {
    stop() {
      cancelFrame(animationFrame);
    },
  };
}

function createCompositorClockWorker(frameRate: number): CompositorClockWorker | null {
  if (typeof Worker === "undefined" || typeof Blob === "undefined" || typeof URL === "undefined") {
    return null;
  }

  const intervalMs = 1000 / frameRate;
  const workerUrl = URL.createObjectURL(
    new Blob([`setInterval(() => postMessage("frame"), ${intervalMs});`], {
      type: "text/javascript",
    }),
  );

  try {
    return new Worker(workerUrl);
  } finally {
    URL.revokeObjectURL(workerUrl);
  }
}
