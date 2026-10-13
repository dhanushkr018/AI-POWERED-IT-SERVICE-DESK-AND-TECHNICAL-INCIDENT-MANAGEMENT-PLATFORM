import { HttpError } from "../errors.js";
import {
  allowedNextStatuses,
  assertStatusChange,
  canViewTicket,
  determinePriority,
  isTeamStaff,
  queueForTicket,
} from "../domain/ticketRules.js";
import { mapHistoryEntry, mapTicket, TICKET_COLUMNS } from "./ticketMapper.js";

function blankToNull(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000).toISOString();
}

function raiseDatabase(error, fallback) {
  console.error(error?.message || fallback);
  if (/schema cache|could not find|relation|column/i.test(error?.message || "")) {
    throw new HttpError(503, "The ticket tables are not ready. Run the Supabase migrations.");
  }
  throw new HttpError(500, fallback);
}

export function createTicketService(client) {
  return {
    async teamIdsFor(userId) {
      const { data, error } = await client
        .from("support_team_members")
        .select("team_id")
        .eq("user_id", userId);
      if (error) raiseDatabase(error, "Your support queues could not be loaded.");
      return (data ?? []).map((row) => row.team_id);
    },

    async list({ userId, roles, filters = {} }) {
      if (!client) throw new HttpError(503, "Supabase is not configured on the server.");
      let query = client.from("tickets").select(TICKET_COLUMNS).order("created_at", { ascending: false }).limit(100);
      if (!roles.includes("administrator")) {
        if (roles.includes("support_executive")) {
          const teamIds = await this.teamIdsFor(userId);
          const parts = [`creator_id.eq.${userId}`, `assigned_executive_id.eq.${userId}`];
          if (teamIds.length) parts.push(`assigned_team_id.in.(${teamIds.join(",")})`);
          query = query.or(parts.join(","));
        } else {
          query = query.eq("creator_id", userId);
        }
      }
      if (filters.status) query = query.eq("status", filters.status);
      if (filters.priority) query = query.eq("priority", filters.priority);
      if (filters.category) query = query.eq("category", filters.category);
      const { data, error } = await query;
      if (error) raiseDatabase(error, "Tickets could not be loaded.");
      return (data ?? []).map(mapTicket);
    },

    async get({ userId, roles, ticketId }) {
      if (!client) throw new HttpError(503, "Supabase is not configured on the server.");
      const ticket = await this.loadRow(ticketId);
      const teamIds = roles.includes("support_executive") ? await this.teamIdsFor(userId) : [];
      if (!canViewTicket({ userId, roles, ticket, teamIds })) {
        throw new HttpError(404, "That ticket was not found.");
      }
      const { data: history, error } = await client
        .from("ticket_status_history")
        .select("id, from_status, to_status, reason, created_at, actor:profiles!ticket_status_history_changed_by_fkey(full_name)")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      if (error) raiseDatabase(error, "The ticket history could not be loaded.");
      return {
        ticket: mapTicket(ticket),
        history: (history ?? []).map(mapHistoryEntry),
        allowedStatuses: allowedNextStatuses({ userId, roles, ticket, teamIds }),
      };
    },

    async create({ userId, roles, input }) {
      if (!client) throw new HttpError(503, "Supabase is not configured on the server.");
      const existing = await this.findByIdempotencyKey(input.idempotencyKey);
      if (existing) return this.returnExisting(existing, userId);

      const priority = determinePriority(input);
      const queueCode = queueForTicket(input);
      const team = await this.findQueue(queueCode);
      const deviceId = await this.findOwnDevice(userId, roles, input.deviceLabel);
      const now = new Date();
      const sla = await this.findSla(priority);
      const ticketNumber = await this.nextNumber();
      const troubleshooting = blankToNull(input.troubleshooting) ? [input.troubleshooting.trim()] : [];

      const { data, error } = await client
        .from("tickets")
        .insert({
          ticket_number: ticketNumber,
          creator_id: userId,
          title: input.title.trim(),
          description: input.description.trim(),
          original_report: input.description.trim(),
          ai_summary: null,
          category: input.category,
          subcategory: blankToNull(input.subcategory),
          priority,
          status: "NEW",
          device_id: deviceId,
          device_label: blankToNull(input.deviceLabel),
          service_name: blankToNull(input.serviceName),
          error_details: blankToNull(input.errorDetails),
          business_impact: blankToNull(input.businessImpact),
          affected_users_count: input.affectedUsers ?? 1,
          troubleshooting_history: troubleshooting,
          assigned_team_id: team.id,
          assigned_executive_id: null,
          idempotency_key: input.idempotencyKey,
          sla_first_response_due_at: sla ? addMinutes(now, sla.first_response_minutes) : null,
          sla_resolution_due_at: sla ? addMinutes(now, sla.resolution_minutes) : null,
        })
        .select(TICKET_COLUMNS)
        .single();

      if (error?.code === "23505") {
        const raced = await this.findByIdempotencyKey(input.idempotencyKey);
        if (raced) return this.returnExisting(raced, userId);
      }
      if (error) raiseDatabase(error, "The ticket could not be created.");

      await this.recordOpening(data, userId, team);
      return { ticket: mapTicket(data), created: true };
    },

    async changeStatus({ userId, roles, ticketId, input }) {
      if (!client) throw new HttpError(503, "Supabase is not configured on the server.");
      const ticket = await this.loadRow(ticketId);
      const teamIds = roles.includes("support_executive") || roles.includes("administrator")
        ? await this.teamIdsFor(userId)
        : [];
      if (!canViewTicket({ userId, roles, ticket, teamIds })) {
        throw new HttpError(404, "That ticket was not found.");
      }
      assertStatusChange({ userId, roles, ticket, teamIds, nextStatus: input.status });
      const resolution = blankToNull(input.resolutionDetails);
      if (input.status === "RESOLVED" && !resolution) {
        throw new HttpError(400, "Describe how the incident was resolved.");
      }

      const now = new Date().toISOString();
      const staff = isTeamStaff({ userId, roles, ticket, teamIds });
      const patch = { status: input.status };
      if (input.status === "RESOLVED") {
        patch.resolved_at = now;
        patch.resolution_details = resolution;
      }
      if (input.status === "CLOSED") patch.closed_at = now;
      if (input.status === "REOPENED") {
        patch.resolved_at = null;
        patch.closed_at = null;
      }
      if (staff && ticket.status === "NEW" && !ticket.first_response_at) {
        patch.first_response_at = now;
      }

      const { data, error } = await client
        .from("tickets")
        .update(patch)
        .eq("id", ticketId)
        .select(TICKET_COLUMNS)
        .single();
      if (error) raiseDatabase(error, "The status could not be saved.");

      const { error: historyError } = await client.from("ticket_status_history").insert({
        ticket_id: ticketId,
        from_status: ticket.status,
        to_status: input.status,
        changed_by: userId,
        reason: input.reason.trim(),
      });
      if (historyError) raiseDatabase(historyError, "The status was saved, but the history could not be recorded.");

      await this.notifyStatus(data, userId, input.reason.trim());
      await this.audit(userId, "ticket.status", data.id, {
        from: ticket.status,
        to: input.status,
        ticket_number: data.ticket_number,
      });

      return {
        ticket: mapTicket(data),
        allowedStatuses: allowedNextStatuses({ userId, roles, ticket: data, teamIds }),
      };
    },

    async loadRow(ticketId) {
      const { data, error } = await client.from("tickets").select(TICKET_COLUMNS).eq("id", ticketId).maybeSingle();
      if (error) raiseDatabase(error, "The ticket could not be loaded.");
      if (!data) throw new HttpError(404, "That ticket was not found.");
      return data;
    },

    async findByIdempotencyKey(key) {
      const { data, error } = await client
        .from("tickets")
        .select(TICKET_COLUMNS)
        .eq("idempotency_key", key)
        .maybeSingle();
      if (error) raiseDatabase(error, "The ticket could not be checked.");
      return data;
    },

    returnExisting(row, userId) {
      if (row.creator_id !== userId) {
        throw new HttpError(409, "That request was already used for a different ticket.");
      }
      return { ticket: mapTicket(row), created: false };
    },

    async findQueue(code) {
      const { data, error } = await client
        .from("support_teams")
        .select("id, name, code, manager_id")
        .eq("code", code)
        .eq("is_active", true)
        .maybeSingle();
      if (error) raiseDatabase(error, "The support queue could not be loaded.");
      if (!data) {
        throw new HttpError(503, "The support queue for this category is missing. Run the reference data migration.");
      }
      return data;
    },

    async findSla(priority) {
      const { data, error } = await client
        .from("support_sla_policies")
        .select("first_response_minutes, resolution_minutes")
        .eq("priority", priority)
        .eq("is_active", true)
        .maybeSingle();
      if (error) raiseDatabase(error, "The response target could not be loaded.");
      return data;
    },

    async nextNumber() {
      const { data, error } = await client.rpc("next_ticket_number");
      if (error || !data) raiseDatabase(error, "A ticket number could not be reserved.");
      return data;
    },

    async findOwnDevice(userId, roles, deviceLabel) {
      const label = blankToNull(deviceLabel);
      if (!label) return null;
      const { data, error } = await client
        .from("technical_devices")
        .select("id, assigned_user_id")
        .eq("device_identifier", label)
        .maybeSingle();
      if (error) return null;
      if (!data) return null;
      const staff = roles.includes("administrator") || roles.includes("support_executive");
      if (data.assigned_user_id === userId || staff) return data.id;
      return null;
    },

    async recordOpening(ticket, userId, team) {
      const { error: historyError } = await client.from("ticket_status_history").insert({
        ticket_id: ticket.id,
        from_status: null,
        to_status: "NEW",
        changed_by: userId,
        reason: "Ticket opened from the manual report form.",
      });
      if (historyError) raiseDatabase(historyError, "The ticket was created, but its history could not be recorded.");

      const { error: assignmentError } = await client.from("ticket_assignments").insert({
        ticket_id: ticket.id,
        team_id: team.id,
        executive_id: null,
        assigned_by: userId,
        reason: `Placed in the ${team.name} queue from the technical category. A support person is not assigned yet.`,
      });
      if (assignmentError) raiseDatabase(assignmentError, "The ticket was created, but the queue record could not be saved.");

      const recipients = new Set([userId]);
      if (team.manager_id) recipients.add(team.manager_id);
      const { error: notificationError } = await client.from("notifications").insert(
        [...recipients].map((recipientId) => ({
          recipient_id: recipientId,
          type: "ticket.created",
          title: `${ticket.ticket_number} was created`,
          body: ticket.title,
          ticket_id: ticket.id,
        })),
      );
      if (notificationError) console.error(notificationError.message);
      await this.audit(userId, "ticket.create", ticket.id, {
        ticket_number: ticket.ticket_number,
        category: ticket.category,
        priority: ticket.priority,
      });
    },

    async notifyStatus(ticket, actorId, reason) {
      const recipients = new Set([ticket.creator_id]);
      if (ticket.assigned_executive_id) recipients.add(ticket.assigned_executive_id);
      recipients.delete(actorId);
      if (recipients.size === 0) return;
      const { error } = await client.from("notifications").insert(
        [...recipients].map((recipientId) => ({
          recipient_id: recipientId,
          type: "ticket.status",
          title: `${ticket.ticket_number} is now ${ticket.status}`,
          body: reason,
          ticket_id: ticket.id,
        })),
      );
      if (error) console.error(error.message);
    },

    async audit(actorId, action, entityId, metadata) {
      const { error } = await client.from("audit_logs").insert({
        actor_id: actorId,
        action,
        entity_type: "tickets",
        entity_id: entityId,
        metadata,
      });
      if (error) console.error(error.message);
    },
  };
}
