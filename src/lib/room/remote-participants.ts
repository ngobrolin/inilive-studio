// Pure bookkeeping for remote participant tiles in the prototype Room.
//
// The Svelte media session translates livekit-client RoomEvents into the
// abstract events below and renders the resulting tiles. Keeping the state
// transitions pure makes the camera/mic placeholder logic unit-testable
// without a live LiveKit connection.

export type RemoteTrackKind = "camera" | "microphone";

export type RemoteParticipantEvent =
  | { type: "connected"; identity: string; name: string }
  | { type: "disconnected"; identity: string }
  | { type: "trackOn"; identity: string; name: string; kind: RemoteTrackKind }
  | { type: "trackOff"; identity: string; kind: RemoteTrackKind };

export type RemoteParticipantTile = {
  identity: string;
  name: string;
  cameraOn: boolean;
  microphoneOn: boolean;
};

export type RemoteParticipantsState = Map<string, RemoteParticipantTile>;

export function emptyRemoteParticipants(): RemoteParticipantsState {
  return new Map();
}

export function applyRemoteEvent(
  state: RemoteParticipantsState,
  event: RemoteParticipantEvent,
): RemoteParticipantsState {
  const next = new Map(state);

  switch (event.type) {
    case "connected": {
      const existing = next.get(event.identity);
      next.set(event.identity, {
        identity: event.identity,
        name: event.name,
        cameraOn: existing?.cameraOn ?? false,
        microphoneOn: existing?.microphoneOn ?? false,
      });
      break;
    }
    case "disconnected": {
      next.delete(event.identity);
      break;
    }
    case "trackOn": {
      const existing = next.get(event.identity);
      next.set(event.identity, {
        identity: event.identity,
        name: event.name,
        cameraOn: event.kind === "camera" ? true : (existing?.cameraOn ?? false),
        microphoneOn:
          event.kind === "microphone" ? true : (existing?.microphoneOn ?? false),
      });
      break;
    }
    case "trackOff": {
      const existing = next.get(event.identity);
      if (!existing) {
        break;
      }
      next.set(event.identity, {
        ...existing,
        cameraOn: event.kind === "camera" ? false : existing.cameraOn,
        microphoneOn: event.kind === "microphone" ? false : existing.microphoneOn,
      });
      break;
    }
  }

  return next;
}

export function listRemoteTiles(
  state: RemoteParticipantsState,
): RemoteParticipantTile[] {
  return [...state.values()];
}
