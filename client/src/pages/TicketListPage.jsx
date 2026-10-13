import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PriorityBadge, StatusBadge } from "@/components/tickets/TicketBadges";
import { useAuth } from "@/hooks/useAuth";
import { api, formatApiError } from "@/lib/api";
import { CATEGORY_LABELS, PRIORITY_LABELS, STATUS_LABELS, categoryLabel, formatWhen } from "@/lib/tickets";

const selectClass = "h-10 rounded-md border border-slate-300 bg-white px-3 text-sm";

export function TicketListPage() {
  const { session, hasRole } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = session?.access_token;
    if (!token) return undefined;
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (priority) params.set("priority", priority);
    if (category) params.set("category", category);
    const query = params.toString();
    let active = true;
    api(`/tickets${query ? `?${query}` : ""}`, { token })
      .then((payload) => {
        if (!active) return;
        setTickets(payload.tickets);
        setError("");
      })
      .catch((err) => {
        if (active) setError(formatApiError(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session?.access_token, status, priority, category]);

  const heading = hasRole("administrator")
    ? "All tickets"
    : hasRole("support_executive")
      ? "Tickets for your queues"
      : "My tickets";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-slate-950">{heading}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            A support person is not chosen automatically yet. New tickets wait in the queue that matches the technical category.
          </p>
        </div>
        <Link to="/app/tickets/new" className="inline-flex h-10 items-center rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800">
          Report a problem
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        <select className={selectClass} aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select className={selectClass} aria-label="Filter by priority" value={priority} onChange={(event) => setPriority(event.target.value)}>
          <option value="">All priorities</option>
          {Object.entries(PRIORITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select className={selectClass} aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">All categories</option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      {error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-600">Loading tickets...</p> : null}
      {!loading && tickets.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-600">
          No tickets match these filters.
        </p>
      ) : null}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {tickets.map((ticket) => (
          <Link
            key={ticket.id}
            to={`/app/tickets/${ticket.id}`}
            className="grid gap-2 border-b border-slate-100 px-4 py-4 last:border-b-0 hover:bg-slate-50 md:grid-cols-[9rem_1fr_auto] md:items-center"
          >
            <p className="font-semibold text-teal-800">{ticket.ticketNumber}</p>
            <div>
              <p className="font-semibold text-slate-950">{ticket.title}</p>
              <p className="text-sm text-slate-500">
                {categoryLabel(ticket.category)} · {ticket.team?.name || "No queue"} · Updated {formatWhen(ticket.updatedAt)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <PriorityBadge priority={ticket.priority} />
              <StatusBadge status={ticket.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
