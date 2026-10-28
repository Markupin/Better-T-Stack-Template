import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { createTestApp, expectORPCError, signUpVerified, type TestApp } from "./helpers";

let app: TestApp;
beforeAll(async () => {
  app = await createTestApp();
});
afterAll(async () => {
  await app.db.$client.end();
});

describe("organizations", () => {
  test("create, invite (link logged), accept, change role, remove, leave + org role guard", async () => {
    const owner = await signUpVerified(app, "Owner");
    const invitee = await signUpVerified(app, "Invitee");
    const third = await signUpVerified(app, "Third");

    // No active organization yet → orgProcedure rejects.
    await expectORPCError((await owner.browser.rpc()).organization.current(), "BAD_REQUEST");

    const created = await owner.browser.post("/organization/create", {
      name: "Acme",
      slug: `acme-${Date.now()}`,
    });
    expect(created.status).toBe(200);
    const orgId: string = created.json.id;
    await owner.browser.post("/organization/set-active", { organizationId: orgId });

    const ownerRpc = await owner.browser.rpc();
    const current = await ownerRpc.organization.current();
    expect(current.role).toBe("owner");
    expect(current.organization?.name).toBe("Acme");

    // Invite → link is "emailed" (logged)
    const invite = await owner.browser.post("/organization/invite-member", {
      email: invitee.email,
      role: "member",
      organizationId: orgId,
    });
    expect(invite.status).toBe(200);
    const mail = app.mail.lastTo(invitee.email);
    expect(mail.url).toBe(`http://localhost:3001/accept-invitation/${invite.json.id}`);
    expect((await ownerRpc.organization.stats()).pendingInvitations).toBe(1);

    // Someone else cannot accept an invitation addressed to another email.
    const wrong = await third.browser.post("/organization/accept-invitation", {
      invitationId: invite.json.id,
    });
    expect(wrong.status).toBeGreaterThanOrEqual(400);

    // Accept
    const accept = await invitee.browser.post("/organization/accept-invitation", {
      invitationId: invite.json.id,
    });
    expect(accept.status).toBe(200);
    await invitee.browser.post("/organization/set-active", { organizationId: orgId });

    // Org role guard: member cannot see manager-only stats
    const memberRpc = await invitee.browser.rpc();
    expect((await memberRpc.organization.current()).role).toBe("member");
    await expectORPCError(memberRpc.organization.stats(), "FORBIDDEN");

    // Non-member cannot activate / use the org
    const setActive = await third.browser.post("/organization/set-active", {
      organizationId: orgId,
    });
    expect(setActive.status).toBeGreaterThanOrEqual(400);

    // Member cannot change roles (Better Auth enforces)
    const members = await owner.browser.request(
      `/organization/list-members?organizationId=${orgId}`,
    );
    expect(members.status).toBe(200);
    const inviteeMember = members.json.members.find((m: any) => m.userId === invitee.user.id);
    const ownerMember = members.json.members.find((m: any) => m.userId === owner.user.id);
    const denied = await invitee.browser.post("/organization/update-member-role", {
      memberId: ownerMember.id,
      role: "member",
      organizationId: orgId,
    });
    expect(denied.status).toBe(403);

    // Owner promotes member to admin → guard passes
    const promote = await owner.browser.post("/organization/update-member-role", {
      memberId: inviteeMember.id,
      role: "admin",
      organizationId: orgId,
    });
    expect(promote.status).toBe(200);
    expect((await (await invitee.browser.rpc()).organization.stats()).members).toBe(2);

    // Invite + accept third, then remove them
    const invite3 = await owner.browser.post("/organization/invite-member", {
      email: third.email,
      role: "member",
      organizationId: orgId,
    });
    await third.browser.post("/organization/accept-invitation", { invitationId: invite3.json.id });
    const removed = await owner.browser.post("/organization/remove-member", {
      memberIdOrEmail: third.email,
      organizationId: orgId,
    });
    expect(removed.status).toBe(200);
    expect((await ownerRpc.organization.stats()).members).toBe(2);

    // Invitee leaves → no longer a member, guard rejects
    const leave = await invitee.browser.post("/organization/leave", { organizationId: orgId });
    expect(leave.status).toBe(200);
    expect((await ownerRpc.organization.stats()).members).toBe(1);
    try {
      await (await invitee.browser.rpc()).organization.current();
      throw new Error("expected failure after leaving");
    } catch (error) {
      expect(["FORBIDDEN", "BAD_REQUEST"]).toContain((error as { code?: string }).code ?? "");
    }
  });
});
