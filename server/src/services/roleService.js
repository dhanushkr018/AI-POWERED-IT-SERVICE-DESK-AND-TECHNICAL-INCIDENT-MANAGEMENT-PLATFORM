import { HttpError } from "../errors.js";
import { mapProfile, mapRoles } from "./accountMapper.js";
import { assertCanChangeActiveState, assertRoleChangeAllowed } from "./roleRules.js";

function mapRoleError(error) {
  const message = error?.message || "";
  if (message.includes("base_role_required")) {
    throw new HttpError(400, "The user role is required for every account.");
  }
  if (message.includes("cannot_revoke_own_admin")) {
    throw new HttpError(400, "You cannot remove your own administrator access.");
  }
  if (message.includes("cannot_deactivate_self")) {
    throw new HttpError(400, "You cannot deactivate your own account.");
  }
  if (message.includes("admin_required")) {
    throw new HttpError(403, "Only an administrator can change access.");
  }
  if (message.includes("user_not_found")) {
    throw new HttpError(404, "That account was not found.");
  }
  if (/grant_app_role|revoke_app_role|set_profile_active|schema cache|could not find the function/i.test(message)) {
    throw new HttpError(
      503,
      "The database is missing the role functions. Run the Supabase migrations, then try again.",
    );
  }
  console.error(message);
  throw new HttpError(500, "The account change could not be saved.");
}

export function createRoleService(client) {
  return {
    async listUsers() {
      if (!client) {
        throw new HttpError(503, "Supabase is not configured on the server.");
      }
      const { data, error } = await client
        .from("profiles")
        .select(
        "id, email, full_name, employee_id, department, job_title, phone, is_active, user_roles!user_roles_user_id_fkey(role)",
      )
        .order("full_name", { ascending: true });
      if (error) {
        console.error(error.message);
        throw new HttpError(500, "The account list could not be loaded.");
      }
      return (data ?? []).map((row) => ({
        ...mapProfile(row),
        roles: mapRoles(row.user_roles),
      }));
    },

    async grantRole({ actorId, targetId, role }) {
      assertRoleChangeAllowed({ actorId, targetId, role, action: "grant" });
      if (!client) {
        throw new HttpError(503, "Supabase is not configured on the server.");
      }
      const { error } = await client.rpc("grant_app_role", {
        target_user: targetId,
        requested: role,
        actor: actorId,
      });
      if (error) mapRoleError(error);
    },

    async revokeRole({ actorId, targetId, role }) {
      assertRoleChangeAllowed({ actorId, targetId, role, action: "revoke" });
      if (!client) {
        throw new HttpError(503, "Supabase is not configured on the server.");
      }
      const { error } = await client.rpc("revoke_app_role", {
        target_user: targetId,
        requested: role,
        actor: actorId,
      });
      if (error) mapRoleError(error);
    },

    async setActive({ actorId, targetId, isActive }) {
      assertCanChangeActiveState({ actorId, targetId, isActive });
      if (!client) {
        throw new HttpError(503, "Supabase is not configured on the server.");
      }
      const { error } = await client.rpc("set_profile_active", {
        target_user: targetId,
        active: isActive,
        actor: actorId,
      });
      if (error) mapRoleError(error);
    },
  };
}
