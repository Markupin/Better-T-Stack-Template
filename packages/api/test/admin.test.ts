import { seedAdmin } from "@better-t-stack-template/auth/seed";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import {
  Browser,
  createTestApp,
  expectORPCError,
  signUpVerified,
  uniqueEmail,
  type TestApp,
} from "./helpers";

let app: TestApp;
let adminBrowser: Browser;
const adminEmail = uniqueEmail("admin");

beforeAll(async () => {
  app = await createTestApp();
  await seedAdmin(app.auth, app.db, {
    email: adminEmail,
    password: "admin-password-1",
    name: "Admin",
  });
  adminBrowser = new Browser(app);
  const res = await adminBrowser.post("/sign-in/email", {
    email: adminEmail,
    password: "admin-password-1",
  });
  if (res.status !== 200) throw new Error("admin sign-in failed");
});
afterAll(async () => {
  await app.db.$client.end();
});

describe("seed", () => {
  test("seedAdmin creates a verified admin and is idempotent", async () => {
    const session = await adminBrowser.session();
    expect(session?.user.role).toBe("admin");
    expect(session?.user.emailVerified).toBe(true);
    const again = await seedAdmin(app.auth, app.db, {
      email: adminEmail,
      password: "ignored-1234",
      name: "Admin",
    });
    expect(again.created).toBe(false);
  });
});

describe("admin guard (oRPC)", () => {
  test("anonymous gets UNAUTHORIZED, non-admin gets FORBIDDEN, admin succeeds", async () => {
    const anon = await new Browser(app).rpc();
    await expectORPCError(anon.admin.stats(), "UNAUTHORIZED");

    const { browser } = await signUpVerified(app, "Regular");
    const userRpc = await browser.rpc();
    await expectORPCError(userRpc.admin.stats(), "FORBIDDEN");
    const me = await userRpc.account.me();
    expect(me.isAdmin).toBe(false);

    const adminRpc = await adminBrowser.rpc();
    const stats = await adminRpc.admin.stats();
    expect(stats.users).toBeGreaterThanOrEqual(2);
  });

  test("non-admin cannot call Better Auth admin endpoints", async () => {
    const { browser } = await signUpVerified(app, "Sneaky");
    const res = await browser.request("/admin/list-users?limit=10");
    expect(res.status).toBe(403);
  });
});

describe("admin user management", () => {
  test("list/search users with pagination", async () => {
    await signUpVerified(app, "Searchable Person");
    const res = await adminBrowser.request(
      "/admin/list-users?searchValue=Searchable&searchField=name&searchOperator=contains&limit=1&offset=0",
    );
    expect(res.status).toBe(200);
    expect(res.json.users).toHaveLength(1);
    expect(res.json.users[0].name).toBe("Searchable Person");
    expect(res.json.total).toBeGreaterThanOrEqual(1);
  });

  test("set role promotes to admin; admin guard then passes", async () => {
    const { browser, user } = await signUpVerified(app, "Promoted");
    const res = await adminBrowser.post("/admin/set-role", { userId: user.id, role: "admin" });
    expect(res.status).toBe(200);
    const rpc = await browser.rpc();
    expect((await rpc.admin.stats()).users).toBeGreaterThan(0);
  });

  test("ban revokes sessions and blocks sign-in; unban restores", async () => {
    const { browser, user, email, password } = await signUpVerified(app, "Troublemaker");
    const ban = await adminBrowser.post("/admin/ban-user", { userId: user.id, banReason: "spam" });
    expect(ban.status).toBe(200);
    expect(await browser.session()).toBeNull();

    const fresh = new Browser(app);
    const blocked = await fresh.post("/sign-in/email", { email, password });
    expect(blocked.status).toBe(403);

    const stats = await (await adminBrowser.rpc()).admin.stats();
    expect(stats.bannedUsers).toBeGreaterThanOrEqual(1);

    const unban = await adminBrowser.post("/admin/unban-user", { userId: user.id });
    expect(unban.status).toBe(200);
    expect((await fresh.post("/sign-in/email", { email, password })).status).toBe(200);
  });

  test("impersonate and stop impersonating", async () => {
    const { user } = await signUpVerified(app, "Impersonated");
    const imp = new Browser(app);
    await imp.post("/sign-in/email", { email: adminEmail, password: "admin-password-1" });
    const res = await imp.post("/admin/impersonate-user", { userId: user.id });
    expect(res.status).toBe(200);
    const session = await imp.session();
    expect(session?.user.id).toBe(user.id);
    expect(session?.session.impersonatedBy).toBeString();

    const stop = await imp.post("/admin/stop-impersonating");
    expect(stop.status).toBe(200);
    expect((await imp.session())?.user.email).toBe(adminEmail);
  });

  test("revoke all sessions of a user", async () => {
    const { browser, user } = await signUpVerified(app, "Revoked");
    const res = await adminBrowser.post("/admin/revoke-user-sessions", { userId: user.id });
    expect(res.status).toBe(200);
    expect(await browser.session()).toBeNull();
  });
});
