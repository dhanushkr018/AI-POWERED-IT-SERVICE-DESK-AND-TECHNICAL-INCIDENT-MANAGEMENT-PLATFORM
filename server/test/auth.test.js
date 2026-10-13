import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createAuthenticate } from "../src/middleware/authenticate.js";

const userId = "11111111-1111-4111-8111-111111111111";

function appWith(authenticate, extras = {}) {
  return createApp({
    enableRateLimit: false,
    enableRequestLog: false,
    authenticate,
    supabaseStatus: async () => "not_configured",
    profileService: extras.profileService ?? {
      async updateProfile(id, input) {
        return { id, fullName: input.fullName, email: "nina.patel@demo.college" };
      },
    },
    roleService: extras.roleService ?? {
      async listUsers() {
        return [];
      },
      async grantRole() {},
      async revokeRole() {},
      async setActive() {},
    },
  });
}

test("health does not claim an assistant is running", async () => {
  const response = await request(appWith((req, _res, next) => next())).get("/api/health");
  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.phase, 1);
  assert.equal(response.body.assistant.activeMode, "not_enabled");
  assert.equal(response.body.supabase, "not_configured");
  assert.doesNotMatch(JSON.stringify(response.body), /AI-powered/i);
});

test("a request without a bearer token is rejected", async () => {
  let lookedUp = false;
  const authenticate = createAuthenticate({
    async getUser() {
      lookedUp = true;
      return null;
    },
    async loadAccess() {
      throw new Error("profile lookup should not run");
    },
  });
  const response = await request(appWith(authenticate)).get("/api/me");
  assert.equal(response.status, 401);
  assert.equal(lookedUp, false);
});

test("an invalid token is rejected", async () => {
  const authenticate = createAuthenticate({
    async getUser() {
      return null;
    },
    async loadAccess() {
      throw new Error("profile lookup should not run");
    },
  });
  const response = await request(appWith(authenticate))
    .get("/api/me")
    .set("Authorization", "Bearer not-a-session");
  assert.equal(response.status, 401);
  assert.match(response.body.error, /Invalid or expired session/);
});

test("profile updates use the verified account, not an id in the body", async () => {
  const seen = [];
  const authenticate = createAuthenticate({
    async getUser() {
      return { id: userId, email: "nina.patel@demo.college" };
    },
    async loadAccess() {
      return {
        profile: {
          id: userId,
          email: "nina.patel@demo.college",
          fullName: "Nina Patel",
          isActive: true,
        },
        roles: ["user"],
      };
    },
  });
  const response = await request(
    appWith(authenticate, {
      profileService: {
        async updateProfile(id, input) {
          seen.push({ id, input });
          return { id, fullName: input.fullName, email: "nina.patel@demo.college", isActive: true };
        },
      },
    }),
  )
    .patch("/api/me")
    .set("Authorization", "Bearer session-token")
    .send({
      fullName: "Nina S. Patel",
      department: "Finance",
      id: "22222222-2222-4222-8222-222222222222",
    });

  assert.equal(response.status, 400);
  assert.equal(seen.length, 0);
});

test("a valid profile update is saved for the token's account", async () => {
  const seen = [];
  const authenticate = createAuthenticate({
    async getUser() {
      return { id: userId, email: "nina.patel@demo.college" };
    },
    async loadAccess() {
      return {
        profile: { id: userId, fullName: "Nina Patel", email: "nina.patel@demo.college", isActive: true },
        roles: ["user"],
      };
    },
  });
  const response = await request(
    appWith(authenticate, {
      profileService: {
        async updateProfile(id, input) {
          seen.push({ id, input });
          return { id, fullName: input.fullName, email: "nina.patel@demo.college", isActive: true };
        },
      },
    }),
  )
    .patch("/api/me")
    .set("Authorization", "Bearer session-token")
    .send({ fullName: "Nina S. Patel", department: "Finance" });

  assert.equal(response.status, 200);
  assert.deepEqual(seen[0].id, userId);
  assert.equal(seen[0].input.fullName, "Nina S. Patel");
  assert.equal(response.body.user.fullName, "Nina S. Patel");
});

test("a normal user cannot open account administration", async () => {
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
  const response = await request(appWith(authenticate))
    .get("/api/admin/users")
    .set("Authorization", "Bearer session-token");
  assert.equal(response.status, 403);
});

test("role changes record the verified administrator as the actor", async () => {
  const adminId = "33333333-3333-4333-8333-333333333333";
  const targetId = "44444444-4444-4444-8444-444444444444";
  let received;
  const authenticate = createAuthenticate({
    async getUser() {
      return { id: adminId, email: "divya.krishnan@demo.college" };
    },
    async loadAccess() {
      return {
        profile: { id: adminId, fullName: "Divya Krishnan", isActive: true },
        roles: ["user", "administrator"],
      };
    },
  });
  const app = appWith(authenticate, {
    roleService: {
      async listUsers() {
        return [];
      },
      async grantRole(input) {
        received = input;
      },
      async revokeRole() {},
      async setActive() {},
    },
  });

  const rejected = await request(app)
    .post(`/api/admin/users/${targetId}/roles`)
    .set("Authorization", "Bearer session-token")
    .send({ role: "support_executive", actorId: userId });
  assert.equal(rejected.status, 400);
  assert.equal(received, undefined);

  const response = await request(app)
    .post(`/api/admin/users/${targetId}/roles`)
    .set("Authorization", "Bearer session-token")
    .send({ role: "support_executive" });

  assert.equal(response.status, 204);
  assert.equal(received.actorId, adminId);
  assert.equal(received.targetId, targetId);
  assert.equal(received.role, "support_executive");
});
