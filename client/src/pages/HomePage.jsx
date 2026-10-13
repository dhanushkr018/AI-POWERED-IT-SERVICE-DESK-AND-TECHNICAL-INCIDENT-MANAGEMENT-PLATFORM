import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RoleBadge } from "@/components/RoleBadge";
import { PriorityBadge, StatusBadge } from "@/components/tickets/TicketBadges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

const ready = [
  "Sign in, register, and update your profile.",
  "Report a technical problem and receive a real ticket number.",
  "Review ticket details and record status changes.",
];

const later = [
  "Rule-based support assistant.",
  "Choosing a specific support person by workload.",
  "Live ticket messages and private attachments.",
  "Optional local Ollama assistance, knowledge base, and charts.",
];

export function HomePage() {
  const { account, session } = useAuth();
  const user = account?.user;
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    const token = session?.access_token;
    if (!token) return undefined;
    let active = true;
    api("/tickets", { token })
      .then((payload) => {
        if (active) setTickets(payload.tickets);
      })
      .catch(() => {
        if (active) setTickets([]);
      });
    return () => {
      active = false;
    };
  }, [session?.access_token]);

  const open = tickets.filter((ticket) => !["RESOLVED", "CLOSED"].includes(ticket.status)).length;
  const inProgress = tickets.filter((ticket) => ticket.status === "IN_PROGRESS").length;
  const waiting = tickets.filter((ticket) => ticket.status === "WAITING_FOR_USER").length;
  const resolved = tickets.filter((ticket) => ticket.status === "RESOLVED" || ticket.status === "CLOSED").length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-teal-800">Your desk</p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-950">Hello, {user?.fullName || "there"}</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          These counts come from tickets you are allowed to see. A support person is not assigned automatically yet.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Open", open],
          ["In progress", inProgress],
          ["Waiting for the reporter", waiting],
          ["Resolved or closed", resolved],
        ].map(([label, count]) => (
          <Card key={label}>
            <CardContent className="py-4">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="text-2xl font-semibold text-slate-950">{count}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div>
        <Link className="inline-flex h-10 items-center rounded-md bg-teal-700 px-4 text-sm font-semibold text-white" to="/app/tickets/new">
          Report a technical problem
        </Link>
      </div>
      {tickets.slice(0, 3).length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Latest tickets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tickets.slice(0, 3).map((ticket) => (
              <Link key={ticket.id} className="flex flex-wrap items-center justify-between gap-2 text-sm" to={`/app/tickets/${ticket.id}`}>
                <span className="font-semibold text-teal-800">{ticket.ticketNumber}</span>
                <span className="flex-1 text-slate-800">{ticket.title}</span>
                <StatusBadge status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your record</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p><span className="font-semibold">Employee ID:</span> {user?.employeeId || "Not recorded"}</p>
            <p><span className="font-semibold">Department:</span> {user?.department || "Not recorded"}</p>
            <p><span className="font-semibold">Job title:</span> {user?.jobTitle || "Not recorded"}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              {(account?.roles ?? []).map((role) => (
                <RoleBadge key={role} role={role} />
              ))}
            </div>
            <Link className="inline-block font-semibold text-teal-800" to="/app/profile">Update profile</Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>What your access means</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-6 text-slate-700">
            <p><span className="font-semibold">User:</span> report technical problems and follow your own incidents.</p>
            <p><span className="font-semibold">Support executive:</span> work incidents for your team.</p>
            <p><span className="font-semibold">Administrator:</span> manage people, teams, and desk settings.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Planned assistant greeting — not active</CardTitle>
        </CardHeader>
        <CardContent>
          <blockquote className="border-l-4 border-teal-700 pl-4 text-slate-700">
            Hello! I&apos;m your IT Support Assistant. Tell me what technical problem you&apos;re experiencing, and I&apos;ll help you troubleshoot it or connect you with the appropriate support team.
          </blockquote>
          <p className="mt-3 text-sm text-slate-500">
            The header says the assistant is not enabled. Ticket priority uses fixed rules, not a language model.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Working now</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
              {ready.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Not built yet</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
              {later.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
