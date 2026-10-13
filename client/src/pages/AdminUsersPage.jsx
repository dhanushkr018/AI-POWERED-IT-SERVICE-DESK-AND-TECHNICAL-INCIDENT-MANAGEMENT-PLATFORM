import { useEffect, useMemo, useState } from "react";
import { RoleBadge } from "@/components/RoleBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { api, formatApiError } from "@/lib/api";

export function AdminUsersPage() {
  const { session, account, reload } = useAuth();
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");

  async function loadUsers() {
    setError("");
    try {
      const payload = await api("/admin/users", { token: session.access_token });
      setUsers(payload.users);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const token = session?.access_token;
    if (!token) return undefined;
    let active = true;
    api("/admin/users", { token })
      .then((payload) => {
        if (!active) return;
        setUsers(payload.users);
        setError("");
      })
      .catch((err) => {
        if (!active) return;
        setError(formatApiError(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session?.access_token]);

  const visibleUsers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((user) =>
      [user.fullName, user.email, user.department, user.employeeId]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(needle)),
    );
  }, [query, users]);

  async function runChange(userId, action) {
    setBusyId(userId);
    setError("");
    try {
      await action();
      await loadUsers();
      if (userId === account?.user?.id) await reload();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusyId("");
    }
  }

  function toggleRole(user, role) {
    const hasRole = user.roles.includes(role);
    return runChange(user.id, () =>
      hasRole
        ? api(`/admin/users/${user.id}/roles/${role}`, { method: "DELETE", token: session.access_token })
        : api(`/admin/users/${user.id}/roles`, {
            method: "POST",
            token: session.access_token,
            body: { role },
          }),
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-semibold text-slate-950">People and roles</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Public registration only creates the user role. Support executive and administrator access are granted here.
          You cannot remove your own administrator access.
        </p>
      </div>
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by name, email, or department"
        aria-label="Search people"
      />
      {error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-600">Loading accounts...</p> : null}
      {!loading && visibleUsers.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-600">
          No accounts match. After the SQL migrations, run <code>npm run seed</code> to load the classroom accounts.
        </p>
      ) : null}
      <div className="space-y-3">
        {visibleUsers.map((user) => {
          const isSelf = user.id === account?.user?.id;
          const busy = busyId === user.id;
          return (
            <article key={user.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-950">{user.fullName}</h2>
                  <p className="text-sm text-slate-600">{user.email}</p>
                  <p className="text-sm text-slate-500">
                    {[user.employeeId, user.department, user.jobTitle].filter(Boolean).join(" · ") || "No employee details"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {user.roles.map((role) => <RoleBadge key={role} role={role} />)}
                  {!user.isActive ? <span className="text-xs font-semibold text-rose-700">Inactive</span> : null}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={busy} onClick={() => toggleRole(user, "support_executive")}>
                  {user.roles.includes("support_executive") ? "Remove executive access" : "Make support executive"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || (isSelf && user.roles.includes("administrator"))}
                  onClick={() => toggleRole(user, "administrator")}
                >
                  {user.roles.includes("administrator") ? "Remove administrator" : "Make administrator"}
                </Button>
                <Button
                  size="sm"
                  variant={user.isActive ? "danger" : "secondary"}
                  disabled={busy || (isSelf && user.isActive)}
                  onClick={() =>
                    runChange(user.id, () =>
                      api(`/admin/users/${user.id}`, {
                        method: "PATCH",
                        token: session.access_token,
                        body: { isActive: !user.isActive },
                      }),
                    )
                  }
                >
                  {user.isActive ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
