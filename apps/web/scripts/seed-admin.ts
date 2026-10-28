/**
 * Create (or promote) the first system admin from env vars.
 *   SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME (optional)
 * Usage: bun run db:seed
 */
import { seedAdmin } from "@better-t-stack-template/auth/seed";

import { ENV } from "../src/env";
import { auth, db } from "../src/services";

const email = ENV.SEED_ADMIN_EMAIL;
const password = ENV.SEED_ADMIN_PASSWORD;

if (!email || !password) {
  console.error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set.");
  process.exit(1);
}

try {
  const result = await seedAdmin(auth, db, {
    email,
    password,
    name: ENV.SEED_ADMIN_NAME || "Admin",
  });
  console.info(
    result.created ? `Created admin ${email}` : `User ${email} already existed; promoted to admin`,
  );
} finally {
  await db.$client.end();
}
