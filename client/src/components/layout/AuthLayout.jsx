import { Headset, Monitor, Shield, Wifi } from "lucide-react";

const examples = [
  ["Laptop or desktop will not start", Monitor],
  ["Cannot sign in", Shield],
  ["Network or VPN failure", Wifi],
  ["Application keeps closing", Headset],
];

export function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section className="flex flex-col justify-between bg-[#0c1b2a] px-6 py-8 text-white lg:px-12 lg:py-12">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-200">IT Service Desk</p>
          <h1 className="mt-6 max-w-md text-4xl font-semibold leading-tight">
            Technical incidents, routed to the right support team.
          </h1>
          <p className="mt-4 max-w-md text-base leading-7 text-slate-300">
            This phase signs people in and keeps administrator access separate from public registration.
            Troubleshooting and ticket screens come next.
          </p>
          <ul className="mt-8 space-y-3">
            {examples.map(([label, Icon]) => (
              <li key={label} className="flex items-center gap-3 text-sm text-slate-200">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10">
                  <Icon className="h-4 w-4 text-teal-200" aria-hidden="true" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-10 text-sm text-slate-400">Phase 1 · Accounts and access control</p>
      </section>
      <section className="flex items-center justify-center bg-[#f4f7f8] px-6 py-10">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-semibold text-slate-950">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </section>
    </div>
  );
}
