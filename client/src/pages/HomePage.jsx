import { Link } from "react-router-dom";
import { RoleBadge } from "@/components/RoleBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

const ready = [
  "Sign in and register as a normal user.",
  "View and update your own profile.",
  "Administrators can grant support executive or administrator access.",
];

const later = [
  "Rule-based support assistant and ticket creation.",
  "Team queues, assignment, and escalation.",
  "Live ticket messages and private attachments.",
  "Optional local Ollama assistance, knowledge base, and charts.",
];

export function HomePage() {
  const { account } = useAuth();
  const user = account?.user;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-teal-800">Your desk</p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-950">Hello, {user?.fullName || "there"}</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          You are signed in to the technical incident desk. Ticket counts are not shown yet because ticket screens are part of the next phase.
        </p>
      </div>

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
            The header says the assistant is not enabled. Phase 1 does not run rules or a local model.
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
