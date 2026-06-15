export type JoinCheckMediaStatus =
  | "loading"
  | "ready"
  | "permission-denied"
  | "no-devices"
  | "unsupported";

export function isJoinCheckMediaSupported(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  const userAgent = navigator.userAgent;
  const isIosSafari =
    /iPad|iPhone|iPod/.test(userAgent) && !("MSStream" in window);

  if (isIosSafari) {
    return false;
  }

  return typeof navigator.mediaDevices?.getUserMedia === "function";
}

export async function requestLocalPreview(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true,
  });
}

export function attachLocalPreview(
  videoElement: HTMLVideoElement,
  stream: MediaStream,
): void {
  videoElement.srcObject = stream;
  void videoElement.play();
}

export function stopLocalPreview(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

export function setCameraEnabled(stream: MediaStream, enabled: boolean): void {
  for (const track of stream.getVideoTracks()) {
    track.enabled = enabled;
  }
}

export function setMicrophoneEnabled(stream: MediaStream, enabled: boolean): void {
  for (const track of stream.getAudioTracks()) {
    track.enabled = enabled;
  }
}

export type MediaDeviceLists = {
  cameras: MediaDeviceInfo[];
  microphones: MediaDeviceInfo[];
};

export async function listMediaDevices(): Promise<MediaDeviceLists> {
  const devices = await navigator.mediaDevices.enumerateDevices();

  return {
    cameras: devices.filter((device) => device.kind === "videoinput"),
    microphones: devices.filter((device) => device.kind === "audioinput"),
  };
}

export async function switchCameraDevice(
  stream: MediaStream,
  deviceId: string,
): Promise<MediaStream> {
  const nextStream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { deviceId: { exact: deviceId } },
  });

  const videoTrack = nextStream.getVideoTracks()[0];
  const audioTracks = stream.getAudioTracks();

  for (const track of stream.getVideoTracks()) {
    track.stop();
    stream.removeTrack(track);
  }

  stream.addTrack(videoTrack);
  for (const track of audioTracks) {
    stream.addTrack(track);
  }

  nextStream.getTracks().forEach((track) => {
    if (track !== videoTrack) {
      track.stop();
    }
  });

  return stream;
}

export function readMicrophoneLevel(samples: Uint8Array): number {
  if (samples.length === 0) {
    return 0;
  }

  let sumSquares = 0;
  for (const sample of samples) {
    const normalized = (sample - 128) / 128;
    sumSquares += normalized * normalized;
  }

  const rootMeanSquare = Math.sqrt(sumSquares / samples.length);
  return Math.min(1, rootMeanSquare * 2.5);
}

export function createMicrophoneLevelMonitor(
  stream: MediaStream,
  onLevel: (level: number) => void,
): () => void {
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);

  const samples = new Uint8Array(analyser.fftSize);
  let animationFrameId = 0;

  const sampleLevel = () => {
    analyser.getByteTimeDomainData(samples);
    onLevel(readMicrophoneLevel(samples));
    animationFrameId = requestAnimationFrame(sampleLevel);
  };

  animationFrameId = requestAnimationFrame(sampleLevel);

  return () => {
    cancelAnimationFrame(animationFrameId);
    source.disconnect();
    void audioContext.close();
  };
}

export async function switchMicrophoneDevice(
  stream: MediaStream,
  deviceId: string,
): Promise<MediaStream> {
  const nextStream = await navigator.mediaDevices.getUserMedia({
    audio: { deviceId: { exact: deviceId } },
    video: false,
  });

  const audioTrack = nextStream.getAudioTracks()[0];
  const videoTracks = stream.getVideoTracks();

  for (const track of stream.getAudioTracks()) {
    track.stop();
    stream.removeTrack(track);
  }

  stream.addTrack(audioTrack);
  for (const track of videoTracks) {
    stream.addTrack(track);
  }

  nextStream.getTracks().forEach((track) => {
    if (track !== audioTrack) {
      track.stop();
    }
  });

  return stream;
}
