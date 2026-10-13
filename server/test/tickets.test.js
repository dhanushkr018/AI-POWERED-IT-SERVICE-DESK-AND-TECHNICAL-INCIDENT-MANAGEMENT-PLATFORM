import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import {
  allowedNextStatuses,
  canViewTicket,
  determinePriority,
  queueForTicket,
} from "../src/domain/ticketRules.js";
import { createAuthenticate } from "../src/middleware/authenticate.js";

const userId = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";

test("security incidents and widespread impact are critical", () => {
  assert.equal(determinePriority({ category: "security", impactScope: "individual", affectedUsers: 1 }), "P1");
  assert.equal(determinePriority({ category: "network", impactScope: "organization", affectedUsers: 1 }), "P1");
  assert.equal(determinePriority({ category: "login_access", impactScope: "individual", affectedUsers: 1 }), "P2");
  assert.equal(determinePriority({ category: "peripheral", impactScope: "individual", affectedUsers: 1 }), "P4");
  assert.equal(determinePriority({ category: "application", impactScope: "individual", affectedUsers: 1 }), "P3");
});

test("a category selects a queue and does not select a person", () => {
  assert.equal(queueForTicket({ category: "network", impactScope: "individual" }), "NETWORK");
  assert.equal(queueForTicket({ category: "security", impactScope: "organization" }), "SECURITY");
  assert.equal(queueForTicket({ category: "endpoint", impactScope: "organization" }), "PRIORITY_QUEUE");
});

test("a reporter can see only their own ticket unless they are staff for that queue", () => {
  const ticket = { creator_id: userId, assigned_executive_id: null, assigned_team_id: "team-1" };
  assert.equal(canViewTicket({ userId, roles: ["user"], ticket, teamIds: [] }), true);
  assert.equal(canViewTicket({ userId: otherId, roles: ["user"], ticket, teamIds: [] }), false);
  assert.equal(canViewTicket({
    userId: otherId,
    roles: ["user", "support_executive"],
    ticket,
    teamIds: ["team-1"],
  }), true);
});

test("a reporter can close or reopen a resolved ticket, not move it into progress", () => {
  const ticket = { creator_id: userId, status: "RESOLVED", assigned_executive_id: null, assigned_team_id: "team-1" };
  assert.deepEqual(allowedNextStatuses({ userId, roles: ["user"], ticket, teamIds: [] }), ["CLOSED", "REOPENED"]);
  assert.deepEqual(
    allowedNextStatuses({ userId: otherId, roles: ["user", "support_executive"], ticket, teamIds: ["team-1"] }),
    ["CLOSED", "REOPENED"],
  );
});

test("ticket creation uses the signed-in person and rejects a supplied priority", async () => {
  let received;
  const authenticate = createAuthenticate({
    async getUser() {
      return { id: userId, email: "nina.patel@demo.college" };
    },
    async loadAccess() {
      return {
        profile: { id: userId, fullName: "Nina Patel", isActive: true },
        roles: ["user"],
      };
    },
  });
  const app = createApp({
    enableRateLimit: false,
    enableRequestLog: false,
    authenticate,
    ticketService: {
      async create(input) {
        received = input;
        return { ticket: { id: "ticket-1", ticketNumber: "IT-2026-00099" }, created: true };
      },
    },
    profileService: { async updateProfile() { return {}; } },
    roleService: { async listUsers() { return []; }, async grantRole() {}, async revokeRole() {}, async setActive() {} },
  });

  const rejected = await request(app)
    .post("/api/tickets")
    .set("Authorization", "Bearer session-token")
    .send({
      title: "VPN drops after connecting",
      description: "The VPN client connects and then disconnects within a minute.",
      category: "network",
      impactScope: "individual",
      affectedUsers: 1,
      idempotencyKey: "idem-key-001",
      priority: "P4",
      creatorId: otherId,
    });
  assert.equal(rejected.status, 400);
  assert.equal(received, undefined);

  const created = await request(app)
    .post("/api/tickets")
    .set("Authorization", "Bearer session-token")
    .send({
      title: "VPN drops after connecting",
      description: "The VPN client connects and then disconnects within a minute.",
      category: "network",
      impactScope: "individual",
      affectedUsers: 1,
      idempotencyKey: "idem-key-001",
    });
  assert.equal(created.status, 201);
  assert.equal(received.userId, userId);
  assert.equal(received.input.category, "network");
  assert.equal(received.input.priority, undefined);
});
