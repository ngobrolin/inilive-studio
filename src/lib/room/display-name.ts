export const DISPLAY_NAME_MAX_LENGTH = 50;

export function hasDisplayName(value: string): boolean {
  return value.trim().length > 0;
}

export function displayNameError(value: string): string | null {
  if (!hasDisplayName(value)) {
    return "Display Name is required before entering the Room.";
  }

  if (value.length > DISPLAY_NAME_MAX_LENGTH) {
    return `Display Name must be ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`;
  }

  return null;
}
