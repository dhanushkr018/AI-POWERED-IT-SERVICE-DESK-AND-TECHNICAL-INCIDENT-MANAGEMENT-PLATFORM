import { z } from "zod";
import { IMPACT_SCOPES, TICKET_STATUSES } from "../domain/ticketRules.js";
import { INCIDENT_CATEGORIES } from "../domain/taxonomy.js";

const optionalText = (max) => z.string().trim().max(max).optional();

export const createTicketSchema = z
  .object({
    title: z.string().trim().min(5, "Use a title of at least 5 characters.").max(140),
    description: z.string().trim().min(10, "Describe the technical problem.").max(4000),
    category: z.enum(INCIDENT_CATEGORIES),
    subcategory: optionalText(80),
    deviceLabel: optionalText(80),
    serviceName: optionalText(80),
    errorDetails: optionalText(500),
    businessImpact: optionalText(500),
    affectedUsers: z.number().int().min(1).max(100000).optional(),
    impactScope: z.enum(IMPACT_SCOPES),
    troubleshooting: optionalText(2000),
    idempotencyKey: z.string().trim().min(8).max(80),
  })
  .strict();

export const statusChangeSchema = z
  .object({
    status: z.enum(TICKET_STATUSES),
    reason: z.string().trim().min(3, "Add a short reason for the change.").max(500),
    resolutionDetails: z.string().trim().max(4000).optional(),
  })
  .strict();

export const ticketIdSchema = z.string().uuid("That ticket id is not valid.");

export const ticketListQuerySchema = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(["P1", "P2", "P3", "P4"]).optional(),
  category: z.enum(INCIDENT_CATEGORIES).optional(),
});
