import { createAuth, type EmailMessage, type EmailSender } from "@better-t-stack-template/auth";
import { createDb } from "@better-t-stack-template/db";
import { createRouterClient } from "@orpc/server";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { fileURLToPath } from "node:url";

import type { Context } from "../src/context";
import { appRouter } from "../src/routers/index";

export const BASE_URL = "http://localhost:3001";
const DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:password@localhost:5432/better-t-stack-template-test";

const migrationsFolder = fileURLToPath(new URL("../../db/src/migrations", import.meta.url));

/** Captures emails in memory instead of logging them. */
export function createMemoryEmailSender() {
  const outbox: EmailMessage[] = [];
  const sender: EmailSender = {
    async send(message) {
      outbox.push(message);
    },
  };
  const lastTo = (to: string) => {
    const found = outbox.findLast((m) => m.to === to);
    if (!found) throw new Error(`No email sent to ${to}`);
    return found;
  };
  return { outbox, sender, lastTo };
}

export async function createTestApp() {
  const db = createDb({ DATABASE_URL });
  await migrate(db, { migrationsFolder });
  await db.execute(
    sql`TRUNCATE TABLE "invitation", "member", "organization", "verification", "session", "account", "user" CASCADE`,
  );
  const mail = createMemoryEmailSender();
  const auth = createAuth(
    { BETTER_AUTH_URL: BASE_URL, BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-123" },
    db,
    { email: mail.sender },
  );
  return { db, auth, mail };
}

export type TestApp = Awaited<ReturnType<typeof createTestApp>>;

/** A cookie-carrying HTTP client that talks to the Better Auth handler. */
export class Browser {
  private cookies = new Map<string, string>();
  constructor(private app: TestApp) {}

  get cookieHeader() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  headers() {
    const h = new Headers({ origin: BASE_URL });
    if (this.cookies.size) h.set("cookie", this.cookieHeader);
    return h;
  }

  private store(res: Response) {
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const idx = pair!.indexOf("=");
      const name = pair!.slice(0, idx);
      const value = pair!.slice(idx + 1);
      if (value === "" || /max-age=0/i.test(c)) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }

  async request(path: string, init: { method?: string; body?: unknown } = {}) {
    const url = path.startsWith("http") ? path : `${BASE_URL}/api/auth${path}`;
    const headers = this.headers();
    if (init.body !== undefined) headers.set("content-type", "application/json");
    const res = await this.app.auth.handler(
      new Request(url, {
        method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
        headers,
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
        redirect: "manual",
      }),
    );
    this.store(res);
    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }
    return { status: res.status, json, headers: res.headers };
  }

  post(path: string, body: unknown = {}) {
    return this.request(path, { method: "POST", body });
  }

  async session() {
    return this.app.auth.api.getSession({ headers: this.headers() });
  }

  /** oRPC client bound to this browser's session (same context the web app builds). */
  async rpc() {
    const session = await this.session();
    const context: Context = { db: this.app.db, session };
    return createRouterClient(appRouter, { context });
  }
}

let counter = 0;
export function uniqueEmail(prefix = "user") {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}@example.com`;
}

/** Sign up, follow the logged verification link (auto sign-in). */
export async function signUpVerified(app: TestApp, name = "Test User", email = uniqueEmail()) {
  const browser = new Browser(app);
  const password = "password1234";
  const res = await browser.post("/sign-up/email", { name, email, password });
  if (res.status !== 200) throw new Error(`sign-up failed: ${JSON.stringify(res.json)}`);
  const verify = await browser.request(app.mail.lastTo(email).url);
  if (verify.status >= 400) throw new Error(`verify failed: ${verify.status}`);
  const session = await browser.session();
  if (!session) throw new Error("not signed in after verification");
  return { browser, email, password, user: session.user };
}

export async function expectORPCError(promise: Promise<unknown>, code: string) {
  try {
    await promise;
  } catch (error) {
    const actual = (error as { code?: string }).code;
    if (actual !== code) throw new Error(`Expected ORPCError ${code}, got ${actual}: ${error}`);
    return;
  }
  throw new Error(`Expected ORPCError ${code}, but call succeeded`);
}
