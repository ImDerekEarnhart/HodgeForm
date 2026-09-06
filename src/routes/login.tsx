import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { authClient, authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getPublicAuthOptions } from "@/lib/auth/public-options";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export const Route = createFileRoute("/login")({ loader: () => getPublicAuthOptions(), component: Login });
function Login() {
  const options = Route.useLoaderData();
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice,setNotice]=useState("");
  if (!authEnabled) return <Navigate to="/overview" />;
  if (!isPending && user) return <Navigate to="/overview" />;
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      if(mode === "forgot") {
        const result=await authClient.requestPasswordReset({email,redirectTo:`${window.location.origin}/reset-password`});
        if(result.error) throw new Error(result.error.message ?? "Unable to request password reset");
        setNotice("If that address exists, a password-reset link has been sent.");
        return;
      }
      const result = mode === "signin" ? await authClient.signIn.email({ email, password }) : await authClient.signUp.email({ name: name || email.split("@")[0], email, password });
      if (result.error) throw new Error(result.error.message ?? "Authentication failed");
      if(mode === "signup") { setNotice("Account created. Check your email to verify the address before signing in."); setMode("signin"); return; }
      window.location.href = "/overview";
    } catch (e) { setError(e instanceof Error ? e.message : "Authentication failed"); } finally { setBusy(false); }
  }
  const title=mode==="signin"?"Sign in":mode==="signup"?"Create account":"Reset password";
  return <div className="grid min-h-dvh place-items-center p-5"><div className="w-full max-w-md">
    <div className="mb-7 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl border border-border-strong bg-bg-elevated"><ShieldCheck className="size-5" /></span><div><div className="text-lg font-semibold">HodgeForm</div><div className="font-mono text-[10px] uppercase tracking-[.15em] text-muted">Trust compiler for AI work</div></div></div>
    <form onSubmit={submit} className="rounded-2xl border border-border bg-bg-elevated p-6 shadow-2xl shadow-black/20">
      <h1 className="text-xl font-semibold">{title}</h1><p className="mt-1 text-sm text-muted">Release consequential AI with evidence, not vibes.</p>
      {!options.emailAndPasswordEnabled && <p className="mt-3 text-sm text-muted">Email sign-in is not enabled on this deployment.</p>}
      {options.emailAndPasswordEnabled && !options.signupsAllowed && <p className="mt-3 text-sm text-muted">Access is by invitation. Sign in with your provisioned account.</p>}
      <div className="mt-6 space-y-3">{mode === "signup" && <Input aria-label="Name" value={name} onChange={(e)=>setName(e.target.value)} placeholder="Name" autoComplete="name" />}<Input aria-label="Email address" type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" />{mode !== "forgot" && <Input aria-label="Password" type="password" required minLength={mode === "signup" ? options.minPasswordLength : undefined} value={password} onChange={(e)=>setPassword(e.target.value)} placeholder={mode === "signup" ? `Password (${options.minPasswordLength}+ characters)` : "Password"} autoComplete={mode === "signin" ? "current-password" : "new-password"} />}</div>
      {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}{notice&&<p role="status" className="mt-3 text-sm text-emerald-300">{notice}</p>}
      <Button className="mt-5 w-full" disabled={busy || !options.emailAndPasswordEnabled}>{busy ? "Working…" : mode === "forgot" ? "Send reset link" : title}</Button>
      <div className="mt-4 flex justify-between text-xs text-muted">{options.signupsAllowed && options.emailAndPasswordEnabled && <button type="button" disabled={busy} className="hover:text-fg" onClick={()=>{setMode(mode === "signup" ? "signin" : "signup");setError("");setNotice("");}}>{mode === "signup" ? "Already have an account?" : "Create account"}</button>}{options.emailAndPasswordEnabled && <button type="button" disabled={busy} className="hover:text-fg" onClick={()=>{setMode(mode === "forgot" ? "signin" : "forgot");setError("");setNotice("");}}>{mode === "forgot" ? "Back to sign in" : "Forgot password?"}</button>}</div>
    </form>
  </div></div>;
}
