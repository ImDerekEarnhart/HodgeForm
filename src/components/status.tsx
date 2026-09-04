import { cn } from "@/lib/utils";
export function Status({ value }: { value: string }) {
  const v = value.toLowerCase();
  return <span className={cn("inline-flex rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]", (v === "released" || v === "release" || v === "pass" || v === "trusted") && "border-emerald-700/50 bg-emerald-500/10 text-emerald-300", (v === "blocked" || v === "block" || v === "fail" || v === "falsified") && "border-red-700/50 bg-red-500/10 text-red-300", (v === "frozen" || v === "missing" || v === "proposed") && "border-amber-700/50 bg-amber-500/10 text-amber-300", !( ["released","release","pass","trusted","blocked","block","fail","falsified","frozen","missing","proposed"].includes(v)) && "border-border bg-bg-subtle text-muted")}>{value}</span>;
}
export function Hash({ value, chars = 12 }: { value: string; chars?: number }) { return <code title={value} className="font-mono text-[11px] text-muted">{value.slice(0, chars)}…</code>; }
