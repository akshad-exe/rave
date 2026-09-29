import { afterAll, describe, expect, it } from "vitest";
import {
  closeTestApp,
  createEvent,
  getTestApp,
  registerUser,
  rpc,
  rpcOk,
  setRole,
} from "../../tests/helpers";

describe("Teams", () => {
  const app = getTestApp();

  async function setupEvent() {
    const org = await registerUser(app);
    await setRole(org.id, "organizer");
    const ev = await createEvent(app, org.cookie, { maxTeamSize: 3 });
    // Advance to registration phase
    await rpcOk(
      app,
      "events.transition",
      {
        eventId: ev.id,
        status: "registration",
      },
      org.cookie
    );
    return { ev, org };
  }

  it("participant creates a team", async () => {
    const { ev } = await setupEvent();
    const p = await registerUser(app);

    const result = await rpcOk(
      app,
      "teams.create",
      {
        eventId: ev.id,
        name: "My Team",
      },
      p.cookie
    );

    const t = result as { id: string; name: string; ownerId: string };
    expect(t.name).toBe("My Team");
    expect(t.ownerId).toBe(p.id);
  });

  it("prevents joining two teams in same event", async () => {
    const { ev } = await setupEvent();
    const p1 = await registerUser(app);
    const p2 = await registerUser(app);

    // p1 creates team1
    const team1 = (await rpcOk(
      app,
      "teams.create",
      {
        eventId: ev.id,
        name: "Team 1",
      },
      p1.cookie
    )) as { id: string };

    // p1 invites p2
    const inv = (await rpcOk(
      app,
      "teams.createInvitation",
      {
        teamId: team1.id,
      },
      p1.cookie
    )) as { token: string };

    // p2 accepts
    await rpcOk(app, "teams.acceptInvitation", { token: inv.token }, p2.cookie);

    // p1 tries to create another team (already owns team1 in this event)
    const first = await rpc(
      app,
      "teams.create",
      {
        eventId: ev.id,
        name: "Team 2",
      },
      p1.cookie
    );
    expect(first.status).toBe(409);

    // p2 tries to create their own team (already in team1)
    const { status } = await rpc(
      app,
      "teams.create",
      {
        eventId: ev.id,
        name: "Team Duplicate",
      },
      p2.cookie
    );
    expect(status).toBe(409);
  });

  it("invitation token works for acceptance", async () => {
    const { ev } = await setupEvent();
    const owner = await registerUser(app);
    const joiner = await registerUser(app);

    const team = (await rpcOk(
      app,
      "teams.create",
      {
        eventId: ev.id,
        name: "Invite Team",
      },
      owner.cookie
    )) as { id: string };

    const inv = (await rpcOk(
      app,
      "teams.createInvitation",
      {
        teamId: team.id,
      },
      owner.cookie
    )) as { token: string };

    const result = (await rpcOk(
      app,
      "teams.acceptInvitation",
      {
        token: inv.token,
      },
      joiner.cookie
    )) as { teamId: string };

    expect(result.teamId).toBe(team.id);

    // Verify membership
    const teamData = (await rpcOk(app, "teams.get", { teamId: team.id })) as {
      members: Array<{ userId: string }>;
    };
    expect(teamData.members.some((m) => m.userId === joiner.id)).toBe(true);
  });

  it("used invitation cannot be reused", async () => {
    const { ev } = await setupEvent();
    const owner = await registerUser(app);
    const p1 = await registerUser(app);
    const p2 = await registerUser(app);

    const t = (await rpcOk(
      app,
      "teams.create",
      {
        eventId: ev.id,
        name: "T",
      },
      owner.cookie
    )) as { id: string };

    const inv = (await rpcOk(
      app,
      "teams.createInvitation",
      {
        teamId: t.id,
      },
      owner.cookie
    )) as { token: string };

    await rpcOk(app, "teams.acceptInvitation", { token: inv.token }, p1.cookie);

    // p2 tries same token
    const { status } = await rpc(
      app,
      "teams.acceptInvitation",
      {
        token: inv.token,
      },
      p2.cookie
    );
    expect(status).not.toBe(200);
  });

  it("team member cannot remove another member (only owner can)", async () => {
    const { ev } = await setupEvent();
    const owner = await registerUser(app);
    const member = await registerUser(app);
    const intruder = await registerUser(app);

    const t = (await rpcOk(
      app,
      "teams.create",
      {
        eventId: ev.id,
        name: "T",
      },
      owner.cookie
    )) as { id: string };

    const inv = (await rpcOk(
      app,
      "teams.createInvitation",
      {
        teamId: t.id,
      },
      owner.cookie
    )) as { token: string };
    await rpcOk(
      app,
      "teams.acceptInvitation",
      { token: inv.token },
      member.cookie
    );

    // intruder is not even on the team
    const { status } = await rpc(
      app,
      "teams.removeMember",
      {
        teamId: t.id,
        userId: member.id,
      },
      intruder.cookie
    );
    expect(status).toBe(403);
  });

  it("team cannot exceed maxTeamSize", async () => {
    const { ev } = await setupEvent(); // maxTeamSize = 3

    const owner = await registerUser(app);
    const p1 = await registerUser(app);
    const p2 = await registerUser(app);

    const t = (await rpcOk(
      app,
      "teams.create",
      {
        eventId: ev.id,
        name: "Full Team",
      },
      owner.cookie
    )) as { id: string };

    // Add p1
    const inv1 = (await rpcOk(
      app,
      "teams.createInvitation",
      { teamId: t.id },
      owner.cookie
    )) as { token: string };
    await rpcOk(
      app,
      "teams.acceptInvitation",
      { token: inv1.token },
      p1.cookie
    );

    // Add p2 (team now at 3 = max)
    const inv2 = (await rpcOk(
      app,
      "teams.createInvitation",
      { teamId: t.id },
      owner.cookie
    )) as { token: string };
    await rpcOk(
      app,
      "teams.acceptInvitation",
      { token: inv2.token },
      p2.cookie
    );

    // Trying to invite p3 should fail (team full)
    const { status } = await rpc(
      app,
      "teams.createInvitation",
      {
        teamId: t.id,
      },
      owner.cookie
    );
    expect(status).toBe(400);
  });

  it("owner can leave after transferring... (owner cannot directly leave)", async () => {
    const { ev } = await setupEvent();
    const owner = await registerUser(app);

    (await rpcOk(
      app,
      "teams.create",
      { eventId: ev.id, name: "T" },
      owner.cookie
    )) as { id: string };

    const myTeam = (await rpcOk(
      app,
      "teams.myTeam",
      { eventId: ev.id },
      owner.cookie
    )) as { id: string };

    const { status } = await rpc(
      app,
      "teams.leave",
      { teamId: myTeam.id },
      owner.cookie
    );
    expect(status).toBe(400); // owners cannot leave
  });
});

