import { z } from "zod";
import { APP_ROLES, PRIVILEGED_ROLES } from "../domain/taxonomy.js";

const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max, `Use ${max} characters or fewer.`)
    .optional();

export const profileUpdateSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your name.").max(120),
    employeeId: optionalText(40),
    department: optionalText(80),
    jobTitle: optionalText(80),
    phone: optionalText(30),
  })
  .strict();

export const grantRoleSchema = z
  .object({
    role: z.enum(APP_ROLES),
  })
  .strict();

export const revokeRoleSchema = z.object({
  role: z.enum(PRIVILEGED_ROLES),
});

export const activeStateSchema = z
  .object({
    isActive: z.boolean(),
  })
  .strict();

export const userIdSchema = z.string().uuid("That account id is not valid.");
