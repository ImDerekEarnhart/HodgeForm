import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FileCheck2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Status } from "@/components/status";
import { verifyPublishedReceipt } from "@/lib/gate/api";

export const Route = createFileRoute("/verify")({ component: Verify });

function Verify() {
  const [raw, setRaw] = useState("");
  const [result, setResult] = useState<{ ok: boolean; reason?: string; verdict?: string; receiptHash?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setResult(null);
    try {
      const doc = JSON.parse(raw);
      const out = await verifyPublishedReceipt({ data: doc });
      setResult(out);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally { setBusy(false); }
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <Link to="/" className="mb-8 flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-lg border border-border-strong bg-bg-elevated"><FileCheck2 className="size-4" /></span>
        <strong className="text-sm">HodgeForm</strong>
      </Link>
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">Receipt verifier</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Verify a signed release receipt</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Paste a HodgeForm receipt issued by this deployment. Verification checks the canonical payload hash,
        Ed25519 signature, configured signer fingerprint, and verdict. A BLOCK receipt never verifies as releasable.
      </p>
      <form onSubmit={(e) => void submit(e)} className="mt-8 space-y-4">
        <Textarea value={raw} onChange={(e) => setRaw(e.target.value)} className="h-64 font-mono text-xs" placeholder='{"schema":"hodgeform-signed-release/1", ...}' />
        <Button disabled={busy || !raw.trim()}>{busy ? "Checking…" : "Verify receipt"}</Button>
      </form>
      {error && <div className="mt-4 rounded-lg border border-red-800/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
      {result && <div className="mt-4 rounded-xl border border-border bg-bg-elevated p-4"><Status value={result.ok ? "pass" : "fail"} /><p className="mt-3 text-sm text-muted">{result.ok ? `Valid ${result.verdict} receipt under this deployment's configured release authority.` : result.reason}</p>{result.receiptHash && <p className="mt-2 font-mono text-[11px] text-subtle">{result.receiptHash}</p>}</div>}
      <p className="mt-8 text-xs leading-5 text-subtle">For CI enforcement, use <code>hodgeform gate verify</code> with a separately pinned public key. The web verifier is a convenience check against this running deployment.</p>
    </main>
  );
}
