import { useState } from "react";
import { listWorkers, listVerifierPrincipals, registerWorker, queueVerifierJob, listCandidates, listExperiments } from "@/lib/gate/api";
import { useAsync } from "@/lib/use-async";
import { Card, CardHeader } from "./page";
import { Input, Select, Textarea } from "./ui/input";
import { Button } from "./ui/button";

export function WorkerPanel() {
  const workers=useAsync(()=>listWorkers()),principals=useAsync(()=>listVerifierPrincipals()),candidates=useAsync(()=>listCandidates({data:{}})),experiments=useAsync(()=>listExperiments());
  const [principal,setPrincipal]=useState("");const [image,setImage]=useState("");const [key,setKey]=useState("");const [requirements,setRequirements]=useState("HF-REG-001");
  const [workerId,setWorker]=useState("");const [candidateId,setCandidate]=useState("");const [requirementId,setRequirement]=useState("");const [experimentId,setExperiment]=useState("");
  const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [job,setJob]=useState("");
  const candidate=candidates.data?.find(c=>c.id===candidateId);
  async function register(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");try{await registerWorker({data:{verifierId:principal,image,publicKeyPem:key,requirementIds:requirements.split(/[\s,]+/).filter(Boolean),evidenceKind:"deterministic_test"}});setKey("");await workers.reload();}catch(e){setError(e instanceof Error?e.message:"Registration failed");}finally{setBusy(false);}}
  async function queue(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");try{if(!candidate?.policy_hash)throw new Error("Select a frozen candidate");const result=await queueVerifierJob({data:{workerId,candidateId,requirementId,expectedPolicyHash:candidate.policy_hash,...(experimentId?{experimentId}:{})}});setJob(JSON.stringify(result,null,2));}catch(e){setError(e instanceof Error?e.message:"Job request failed");}finally{setBusy(false);}}
  return <Card className="mt-6"><CardHeader title="Signed verification workers"><p className="mt-1 text-xs text-muted">Owners and admins approve exact verifier images, public keys and eligible obligations. Jobs expire after 15 minutes and can submit one authenticated result. A dedicated runner must be connected to execute them.</p></CardHeader>
    {(error||workers.error||principals.error||candidates.error||experiments.error)&&<p role="alert" className="p-4 text-sm text-red-300">{error||workers.error||principals.error||candidates.error||experiments.error}</p>}
    <div className="space-y-4 p-4"><details><summary className="cursor-pointer text-sm">Register an approved verifier image</summary><form onSubmit={register} className="mt-3 grid gap-3">
      <Select aria-label="Verifier identity" required value={principal} onChange={e=>setPrincipal(e.target.value)}><option value="">Select registered verifier identity</option>{principals.data?.filter(p=>!p.disabledAt).map(p=><option key={p.id} value={p.id}>{p.name} · {p.trustLevel}</option>)}</Select>
      <Input aria-label="Pinned image digest" required value={image} onChange={e=>setImage(e.target.value)} placeholder="registry/image@sha256:… or sha256:…"/>
      <Textarea aria-label="Worker public key" required value={key} onChange={e=>setKey(e.target.value)} placeholder="Ed25519 PUBLIC key PEM; keep the private key on the runner"/>
      <Input aria-label="Allowed obligation IDs" required value={requirements} onChange={e=>setRequirements(e.target.value)} placeholder="Allowed obligation IDs, separated by commas"/>
      <Button disabled={busy}>Register deterministic-test worker</Button>
    </form></details>
    <form onSubmit={queue} className="grid gap-3 md:grid-cols-2">
      <Select aria-label="Approved worker" required value={workerId} onChange={e=>setWorker(e.target.value)}><option value="">Choose approved worker</option>{workers.data?.filter(w=>!w.disabled_at).map(w=><option key={w.id} value={w.id}>{w.id} · {w.image.slice(0,35)}</option>)}</Select>
      <Select aria-label="Candidate to verify" required value={candidateId} onChange={e=>{setCandidate(e.target.value);setRequirement("");setExperiment("");}}><option value="">Choose frozen candidate</option>{candidates.data?.filter(c=>c.status==='frozen').map(c=><option key={c.id} value={c.id}>{c.repository_name} · {c.version}</option>)}</Select>
      <Select aria-label="Obligation to verify" required value={requirementId} onChange={e=>setRequirement(e.target.value)}><option value="">Choose obligation</option>{candidate?.compiled_policy_json?.requirements.map(r=><option key={r.id} value={r.id}>{r.id} · {r.title}</option>)}</Select>
      <Select aria-label="Frozen experiment" value={experimentId} onChange={e=>setExperiment(e.target.value)}><option value="">No discovery experiment</option>{experiments.data?.filter(e=>e.candidate_id===candidateId).map(e=><option key={e.id} value={e.id}>{e.frozen_json.protocol.scope.slice(0,70)}</option>)}</Select>
      <div className="md:col-span-2"><Button disabled={busy||!workerId||!candidateId||!requirementId}>Authorize bounded verifier job</Button></div>
    </form>
    {job&&<details open><summary className="cursor-pointer text-sm">Frozen job for the dedicated runner</summary><pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs">{job}</pre></details>}
    </div>
  </Card>;
}
