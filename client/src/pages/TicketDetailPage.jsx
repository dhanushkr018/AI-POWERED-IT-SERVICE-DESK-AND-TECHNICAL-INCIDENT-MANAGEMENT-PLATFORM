import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PriorityBadge, StatusBadge } from "@/components/tickets/TicketBadges";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { api, formatApiError } from "@/lib/api";
import { STATUS_LABELS, categoryLabel, formatWhen } from "@/lib/tickets";

export function TicketDetailPage() {
  const { ticketId } = useParams();
  const { session } = useAuth();
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [reason, setReason] = useState("");
  const [resolutionDetails, setResolutionDetails] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [loadedFor, setLoadedFor] = useState(ticketId);
  if (ticketId !== loadedFor) {
    setLoadedFor(ticketId);
    setLoading(true);
    setDetail(null);
    setError("");
  }

  async function load() {
    const payload = await api(`/tickets/${ticketId}`, { token: session.access_token });
    setDetail(payload);
    setStatus(payload.allowedStatuses[0] || "");
  }

  useEffect(() => {
    const token = session?.access_token;
    if (!token) return undefined;
    let active = true;
    api(`/tickets/${ticketId}`, { token })
      .then((payload) => {
        if (!active) return;
        setDetail(payload);
        setStatus(payload.allowedStatuses[0] || "");
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
  }, [session?.access_token, ticketId]);

  async function onStatus(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await api(`/tickets/${ticketId}/status`, {
        method: "POST",
        token: session.access_token,
        body: {
          status,
          reason,
          ...(status === "RESOLVED" ? { resolutionDetails } : {}),
        },
      });
      setReason("");
      setResolutionDetails("");
      setMessage("Status saved.");
      await load();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-600">Loading ticket...</p>;
  if (!detail?.ticket) {
    return <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{error || "That ticket was not found."}</p>;
  }

  const ticket = detail.ticket;
  const facts = [
    ["Category", categoryLabel(ticket.category)],
    ["Queue", ticket.team?.name || "Not queued"],
    ["Support person", ticket.executive?.fullName || "Not assigned yet"],
    ["Reporter", ticket.creator?.fullName || "Unknown"],
    ["Device", ticket.deviceLabel || "Not recorded"],
    ["Service", ticket.serviceName || "Not recorded"],
    ["Error", ticket.errorDetails || "Not recorded"],
    ["People affected", ticket.affectedUsers ?? "Not recorded"],
    ["Opened", formatWhen(ticket.createdAt)],
    ["First response due", formatWhen(ticket.slaFirstResponseDueAt)],
    ["Resolution due", formatWhen(ticket.slaResolutionDueAt)],
  ];

  return (
    <div className="space-y-5">
      <div>
        <Link className="text-sm font-semibold text-teal-800" to="/app/tickets">Tickets</Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold text-slate-950">{ticket.ticketNumber}</h1>
          <PriorityBadge priority={ticket.priority} />
          <StatusBadge status={ticket.status} />
        </div>
        <p className="mt-2 text-lg text-slate-800">{ticket.title}</p>
      </div>
      {error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
      {message ? <p className="rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-900">{message}</p> : null}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-950">Original report</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{ticket.originalReport}</p>
        {ticket.businessImpact ? <p className="mt-3 text-sm text-slate-600"><span className="font-semibold">Impact: </span>{ticket.businessImpact}</p> : null}
        {ticket.troubleshooting?.length ? (
          <div className="mt-3 text-sm text-slate-600">
            <p className="font-semibold">Already tried</p>
            <ul className="mt-1 list-disc pl-5">
              {ticket.troubleshooting.map((step) => <li key={step}>{step}</li>)}
            </ul>
          </div>
        ) : null}
      </section>
      <dl className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="mt-1 text-sm text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
      {ticket.resolutionDetails ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-950">Resolution</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{ticket.resolutionDetails}</p>
        </section>
      ) : null}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-950">Status history</h2>
        <ol className="mt-3 space-y-3">
          {detail.history.map((entry) => (
            <li key={entry.id} className="border-l-2 border-teal-700 pl-3">
              <p className="text-sm font-semibold text-slate-900">
                {entry.fromStatus ? `${STATUS_LABELS[entry.fromStatus] || entry.fromStatus} to ` : ""}
                {STATUS_LABELS[entry.toStatus] || entry.toStatus}
              </p>
              <p className="text-sm text-slate-600">{entry.reason}</p>
              <p className="text-xs text-slate-500">{entry.changedBy} · {formatWhen(entry.createdAt)}</p>
            </li>
          ))}
        </ol>
      </section>
      {detail.allowedStatuses.length > 0 ? (
        <form className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={onStatus}>
          <h2 className="font-semibold text-slate-950">Change status</h2>
          <label className="block text-sm font-semibold text-slate-800" htmlFor="nextStatus">Next status</label>
          <select id="nextStatus" className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
            {detail.allowedStatuses.map((value) => <option key={value} value={value}>{STATUS_LABELS[value] || value}</option>)}
          </select>
          <label className="block text-sm font-semibold text-slate-800" htmlFor="reason">Reason</label>
          <Textarea id="reason" value={reason} onChange={(event) => setReason(event.target.value)} />
          {status === "RESOLVED" ? (
            <>
              <label className="block text-sm font-semibold text-slate-800" htmlFor="resolution">How it was resolved</label>
              <Textarea id="resolution" value={resolutionDetails} onChange={(event) => setResolutionDetails(event.target.value)} />
            </>
          ) : null}
          <Button type="submit" disabled={saving || reason.trim().length < 3}>{saving ? "Saving..." : "Save status"}</Button>
        </form>
      ) : null}
    </div>
  );
}
