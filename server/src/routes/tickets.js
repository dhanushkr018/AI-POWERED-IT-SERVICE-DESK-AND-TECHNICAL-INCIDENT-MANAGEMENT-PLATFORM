import express from "express";
import {
  createTicketSchema,
  statusChangeSchema,
  ticketIdSchema,
  ticketListQuerySchema,
} from "../validators/tickets.js";

export function createTicketsRouter({ authenticate, ticketService }) {
  const router = express.Router();
  router.use(authenticate);

  router.get("/", async (req, res, next) => {
    try {
      const filters = ticketListQuerySchema.parse(req.query);
      const tickets = await ticketService.list({
        userId: req.auth.userId,
        roles: req.auth.roles,
        filters,
      });
      res.json({ tickets });
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      const input = createTicketSchema.parse(req.body);
      const result = await ticketService.create({
        userId: req.auth.userId,
        roles: req.auth.roles,
        input,
      });
      res.status(result.created ? 201 : 200).json({ ticket: result.ticket, created: result.created });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:ticketId", async (req, res, next) => {
    try {
      const ticketId = ticketIdSchema.parse(req.params.ticketId);
      const result = await ticketService.get({
        userId: req.auth.userId,
        roles: req.auth.roles,
        ticketId,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post("/:ticketId/status", async (req, res, next) => {
    try {
      const ticketId = ticketIdSchema.parse(req.params.ticketId);
      const input = statusChangeSchema.parse(req.body);
      const result = await ticketService.changeStatus({
        userId: req.auth.userId,
        roles: req.auth.roles,
        ticketId,
        input,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
