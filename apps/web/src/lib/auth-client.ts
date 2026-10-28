import { adminClient, organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [adminClient(), organizationClient()],
});

/** Better Auth client errors carry a message and/or statusText. */
export function authErrorMessage(
  error: { message?: string; statusText?: string } | null | undefined,
) {
  return error?.message || error?.statusText || "Something went wrong";
}
