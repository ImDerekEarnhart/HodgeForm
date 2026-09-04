import { createFileRoute } from "@tanstack/react-router";
import { Download, Fingerprint, TerminalSquare } from "lucide-react";
import { RequireUser } from "@/lib/auth/gates";
import { listReceipts } from "@/lib/gate/api";
import { useAsync } from "@/lib/use-async";
import { Page, Card, CardHeader, Empty } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Hash, Status } from "@/components/status";
export const Route = createFileRoute("/receipts")({ component: () => <RequireUser><Receipts /></RequireUser> });
function Receipts() {
  const {data,error}=useAsync(()=>listReceipts());
  function download(r:any){const doc={schema:"hodgeform-signed-release/1",payload:r.receipt_json,receiptHash:r.receipt_hash,signerId:r.signer_id,signature:r.signature_b64,publicKeyFingerprint:r.public_key_fingerprint};const blob=new Blob([JSON.stringify(doc,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`hodgeform-${r.repository_slug}-${r.version}-${r.verdict.toLowerCase()}.json`;a.click();URL.revokeObjectURL(url);}
  return <Page eyebrow="Offline-verifiable trust" title="Release receipts" description="A receipt is a signed statement about an exact artifact under an exact frozen gate. CI verifies it against your organization's pinned Ed25519 public key—without trusting the HodgeForm dashboard.">
    {error&&<div className="mb-4 rounded-lg border border-red-800/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
    <Card className="mb-6"><CardHeader title="CI contract" meta={<TerminalSquare className="size-4 text-subtle"/>}/><div className="grid gap-4 p-4 md:grid-cols-2"><div><div className="font-mono text-[10px] uppercase tracking-[.13em] text-subtle">Verify locally</div><code className="mt-2 block rounded-lg border border-border bg-bg p-3 text-xs text-accent">hodgeform receipt verify release.json --public-key ./hodgeform.pub</code></div><div><div className="font-mono text-[10px] uppercase tracking-[.13em] text-subtle">Enforcement</div><p className="mt-2 text-sm leading-6 text-muted">The command exits non-zero for a tampered signature, mismatched receipt hash, untrusted key, or BLOCK verdict. That makes the receipt a CI/CD primitive rather than a dashboard badge.</p></div></div></Card>
    {data?.length?<div className="space-y-3">{data.map((r:any)=><Card key={r.id}><div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2"><Status value={r.verdict}/><span className="text-sm font-medium">{r.repository_name} · {r.version}</span></div><div className="mt-2 flex flex-wrap gap-4 text-xs text-muted"><span>receipt <Hash value={r.receipt_hash} chars={18}/></span><span>artifact <Hash value={r.artifact_hash}/></span><span className="flex items-center gap-1"><Fingerprint className="size-3"/><Hash value={r.public_key_fingerprint}/></span></div></div><Button variant="secondary" size="sm" onClick={()=>download(r)}><Download className="size-3"/>Export receipt</Button></div></Card>)}</div>:<Empty title="No signed decisions yet" text="When a frozen gate is decided, HodgeForm keeps the evidence trail and emits a portable signed RELEASE or BLOCK receipt."/>}
  </Page>;
}
