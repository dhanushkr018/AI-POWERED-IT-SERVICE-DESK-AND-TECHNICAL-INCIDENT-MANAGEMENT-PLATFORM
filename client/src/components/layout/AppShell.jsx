import { LayoutDashboard, LogOut, Shield, UserRound } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { RoleBadge } from "@/components/RoleBadge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const links = [
  { to: "/app", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/app/profile", label: "Profile", icon: UserRound, end: false },
];

export function AppShell() {
  const { account, error, signOut, hasRole } = useAuth();
  const navigation = hasRole("administrator")
    ? [...links, { to: "/app/admin/users", label: "People and roles", icon: Shield, end: false }]
    : links;

  return (
    <div className="min-h-screen bg-[#f4f7f8] md:grid md:grid-cols-[250px_1fr]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-20 focus:rounded-md focus:bg-white focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <aside className="bg-[#0c1b2a] text-white md:min-h-screen">
        <div className="px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-200">IT Service Desk</p>
          <p className="mt-2 text-lg font-semibold">{account?.user?.fullName || "Signed in"}</p>
          <p className="text-sm text-slate-300">{account?.user?.email}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(account?.roles ?? []).map((role) => (
              <RoleBadge key={role} role={role} />
            ))}
          </div>
        </div>
        <nav className="flex gap-2 overflow-x-auto px-3 pb-4 md:block md:space-y-1" aria-label="Primary">
          {navigation.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10",
                    isActive && "bg-white/10 text-white",
                  )
                }
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {link.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="hidden px-3 pb-5 md:block">
          <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </Button>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
          <p className="text-sm text-slate-600">
            Assistant: <span className="font-semibold text-slate-900">not enabled</span>
          </p>
          <Button variant="outline" className="md:hidden" onClick={signOut}>
            Sign out
          </Button>
        </header>
        <main id="main" className="mx-auto w-full max-w-5xl px-5 py-6">
          {error && !account ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}
