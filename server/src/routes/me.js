import express from "express";
import { profileUpdateSchema } from "../validators/account.js";

export function createMeRouter({ authenticate, profileService }) {
  const router = express.Router();

  router.get("/", authenticate, (req, res) => {
    res.json({
      user: req.auth.profile,
      roles: req.auth.roles,
    });
  });

  router.patch("/", authenticate, async (req, res, next) => {
    try {
      const input = profileUpdateSchema.parse(req.body);
      const user = await profileService.updateProfile(req.auth.userId, input);
      res.json({ user, roles: req.auth.roles });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
