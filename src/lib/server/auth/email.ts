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

export function createConsoleMagicLinkEmailSender(appOrigin: string): MagicLinkEmailSender {
  return async ({ email, token }) => {
    console.info(
      `Magic link requested for ${email}. Open ${appOrigin}/auth/verify to complete sign-in.`,
    );
    console.info(`Dev token for ${email}: ${token}`);
  };
}
