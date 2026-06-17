import type { MagicLinkEmailSender } from "./magic-link";

export type CapturedMagicLinkEmail = {
  email: string;
  token: string;
};

export function createCapturingEmailSender(): {
  sendEmail: MagicLinkEmailSender;
  getSentEmails(): CapturedMagicLinkEmail[];
} {
  const sentEmails: CapturedMagicLinkEmail[] = [];

  return {
    sendEmail: async (input) => {
      sentEmails.push(input);
    },
    getSentEmails() {
      return [...sentEmails];
    },
  };
}

export function buildMagicLinkVerifyUrl(appOrigin: string, token: string): string {
  return `${appOrigin}/auth/verify#${token}`;
}

export function createConsoleMagicLinkEmailSender(appOrigin: string): MagicLinkEmailSender {
  return async ({ email, token }) => {
    const verifyUrl = buildMagicLinkVerifyUrl(appOrigin, token);
    console.info(
      `Magic link requested for ${email}. Open this URL to complete sign-in:\n${verifyUrl}`,
    );
  };
}
