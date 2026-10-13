import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const required = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"];

export function SetupPage() {
  const { configured, session } = useAuth();
  if (configured && session) return <Navigate to="/app" replace />;
  if (configured) return <Navigate to="/login" replace />;

  const missing = required.filter((name) => !import.meta.env[name]);

  return (
    <main className="min-h-screen bg-[#f4f7f8] px-6 py-12">
      <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">Setup required</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Connect the web app to Supabase</h1>
        <p className="mt-3 leading-7 text-slate-600">
          Copy <code>client/.env.example</code> to <code>client/.env</code> and add the project URL and anon key.
          Put the service-role key only in <code>server/.env</code>.
        </p>
        <ul className="mt-5 space-y-2 text-sm">
          {missing.map((name) => (
            <li key={name} className="rounded-md bg-amber-50 px-3 py-2 text-amber-950">
              Missing {name}
            </li>
          ))}
        </ul>
        <p className="mt-5 text-sm leading-6 text-slate-600">
          Restart <code>npm run dev</code> after saving the file. Vite only reads environment variables when it starts.
        </p>
      </div>
    </main>
  );
}
