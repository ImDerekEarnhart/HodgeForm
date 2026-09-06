import { useState } from "react";
import { freezeExperiment, listCandidates, listExperiments, recordExperimentEvaluation } from "@/lib/gate/api";
import { useAsync } from "@/lib/use-async";
import { Card, CardHeader } from "./page";
import { Button } from "./ui/button";
import { Input, Select, Textarea } from "./ui/input";
import { Hash, Status } from "./status";

export function ExperimentPanel({ discovery }: { discovery: { id:string; content_hash:string; repository_id:string; title:string } }) {
  const experiments=useAsync(()=>listExperiments(),[discovery.id]);
  const candidates=useAsync(()=>listCandidates({data:{repositoryId:discovery.repository_id}}),[discovery.repository_id]);
  const [candidateId,setCandidate]=useState("");
  const [scope,setScope]=useState(""); const [hypotheses,setHypotheses]=useState("");
  const [protocol,setProtocol]=useState(""); const [rules,setRules]=useState("");
  const [development,setDevelopment]=useState(""); const [holdout,setHoldout]=useState("");
  const [criteria,setCriteria]=useState('[{"id":"regression","requirementId":"HF-REG-001","metric":"failed_tests","comparison":"eq","threshold":0}]');
  const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  const experiment=experiments.data?.find(e=>e.discovery_id===discovery.id);
  const candidate=candidates.data?.find(c=>c.id===candidateId);
  async function freeze(event:React.FormEvent) {
    event.preventDefault();setBusy(true);setError("");
    try {
      if(!candidate?.policy_hash)throw new Error("Select a frozen candidate");
      await freezeExperiment({data:{discoveryId:discovery.id,candidateId,expectedDiscoveryHash:discovery.content_hash,expectedPolicyHash:candidate.policy_hash,
        protocol:{scope,hypotheses:hypotheses.split("\n").map(x=>x.trim()).filter(Boolean),protocol,antiRescueRules:rules,developmentDataHash:development,holdoutDataHash:holdout,criteria:JSON.parse(criteria)}}});
      await experiments.reload();
    }catch(e){setError(e instanceof Error?e.message:"Unable to freeze experiment");}finally{setBusy(false);}
  }
  async function evaluate() {
    if(!experiment)return;setBusy(true);setError("");
    try{await recordExperimentEvaluation({data:{experimentId:experiment.id,expectedHash:experiment.experiment_hash}});await experiments.reload();}
    catch(e){setError(e instanceof Error?e.message:"Evaluation failed");}finally{setBusy(false);}
  }
  return <Card className="mb-6"><CardHeader title={`Governed experiment · ${discovery.title}`}>
    <p className="mt-1 text-xs text-muted">Freeze competing explanations and measurable tests before collecting results. Survival is limited to this protocol and never activates a change.</p>
  </CardHeader>
    {(error||experiments.error||candidates.error)&&<p role="alert" className="p-4 text-sm text-red-300">{error||experiments.error||candidates.error}</p>}
    {experiments.loading?<p className="p-4 text-sm text-muted">Loading experiment…</p>:experiment?<div className="space-y-4 p-4">
      <p className="text-sm"><Status value="frozen"/> <Hash value={experiment.experiment_hash} chars={24}/></p>
      <p className="text-sm text-muted">{experiment.frozen_json.protocol.scope}</p>
      <details className="text-xs"><summary className="cursor-pointer">Frozen hypotheses, protocol and criteria</summary><pre className="mt-3 overflow-auto whitespace-pre-wrap break-words">{JSON.stringify(experiment.frozen_json.protocol,null,2)}</pre></details>
      <Button onClick={()=>void evaluate()} disabled={busy}>Evaluate authenticated evidence</Button>
      <p className="text-xs text-muted">Only signed verifier executions bound to this exact experiment count. Missing or unauthenticated results remain inconclusive. Data hashes commit bytes; they do not prove nobody saw the holdout.</p>
      {experiment.evaluations.map(e=><div key={e.id} className="rounded border border-border p-3">
        <p className="text-sm"><Status value={e.result_json.status}/> <span className="text-xs text-muted">{new Date(e.created_at).toLocaleString()}</span></p>
        <p className="mt-2 text-xs text-muted">Recorded snapshot · <Hash value={e.result_hash}/></p>
        <details className="mt-2 text-xs"><summary className="cursor-pointer">Criteria and evidence eligibility</summary><pre className="mt-2 overflow-auto whitespace-pre-wrap break-words">{JSON.stringify(e.result_json.criteria,null,2)}</pre></details>
      </div>)}
    </div>:<form onSubmit={freeze} className="grid gap-3 p-4 md:grid-cols-2">
      <label className="space-y-1 md:col-span-2"><span className="text-xs text-muted">Exact frozen candidate</span><Select required value={candidateId} onChange={e=>setCandidate(e.target.value)}><option value="">Select candidate</option>{candidates.data?.filter(c=>c.status==='frozen').map(c=><option key={c.id} value={c.id}>{c.version} · {c.artifact_hash.slice(0,12)}</option>)}</Select></label>
      <label className="space-y-1 md:col-span-2"><span className="text-xs text-muted">Claim scope and limitations</span><Textarea required minLength={10} maxLength={2000} value={scope} onChange={e=>setScope(e.target.value)}/></label>
      <label className="space-y-1 md:col-span-2"><span className="text-xs text-muted">Competing hypotheses (at least two, one per line)</span><Textarea required value={hypotheses} onChange={e=>setHypotheses(e.target.value)}/></label>
      <label className="space-y-1 md:col-span-2"><span className="text-xs text-muted">Prospective experiment protocol</span><Textarea required minLength={20} maxLength={6000} value={protocol} onChange={e=>setProtocol(e.target.value)}/></label>
      <label className="space-y-1"><span className="text-xs text-muted">Development data SHA-256</span><Input required pattern="[a-f0-9]{64}" value={development} onChange={e=>setDevelopment(e.target.value)}/></label>
      <label className="space-y-1"><span className="text-xs text-muted">Untouched holdout data SHA-256</span><Input required pattern="[a-f0-9]{64}" value={holdout} onChange={e=>setHoldout(e.target.value)}/></label>
      <label className="space-y-1 md:col-span-2"><span className="text-xs text-muted">Rules against changing tests after seeing results</span><Textarea required minLength={10} maxLength={2000} value={rules} onChange={e=>setRules(e.target.value)}/></label>
      <label className="space-y-1 md:col-span-2"><span className="text-xs text-muted">Measurable criteria (JSON; comparisons: eq, gte, lte)</span><Textarea required className="font-mono text-xs" value={criteria} onChange={e=>setCriteria(e.target.value)}/></label>
      <div className="md:col-span-2"><Button disabled={busy||!candidate}>Freeze experiment</Button></div>
    </form>}
  </Card>;
}
