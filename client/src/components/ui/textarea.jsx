import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-teal-700/20 placeholder:text-slate-400 focus:border-teal-700 focus:ring-2",
        className,
      )}
      {...props}
    />
  );
}
