import { HttpError } from "../errors.js";

/**
 * The signed-in person is taken from the verified Supabase access token.
 * A user id typed into a form, header, or chat message is never accepted.
 */
export function createAuthenticate({ getUser, loadAccess }) {
  return async function authenticate(req, _res, next) {
    try {
      const header = req.get("authorization") || "";
      const match = header.match(/^Bearer\s+(.+)$/i);
      const token = match?.[1]?.trim();
      if (!token) {
        throw new HttpError(401, "Authentication required.");
      }

      const user = await getUser(token);
      if (!user?.id) {
        throw new HttpError(401, "Invalid or expired session.");
      }

      const access = await loadAccess(user.id);
      if (!access?.profile) {
        throw new HttpError(
          403,
          "Your profile is not ready. Apply the database migrations, then sign in again.",
        );
      }
      if (access.profile.isActive === false) {
        throw new HttpError(403, "This account is disabled.");
      }

      req.auth = {
        userId: user.id,
        email: user.email,
        roles: access.roles ?? [],
        profile: access.profile,
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}
