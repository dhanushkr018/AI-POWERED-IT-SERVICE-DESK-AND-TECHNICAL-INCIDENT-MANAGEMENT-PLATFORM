import express from "express";
import { requireRole } from "../middleware/requireRole.js";
import {
  activeStateSchema,
  grantRoleSchema,
  revokeRoleSchema,
  userIdSchema,
} from "../validators/account.js";

export function createAdminUsersRouter({ authenticate, roleService }) {
  const router = express.Router();
  router.use(authenticate, requireRole("administrator"));

  router.get("/", async (_req, res, next) => {
    try {
      const users = await roleService.listUsers();
      res.json({ users });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:userId/roles", async (req, res, next) => {
    try {
      const targetId = userIdSchema.parse(req.params.userId);
      const { role } = grantRoleSchema.parse(req.body);
      await roleService.grantRole({
        actorId: req.auth.userId,
        targetId,
        role,
      });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:userId/roles/:role", async (req, res, next) => {
    try {
      const targetId = userIdSchema.parse(req.params.userId);
      const { role } = revokeRoleSchema.parse(req.params);
      await roleService.revokeRole({
        actorId: req.auth.userId,
        targetId,
        role,
      });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:userId", async (req, res, next) => {
    try {
      const targetId = userIdSchema.parse(req.params.userId);
      const { isActive } = activeStateSchema.parse(req.body);
      await roleService.setActive({
        actorId: req.auth.userId,
        targetId,
        isActive,
      });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
