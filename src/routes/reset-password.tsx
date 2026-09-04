import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({ token: typeof search.token === "string" ? search.token : "", error: typeof search.error === "string" ? search.error : "" }),
  component: ResetPassword,
});
function ResetPassword(){
  const {token,error:queryError}=Route.useSearch(); const [password,setPassword]=useState(""); const [busy,setBusy]=useState(false); const [error,setError]=useState(queryError); const [done,setDone]=useState(false);
  async function submit(e:React.FormEvent){e.preventDefault();if(!token){setError("This reset link is missing or expired.");return;}setBusy(true);setError("");try{const r=await authClient.resetPassword({newPassword:password,token});if(r.error)throw new Error(r.error.message??"Password reset failed");setDone(true);}catch(e){setError(e instanceof Error?e.message:"Password reset failed");}finally{setBusy(false)}}
  return <div className="grid min-h-dvh place-items-center p-5"><div className="w-full max-w-md"><div className="mb-7 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl border border-border-strong bg-bg-elevated"><ShieldCheck className="size-5"/></span><div><div className="text-lg font-semibold">HodgeForm</div><div className="font-mono text-[10px] uppercase tracking-[.15em] text-muted">Password recovery</div></div></div><form onSubmit={submit} className="rounded-2xl border border-border bg-bg-elevated p-6"><h1 className="text-xl font-semibold">Set a new password</h1>{done?<><p className="mt-4 text-sm text-emerald-300">Password updated and other sessions revoked.</p><Link to="/login" className="mt-5 inline-block text-sm text-accent">Return to sign in</Link></>:<><Input className="mt-6" type="password" minLength={12} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="New password (12+ characters)" autoComplete="new-password"/>{error&&<p className="mt-3 text-sm text-red-300">{error}</p>}<Button className="mt-5 w-full" disabled={busy}>{busy?"Updating…":"Update password"}</Button></>}</form></div></div>
}
