import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import type { Database } from "@better-t-stack-template/db";
import * as schema from "@better-t-stack-template/db/schema/auth";
import { betterAuth } from "better-auth";
import { admin, organization } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { consoleEmailSender, emailTemplates, type EmailSender } from "./email";
import { ADMIN_ROLE } from "./roles";

export type AuthConfig = {
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
};

export type AuthOptions = {
  /** Email transport. Defaults to logging messages to the server console. */
  email?: EmailSender;
};

export function createAuth(env: AuthConfig, database: Database, options: AuthOptions = {}) {
  const email = options.email ?? consoleEmailSender;
  const appUrl = env.BETTER_AUTH_URL.replace(/\/$/, "");

  return betterAuth({
    database: drizzleAdapter(database, {
      provider: "pg",
      schema,
    }),
    trustedOrigins: [env.BETTER_AUTH_URL],
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await email.send(emailTemplates.resetPassword(user.email, url));
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await email.send(emailTemplates.verifyEmail(user.email, url));
      },
    },
    plugins: [
      admin({
        defaultRole: "user",
        adminRoles: [ADMIN_ROLE],
      }),
      organization({
        sendInvitationEmail: async (data) => {
          const url = `${appUrl}/accept-invitation/${data.id}`;
          await email.send(
            emailTemplates.organizationInvitation(data.email, url, {
              organizationName: data.organization.name,
              inviterName: data.inviter.user.name,
              role: data.role,
            }),
          );
        },
      }),
      // Must stay last: lets Better Auth set cookies from TanStack Start server functions.
      tanstackStartCookies(),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type Session = Auth["$Infer"]["Session"];

export type { EmailMessage, EmailSender } from "./email";
export { consoleEmailSender, emailTemplates } from "./email";
export * from "./roles";
