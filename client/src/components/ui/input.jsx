import { cn } from "@/lib/utils";

export function Input({ className, ref, ...props }) {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none ring-teal-700/20 placeholder:text-slate-400 focus:border-teal-700 focus:ring-2",
        className,
      )}
      {...props}
    />
  );
}
