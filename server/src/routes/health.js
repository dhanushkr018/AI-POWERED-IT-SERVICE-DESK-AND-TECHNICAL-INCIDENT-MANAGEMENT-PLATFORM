import express from "express";
import { config } from "../config.js";

export function createHealthRouter({ supabaseStatus }) {
  const router = express.Router();

  router.get("/", async (_req, res, next) => {
    try {
      const supabase = supabaseStatus ? await supabaseStatus() : "not_configured";
      res.json({
        ok: true,
        service: "ai-it-service-desk-api",
        phase: 2,
        supabase,
        assistant: {
          activeMode: "not_enabled",
          label: "No support assistant is running yet",
          requestedProvider: config.aiProvider,
          note: "Ticket rules choose priority and the first support queue. No assistant is running.",
        },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
