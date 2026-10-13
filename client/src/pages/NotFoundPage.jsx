import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f7f8] px-6">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-semibold text-slate-950">That page is not part of this phase</h1>
        <p className="mt-2 text-slate-600">The ticket, chat, and report screens are still to be built.</p>
        <Link className="mt-4 inline-block font-semibold text-teal-800" to="/app">Back to home</Link>
      </div>
    </main>
  );
}
