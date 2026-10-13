function person(row) {
  if (!row) return null;
  return { id: row.id, fullName: row.full_name, email: row.email };
}

export function mapTicket(row) {
  return {
    id: row.id,
    ticketNumber: row.ticket_number,
    title: row.title,
    description: row.description,
    originalReport: row.original_report,
    category: row.category,
    subcategory: row.subcategory,
    priority: row.priority,
    status: row.status,
    deviceLabel: row.device_label,
    serviceName: row.service_name,
    errorDetails: row.error_details,
    businessImpact: row.business_impact,
    affectedUsers: row.affected_users_count,
    troubleshooting: Array.isArray(row.troubleshooting_history) ? row.troubleshooting_history : [],
    team: row.team ? { id: row.team.id, name: row.team.name, code: row.team.code } : null,
    executive: person(row.executive),
    creator: person(row.creator),
    resolutionDetails: row.resolution_details,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
    closedAt: row.closed_at,
    firstResponseAt: row.first_response_at,
    slaFirstResponseDueAt: row.sla_first_response_due_at,
    slaResolutionDueAt: row.sla_resolution_due_at,
    creatorId: row.creator_id,
    assignedTeamId: row.assigned_team_id,
    assignedExecutiveId: row.assigned_executive_id,
  };
}

export function mapHistoryEntry(row) {
  return {
    id: row.id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    reason: row.reason,
    createdAt: row.created_at,
    changedBy: row.actor?.full_name || "Service desk",
  };
}

export const TICKET_COLUMNS = `
  id, ticket_number, title, description, original_report, category, subcategory,
  priority, status, device_label, service_name, error_details, business_impact,
  affected_users_count, troubleshooting_history, resolution_details,
  created_at, updated_at, resolved_at, closed_at, first_response_at,
  sla_first_response_due_at, sla_resolution_due_at,
  creator_id, assigned_team_id, assigned_executive_id,
  creator:profiles!tickets_creator_id_fkey(id, full_name, email),
  executive:profiles!tickets_assigned_executive_id_fkey(id, full_name, email),
  team:support_teams!tickets_assigned_team_id_fkey(id, name, code)
`;
