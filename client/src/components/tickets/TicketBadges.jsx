import { Badge } from "@/components/ui/badge";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/tickets";

const statusStyles = {
  NEW: "bg-slate-200 text-slate-800",
  TRIAGED: "bg-sky-100 text-sky-900",
  ASSIGNED: "bg-teal-100 text-teal-900",
  IN_PROGRESS: "bg-teal-700 text-white",
  WAITING_FOR_USER: "bg-amber-100 text-amber-950",
  WAITING_FOR_SPECIALIST: "bg-amber-100 text-amber-950",
  ESCALATED: "bg-rose-100 text-rose-900",
  RESOLVED: "bg-emerald-100 text-emerald-900",
  CLOSED: "bg-slate-200 text-slate-700",
  REOPENED: "bg-orange-100 text-orange-950",
};

const priorityStyles = {
  P1: "bg-rose-700 text-white",
  P2: "bg-orange-100 text-orange-950",
  P3: "bg-slate-200 text-slate-800",
  P4: "bg-slate-100 text-slate-600",
};

export function StatusBadge({ status }) {
  return <Badge className={statusStyles[status] || "bg-slate-200 text-slate-800"}>{STATUS_LABELS[status] || status}</Badge>;
}

export function PriorityBadge({ priority }) {
  return <Badge className={priorityStyles[priority] || "bg-slate-200 text-slate-800"}>{PRIORITY_LABELS[priority] || priority}</Badge>;
}
