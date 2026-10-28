import { consoleEmailSender, emailTemplates } from "@better-t-stack-template/auth";
import { afterAll, beforeAll, describe, expect, spyOn, test } from "bun:test";

import { Browser, createTestApp, signUpVerified, uniqueEmail, type TestApp } from "./helpers";

let app: TestApp;
beforeAll(async () => {
  app = await createTestApp();
});
afterAll(async () => {
  await app.db.$client.end();
});

describe("accounts (email + password)", () => {
  test("sign up sends a verification link and does not sign in until verified", async () => {
    const browser = new Browser(app);
    const email = uniqueEmail("signup");
    const res = await browser.post("/sign-up/email", {
      name: "Alice",
      email,
      password: "password1234",
    });
    expect(res.status).toBe(200);
    expect(await browser.session()).toBeNull();

    const mail = app.mail.lastTo(email);
    expect(mail.subject).toContain("Verify");
    expect(mail.url).toStartWith("http://localhost:3001/api/auth/verify-email?token=");

    // Unverified users cannot sign in.
    const login = await browser.post("/sign-in/email", { email, password: "password1234" });
    expect(login.status).toBe(403);

    // Following the link verifies and signs in.
    const verify = await browser.request(mail.url);
    expect(verify.status).toBeLessThan(400);
    const session = await browser.session();
    expect(session?.user.email).toBe(email);
    expect(session?.user.emailVerified).toBe(true);
    expect(session?.user.role).toBe("user");
  });

  test("login, sign out, wrong password", async () => {
    const { email, password } = await signUpVerified(app, "Bob");
    const browser = new Browser(app);
    const bad = await browser.post("/sign-in/email", { email, password: "wrong-password" });
    expect(bad.status).toBe(401);

    const ok = await browser.post("/sign-in/email", { email, password });
    expect(ok.status).toBe(200);
    expect((await browser.session())?.user.email).toBe(email);

    const out = await browser.post("/sign-out");
    expect(out.status).toBe(200);
    expect(await browser.session()).toBeNull();
  });

  test("password reset via logged link, old sessions revoked", async () => {
    const { browser: oldBrowser, email } = await signUpVerified(app, "Carol");
    const browser = new Browser(app);
    const req = await browser.post("/request-password-reset", {
      email,
      redirectTo: "http://localhost:3001/reset-password",
    });
    expect(req.status).toBe(200);
    const mail = app.mail.lastTo(email);
    expect(mail.subject).toContain("Reset");

    const follow = await browser.request(mail.url);
    expect(follow.status).toBe(302);
    const location = follow.headers.get("location")!;
    expect(location).toStartWith("http://localhost:3001/reset-password?token=");
    const token = new URL(location).searchParams.get("token");

    const reset = await browser.post("/reset-password", { newPassword: "new-password-99", token });
    expect(reset.status).toBe(200);

    expect(await oldBrowser.session()).toBeNull();
    const login = await browser.post("/sign-in/email", { email, password: "new-password-99" });
    expect(login.status).toBe(200);
  });

  test("default console email sender logs the action link", async () => {
    const spy = spyOn(console, "info").mockImplementation(() => {});
    try {
      await consoleEmailSender.send(
        emailTemplates.verifyEmail(
          "x@example.com",
          "http://localhost:3001/api/auth/verify-email?token=abc",
        ),
      );
      await consoleEmailSender.send(
        emailTemplates.resetPassword(
          "x@example.com",
          "http://localhost:3001/api/auth/reset-password/xyz",
        ),
      );
      const output = spy.mock.calls.map((c) => String(c[0])).join("\n");
      expect(output).toContain("To:      x@example.com");
      expect(output).toContain("verify-email?token=abc");
      expect(output).toContain("reset-password/xyz");
    } finally {
      spy.mockRestore();
    }
  });
});
