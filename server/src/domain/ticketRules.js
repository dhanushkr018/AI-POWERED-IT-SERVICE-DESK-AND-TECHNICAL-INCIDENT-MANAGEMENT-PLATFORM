import { HttpError } from "../errors.js";
import { INCIDENT_CATEGORIES } from "./taxonomy.js";

export const IMPACT_SCOPES = ["individual", "department", "organization"];

export const TICKET_STATUSES = [
  "NEW",
  "TRIAGED",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_FOR_USER",
  "WAITING_FOR_SPECIALIST",
  "ESCALATED",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
];

const NEXT_STATUS = {
  NEW: ["TRIAGED", "ASSIGNED", "IN_PROGRESS", "ESCALATED"],
  TRIAGED: ["ASSIGNED", "IN_PROGRESS", "WAITING_FOR_USER", "ESCALATED"],
  ASSIGNED: ["IN_PROGRESS", "WAITING_FOR_USER", "WAITING_FOR_SPECIALIST", "ESCALATED"],
  IN_PROGRESS: ["WAITING_FOR_USER", "WAITING_FOR_SPECIALIST", "ESCALATED", "RESOLVED"],
  WAITING_FOR_USER: ["IN_PROGRESS", "ESCALATED", "RESOLVED"],
  WAITING_FOR_SPECIALIST: ["IN_PROGRESS", "ESCALATED", "ASSIGNED"],
  ESCALATED: ["ASSIGNED", "IN_PROGRESS", "WAITING_FOR_SPECIALIST"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["TRIAGED", "ASSIGNED", "IN_PROGRESS"],
};

const CATEGORY_QUEUE = {
  endpoint: "ENDPOINT",
  operating_system: "ENDPOINT",
  peripheral: "ENDPOINT",
  application: "L1_SERVICE_DESK",
  enterprise_application: "L1_SERVICE_DESK",
  configuration: "L1_SERVICE_DESK",
  network: "NETWORK",
  login_access: "L1_SERVICE_DESK",
  security: "SECURITY",
};

export function determinePriority({ category, impactScope, affectedUsers }) {
  if (!INCIDENT_CATEGORIES.includes(category)) {
    throw new HttpError(400, "Choose a technical category.");
  }
  const affected = Number.isInteger(affectedUsers) && affectedUsers > 0 ? affectedUsers : 1;
  if (category === "security" || impactScope === "organization") return "P1";
  if (category === "login_access" || impactScope === "department" || affected >= 5) return "P2";
  if (category === "peripheral" && impactScope === "individual" && affected <= 1) return "P4";
  return "P3";
}

export function queueForTicket({ category, impactScope }) {
  if (category === "security") return "SECURITY";
  if (impactScope === "organization") return "PRIORITY_QUEUE";
  return CATEGORY_QUEUE[category] || "L1_SERVICE_DESK";
}

export function canViewTicket({ userId, roles = [], ticket, teamIds = [] }) {
  if (!ticket) return false;
  if (roles.includes("administrator")) return true;
  if (ticket.creator_id === userId || ticket.assigned_executive_id === userId) return true;
  return roles.includes("support_executive")
    && Boolean(ticket.assigned_team_id)
    && teamIds.includes(ticket.assigned_team_id);
}

export function isTeamStaff({ userId, roles = [], ticket, teamIds = [] }) {
  if (roles.includes("administrator")) return true;
  if (ticket?.assigned_executive_id === userId) return true;
  return roles.includes("support_executive")
    && Boolean(ticket?.assigned_team_id)
    && teamIds.includes(ticket.assigned_team_id);
}

export function allowedNextStatuses({ userId, roles = [], ticket, teamIds = [] }) {
  const options = NEXT_STATUS[ticket?.status] ?? [];
  if (isTeamStaff({ userId, roles, ticket, teamIds })) return options;
  if (ticket?.creator_id !== userId) return [];
  return options.filter((status) => (
    (ticket.status === "RESOLVED" && (status === "CLOSED" || status === "REOPENED"))
    || (ticket.status === "CLOSED" && status === "REOPENED")
  ));
}

export function assertStatusChange({ userId, roles, ticket, teamIds, nextStatus }) {
  if (!TICKET_STATUSES.includes(nextStatus)) {
    throw new HttpError(400, "That status is not used by this service desk.");
  }
  const allowed = allowedNextStatuses({ userId, roles, ticket, teamIds });
  if (allowed.includes(nextStatus)) return;
  if (allowed.length === 0) {
    throw new HttpError(403, "You cannot change the status of this ticket.");
  }
  throw new HttpError(400, "That status change is not available from the current status.");
}
