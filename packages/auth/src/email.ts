/**
 * Minimal email abstraction used by the auth flows.
 *
 * Better Auth only gives us hooks (sendVerificationEmail, sendResetPassword,
 * sendInvitationEmail). It does not send email itself. The default sender
 * logs the message (including the action link) to the server console so the
 * flows work out of the box. Plug a real provider in by implementing
 * `EmailSender` and passing it to `createAuth(env, db, { email })`.
 */
export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  /** The primary action link (verify / reset / accept invite). */
  url: string;
};

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

export const consoleEmailSender: EmailSender = {
  async send(message) {
    console.info(
      [
        "",
        "──────── [email] (console sender, no provider configured) ────────",
        `To:      ${message.to}`,
        `Subject: ${message.subject}`,
        "",
        message.text,
        "",
        `Link:    ${message.url}`,
        "──────────────────────────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
  },
};

export const emailTemplates = {
  verifyEmail: (to: string, url: string): EmailMessage => ({
    to,
    url,
    subject: "Verify your email address",
    text: `Click the link below to verify your email address:\n${url}`,
  }),
  resetPassword: (to: string, url: string): EmailMessage => ({
    to,
    url,
    subject: "Reset your password",
    text: `Click the link below to reset your password. If you did not request this, ignore this email.\n${url}`,
  }),
  organizationInvitation: (
    to: string,
    url: string,
    data: { organizationName: string; inviterName: string; role: string },
  ): EmailMessage => ({
    to,
    url,
    subject: `You've been invited to join ${data.organizationName}`,
    text: `${data.inviterName} invited you to join ${data.organizationName} as ${data.role}.\nAccept the invitation:\n${url}`,
  }),
};
