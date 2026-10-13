import assert from "node:assert/strict";
import test from "node:test";
import { HttpError } from "../src/errors.js";
import { createProfileService } from "../src/services/profileService.js";
import { createRoleService } from "../src/services/roleService.js";
import { assertRoleChangeAllowed } from "../src/services/roleRules.js";

const actorId = "33333333-3333-4333-8333-333333333333";

test("the user role cannot be removed", () => {
  assert.throws(
    () => assertRoleChangeAllowed({
      actorId,
      targetId: "44444444-4444-4444-8444-444444444444",
      role: "user",
      action: "revoke",
    }),
    (error) => error instanceof HttpError && error.status === 400,
  );
});

test("an administrator cannot remove their own administrator access", async () => {
  const service = createRoleService({
    rpc() {
      throw new Error("database should not be called");
    },
  });
  await assert.rejects(
    () => service.revokeRole({ actorId, targetId: actorId, role: "administrator" }),
    (error) => error instanceof HttpError && /own administrator/.test(error.message),
  );
});

test("granting a support role calls the database as the signed-in administrator", async () => {
  const calls = [];
  const service = createRoleService({
    rpc(name, args) {
      calls.push({ name, args });
      return { error: null };
    },
  });
  const targetId = "44444444-4444-4444-8444-444444444444";
  await service.grantRole({ actorId, targetId, role: "support_executive" });
  assert.equal(calls[0].name, "grant_app_role");
  assert.equal(calls[0].args.actor, actorId);
  assert.equal(calls[0].args.target_user, targetId);
  assert.equal(calls[0].args.requested, "support_executive");
});

test("profile updates only write the allowed columns", async () => {
  let patch;
  let savedId;
  const service = createProfileService({
    from() {
      return {
        update(values) {
          patch = values;
          return {
            eq(column, value) {
              assert.equal(column, "id");
              savedId = value;
              return {
                select() {
                  return {
                    async single() {
                      return {
                        data: {
                          id: value,
                          email: "nina.patel@demo.college",
                          full_name: values.full_name,
                          employee_id: values.employee_id,
                          department: values.department,
                          job_title: values.job_title,
                          phone: values.phone,
                          is_active: true,
                        },
                        error: null,
                      };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  });

  const user = await service.updateProfile("11111111-1111-4111-8111-111111111111", {
    fullName: "Nina Patel",
    employeeId: "",
    department: "Finance",
    jobTitle: "Accounts Analyst",
    phone: "",
  });

  assert.equal(savedId, "11111111-1111-4111-8111-111111111111");
  assert.deepEqual(patch, {
    full_name: "Nina Patel",
    employee_id: null,
    department: "Finance",
    job_title: "Accounts Analyst",
    phone: null,
  });
  assert.equal(user.fullName, "Nina Patel");
  assert.equal(Object.hasOwn(patch, "is_active"), false);
  assert.equal(Object.hasOwn(patch, "email"), false);
});
