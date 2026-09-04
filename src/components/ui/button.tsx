import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
export function Button({ className, variant = "primary", size = "md", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" }) {
  return <button className={cn("inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50", size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm", variant === "primary" && "bg-fg text-bg hover:opacity-90", variant === "secondary" && "border border-border-strong bg-bg-elevated text-fg hover:bg-bg-subtle", variant === "ghost" && "text-muted hover:bg-bg-subtle hover:text-fg", variant === "danger" && "bg-red-500/15 text-red-300 hover:bg-red-500/25", className)} {...props} />;
}
