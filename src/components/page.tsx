import type { ReactNode } from "react";
export function Page({ title, eyebrow, description, actions, children }: { title: string; eyebrow?: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return <div className="mx-auto max-w-7xl p-5 md:p-8">
    <header className="mb-7 flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
      <div>{eyebrow && <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-accent">{eyebrow}</div>}<h1 className="text-3xl font-semibold tracking-tight">{title}</h1>{description && <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{description}</p>}</div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
    {children}
  </div>;
}
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) { return <section className={`rounded-xl border border-border bg-bg-elevated ${className}`}>{children}</section>; }
export function CardHeader({ title, meta, children }: { title: string; meta?: ReactNode; children?: ReactNode }) { return <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3"><div><h2 className="text-sm font-medium">{title}</h2>{children}</div>{meta}</div>; }
export function Empty({ title, text }: { title: string; text: string }) { return <div className="rounded-xl border border-dashed border-border p-8 text-center"><h3 className="text-sm font-medium">{title}</h3><p className="mx-auto mt-2 max-w-md text-sm text-muted">{text}</p></div>; }
