export type RoomEntryRole = "host" | "guest";

export type RoomEntryCopy = {
  eyebrow: string;
  title: string;
  body: string;
  primaryAction: string;
  secondaryAction: string;
};

export function roomEntryCopy(role: RoomEntryRole): RoomEntryCopy {
  if (role === "host") {
    return {
      eyebrow: "Host Room URL",
      title: "Prepare the Room before anything is Broadcasting",
      body: "Open an authless Host view, copy the Guest Invite, and keep the Room in Backstage while setup is still local and ephemeral.",
      primaryAction: "Enter as Host",
      secondaryAction: "Copy Guest Invite",
    };
  }

  return {
    eyebrow: "Guest Invite URL",
    title: "Join the Room without creating an Account",
    body: "Guests arrive through the invite link, confirm their Display Name later, and wait in Backstage without touching Host controls.",
    primaryAction: "Enter as Guest",
    secondaryAction: "View Host Room URL",
  };
}

export function guestInvitePath(roomId: string, token = "demo") {
  return `/room/${roomId}/invite/${token}`;
}

export function hostRoomPath(roomId: string) {
  return `/room/${roomId}`;
}
