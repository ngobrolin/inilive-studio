// Shared media-source registry bridging the live LiveKit media session and the
// Composed Room Feed compositor.
//
// `LiveKitMediaSession` and `ComposedFeedCanvas` are mounted in different panels
// and share no props, so the actual camera/screen video elements and audio
// tracks were previously trapped inside the media session and never reached the
// canvas that is published to WHIP/YouTube. This module is a process-local
// singleton both components import: the media session registers live sources and
// the compositor pulls them every animation frame.
//
// Media objects (HTMLVideoElement, MediaStreamTrack) are deliberately kept out
// of Svelte reactive state, matching the existing non-reactive media-element
// pattern in LiveKitMediaSession, so attaching tracks never triggers a render
// loop.

export type VideoSourceKind = "camera" | "screen";

type VideoRegistration = { element: HTMLVideoElement; token: symbol };
type AudioRegistration = { track: MediaStreamTrack; token: symbol };

const cameraVideos = new Map<string, VideoRegistration>();
const screenVideos = new Map<string, VideoRegistration>();
const audioTracks = new Map<string, AudioRegistration>();
const audioListeners = new Set<() => void>();
let audioVersion = 0;

function videoMap(kind: VideoSourceKind): Map<string, VideoRegistration> {
  return kind === "camera" ? cameraVideos : screenVideos;
}

/**
 * Register a live video element for an identity. Camera and screen share are
 * kept in separate maps so a participant sharing their screen while their
 * camera is on does not overwrite either source.
 *
 * Returns an unregister function that only removes the entry if it has not been
 * replaced by a newer registration (token guard), so stale Svelte effect
 * cleanups cannot delete a fresh element.
 */
export function registerVideoSource(
  identity: string,
  kind: VideoSourceKind,
  element: HTMLVideoElement,
): () => void {
  const token = Symbol();
  videoMap(kind).set(identity, { element, token });
  return () => {
    const map = videoMap(kind);
    if (map.get(identity)?.token === token) {
      map.delete(identity);
    }
  };
}

export function getVideoSource(identity: string, kind: VideoSourceKind): HTMLVideoElement | null {
  return videoMap(kind).get(identity)?.element ?? null;
}

function notifyAudio(): void {
  audioVersion += 1;
  for (const listener of audioListeners) {
    listener();
  }
}

/**
 * Register a live audio track for mixing into the composed feed. One track per
 * identity (the participant microphone) is enough for the current scope.
 */
export function registerAudioSource(identity: string, track: MediaStreamTrack): () => void {
  const token = Symbol();
  audioTracks.set(identity, { track, token });
  notifyAudio();
  return () => {
    if (audioTracks.get(identity)?.token === token) {
      audioTracks.delete(identity);
      notifyAudio();
    }
  };
}

export function getAudioSources(): MediaStreamTrack[] {
  return [...audioTracks.values()].map((registration) => registration.track);
}

export function subscribeAudioSources(listener: () => void): () => void {
  audioListeners.add(listener);
  return () => {
    audioListeners.delete(listener);
  };
}

export function getAudioVersion(): number {
  return audioVersion;
}

/** Test/teardown helper. Does not stop any tracks; callers own track lifetime. */
export function resetMediaRegistry(): void {
  cameraVideos.clear();
  screenVideos.clear();
  audioTracks.clear();
  notifyAudio();
}

// Narrow browser hook so end-to-end tests can inject a synthetic playing video
// source and prove camera frames reach the composed canvas without a live
// LiveKit connection.
if (typeof window !== "undefined") {
  (
    window as unknown as {
      __iniliveRoomMediaRegistry?: {
        registerVideoSource: typeof registerVideoSource;
        registerAudioSource: typeof registerAudioSource;
      };
    }
  ).__iniliveRoomMediaRegistry = { registerVideoSource, registerAudioSource };
}
