import { HttpError } from "../errors.js";
import { APP_ROLES } from "../domain/taxonomy.js";

export function assertRoleChangeAllowed({ actorId, targetId, role, action }) {
  if (!APP_ROLES.includes(role)) {
    throw new HttpError(400, "That role is not part of this service desk.");
  }

  if (action === "revoke" && role === "user") {
    throw new HttpError(400, "The user role is required for every account.");
  }

  if (action === "revoke" && role === "administrator" && actorId === targetId) {
    throw new HttpError(400, "You cannot remove your own administrator access.");
  }
}

export function assertCanChangeActiveState({ actorId, targetId, isActive }) {
  if (actorId === targetId && isActive === false) {
    throw new HttpError(400, "You cannot deactivate your own account.");
  }
}
