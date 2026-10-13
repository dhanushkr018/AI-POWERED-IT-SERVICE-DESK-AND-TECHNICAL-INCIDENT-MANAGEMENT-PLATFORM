import { Badge } from "@/components/ui/badge";
import { roleLabel } from "@/lib/roles";

const styles = {
  user: "bg-slate-200 text-slate-800",
  support_executive: "bg-teal-100 text-teal-900",
  administrator: "bg-[#0c1b2a] text-white",
};

export function RoleBadge({ role }) {
  return <Badge className={styles[role] || "bg-slate-200 text-slate-800"}>{roleLabel(role)}</Badge>;
}
