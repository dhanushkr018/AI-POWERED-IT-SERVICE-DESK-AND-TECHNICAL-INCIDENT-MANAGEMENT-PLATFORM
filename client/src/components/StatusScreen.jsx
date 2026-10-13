export function StatusScreen({ title, body }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f7f8] px-6">
      <div className="max-w-md text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">IT Service Desk</p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-950">{title}</h1>
        {body ? <p className="mt-2 text-slate-600">{body}</p> : null}
      </div>
    </div>
  );
}
