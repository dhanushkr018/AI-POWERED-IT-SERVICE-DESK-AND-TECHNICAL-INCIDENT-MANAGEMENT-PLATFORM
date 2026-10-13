import { HttpError } from "../errors.js";

export function requireRole(...allowedRoles) {
  return function checkRole(req, _res, next) {
    const roles = req.auth?.roles ?? [];
    const permitted = allowedRoles.some((role) => roles.includes(role));
    if (!permitted) {
      next(new HttpError(403, "You do not have permission to perform this action."));
      return;
    }
    next();
  };
}