describe("Team invitations", () => {
  const app = getTestApp();
  async function setupTeam() {
    const owner = await registerUser(app);
    await setRole(owner.id, "organizer");
    const ev = await createEvent(app, owner.cookie, { maxTeamSize: 3 });
    // Teams can only be created once the event opens registration.
    await rpcOk(
      app,
      "events.transition",
      { eventId: ev.id, status: "registration" },
      owner.cookie
    );
    const team = (await rpcOk(
      app,
      "teams.create",
      { eventId: ev.id, name: "Invitee Test Team" },
      owner.cookie
    )) as { id: string };
    return { ev, owner, team };
  }

  it("lists the invitations a team has issued", async () => {
    const { owner, team } = await setupTeam();

    await rpcOk(
      app,
      "teams.createInvitation",
      { invitedEmail: "invitee@example.org", teamId: team.id },
      owner.cookie
    );

    const invitations = (await rpcOk(
      app,
      "teams.listInvitations",
      { teamId: team.id },
      owner.cookie
    )) as Array<{ id: string; status: string }>;

    expect(invitations).toHaveLength(1);
    expect(invitations[0]?.status).toBe("pending");
  });

  it("lets the owner revoke an invitation it listed", async () => {
    const { owner, team } = await setupTeam();
    await rpcOk(
      app,
      "teams.createInvitation",
      { invitedEmail: "leaked@example.org", teamId: team.id },
      owner.cookie
    );

    const [invitation] = (await rpcOk(
      app,
      "teams.listInvitations",
      { teamId: team.id },
      owner.cookie
    )) as Array<{ id: string }>;

    await rpcOk(
      app,
      "teams.revokeInvitation",
      { invitationId: invitation?.id ?? "" },
      owner.cookie
    );

    const after = (await rpcOk(
      app,
      "teams.listInvitations",
      { teamId: team.id },
      owner.cookie
    )) as Array<{ id: string; status: string }>;
    const revoked = after.find((i) => i.id === invitation?.id);
    expect(revoked?.status).toBe("revoked");
  });

  it("rejects a non-owner listing invitations", async () => {
    const { team } = await setupTeam();
    const outsider = await registerUser(app);

    const { status } = await rpc(
      app,
      "teams.listInvitations",
      { teamId: team.id },
      outsider.cookie
    );
    expect(status).toBe(403);
  });
});

// One teardown for the file: getTestApp caches a singleton, so a per-describe
// close would hand the second describe an app that is already shut down.
afterAll(closeTestApp);
