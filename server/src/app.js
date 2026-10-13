import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { config } from "./config.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { createAdminUsersRouter } from "./routes/adminUsers.js";
import { createHealthRouter } from "./routes/health.js";
import { createMeRouter } from "./routes/me.js";
import { createTicketsRouter } from "./routes/tickets.js";

export function createApp(options = {}) {
  const app = express();
  const enableRateLimit = options.enableRateLimit !== false;

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: options.clientOrigin ?? config.clientOrigin,
      allowedHeaders: ["Authorization", "Content-Type", "Idempotency-Key"],
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  if (enableRateLimit) {
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => req.path === "/api/health",
      message: { error: "Too many requests. Please wait a moment and try again." },
    });
    app.use(limiter);
  }

  if (options.enableRequestLog !== false) {
    app.use((req, res, next) => {
      const started = Date.now();
      res.on("finish", () => {
        if (req.path === "/api/health") return;
        console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - started}ms`);
      });
      next();
    });
  }

  app.use("/api/health", createHealthRouter({ supabaseStatus: options.supabaseStatus }));
  app.use(
    "/api/me",
    createMeRouter({
      authenticate: options.authenticate,
      profileService: options.profileService,
    }),
  );
  app.use(
    "/api/tickets",
    createTicketsRouter({
      authenticate: options.authenticate,
      ticketService: options.ticketService,
    }),
  );
  app.use(
    "/api/admin/users",
    createAdminUsersRouter({
      authenticate: options.authenticate,
      roleService: options.roleService,
    }),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
