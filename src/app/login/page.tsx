"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Cloud, Eye, EyeOff, ArrowLeft, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const supabase = createClient();
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(search.get("next") || "/");
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email, password, options: { data: { display_name: name }, emailRedirectTo: `${location.origin}/auth/callback` },
        });
        if (error) throw error;
        if (data.session) { router.replace("/"); router.refresh(); }
        else setMessage("Account created. Check your email to confirm your address, then sign in.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally { setBusy(false); }
  }

  async function magicLink() {
    setBusy(true); setError(""); setMessage("");
    try {
      const { error } = await createClient().auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
      if (error) throw error;
      setMessage("Magic link sent. Check your inbox.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not send the magic link."); }
    finally { setBusy(false); }
  }

  async function google() {
    setBusy(true); setError("");
    try {
      const { error } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/auth/callback`, scopes: "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.metadata.readonly" } });
      if (error) throw error;
    } catch (e) { setError(e instanceof Error ? e.message : "Google sign-in is not configured yet."); setBusy(false); }
  }

  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#08090f] px-4 py-12 text-white">
    <div className="cv-grid pointer-events-none absolute inset-0 opacity-50"/>
    <div className="absolute -left-32 top-10 h-80 w-80 rounded-full bg-violet-600/15 blur-[100px]"/>
    <div className="absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-blue-600/10 blur-[100px]"/>
    <div className="relative grid w-full max-w-[930px] overflow-hidden rounded-[28px] border border-white/[.08] bg-[#10121c]/95 shadow-2xl shadow-black/50 md:grid-cols-[.95fr_1.05fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-white/[.07] bg-gradient-to-br from-violet-500/15 via-[#121525] to-blue-500/10 p-9 md:flex">
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-500"><Cloud size={22}/></div><span className="text-lg font-bold tracking-tight">Cloud<span className="text-violet-300">Vault</span></span></div>
        <div className="relative z-10"><div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1.5 text-[10px] text-violet-200"><Sparkles size={12}/> YOUR CLOUD, UNIFIED</div><h1 className="max-w-sm text-[38px] font-semibold leading-[1.12] tracking-[-.05em]">Everything you store. <span className="text-violet-300">One clear view.</span></h1><p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">Bring your cloud accounts together in one secure workspace. Your files stay with their original providers.</p><div className="mt-9 space-y-3 text-xs text-slate-300"><div className="flex items-center gap-3"><ShieldCheck size={16} className="text-emerald-300"/> Your accounts, your permissions</div><div className="flex items-center gap-3"><Cloud size={16} className="text-violet-300"/> One workspace for every drive</div></div></div>
        <p className="text-[10px] text-slate-600">CloudVault · Secure cloud workspace</p>
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full border border-violet-300/10"/><div className="absolute -bottom-16 -right-16 h-56 w-56 rounded-full border border-violet-300/10"/>
      </section>
      <section className="p-6 sm:p-9">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-xs text-slate-500 transition hover:text-white"><ArrowLeft size={14}/> Back to dashboard</Link>
        <div className="mb-7 md:hidden"><div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-500"><Cloud size={22}/></div><div className="text-lg font-bold">Cloud<span className="text-violet-300">Vault</span></div></div>
        <div className="mb-6"><h2 className="text-2xl font-semibold tracking-tight">{mode === "signin" ? "Welcome back" : "Create your account"}</h2><p className="mt-2 text-xs text-slate-500">{mode === "signin" ? "Sign in to continue to your cloud workspace." : "Start building your unified cloud workspace."}</p></div>
        <div className="mb-5 grid grid-cols-2 rounded-xl bg-white/[.04] p-1"><button onClick={()=>{setMode("signin");setError("");setMessage("");}} className={`rounded-lg py-2.5 text-xs font-semibold transition ${mode==="signin"?"bg-white/[.1] text-white":"text-slate-500"}`}>Sign in</button><button onClick={()=>{setMode("signup");setError("");setMessage("");}} className={`rounded-lg py-2.5 text-xs font-semibold transition ${mode==="signup"?"bg-white/[.1] text-white":"text-slate-500"}`}>Create account</button></div>
        <form onSubmit={submit} className="space-y-4">
          {mode==="signup"&&<label className="block text-xs text-slate-400">Full name<input value={name} onChange={e=>setName(e.target.value)} required placeholder="Your name" className="mt-2 w-full rounded-xl border border-white/[.09] bg-white/[.035] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/60"/></label>}
          <label className="block text-xs text-slate-400">Email address<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@example.com" className="mt-2 w-full rounded-xl border border-white/[.09] bg-white/[.035] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/60"/></label>
          <label className="block text-xs text-slate-400">Password<div className="relative mt-2"><input type={showPassword?"text":"password"} autoComplete={mode==="signin"?"current-password":"new-password"} value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} placeholder="At least 8 characters" className="w-full rounded-xl border border-white/[.09] bg-white/[.035] px-4 py-3 pr-11 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/60"/><button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">{showPassword?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></label>
          {error&&<div role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/[.07] p-3 text-xs leading-relaxed text-rose-200">{error}</div>}
          {message&&<div role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-400/[.07] p-3 text-xs leading-relaxed text-emerald-200">{message}</div>}
          <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 py-3.5 text-xs font-semibold shadow-lg shadow-violet-500/15 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">{busy&&<LoaderCircle size={15} className="animate-spin"/ >}{mode==="signin"?"Sign in to CloudVault":"Create account"}</button>
        </form>
        {mode==="signin"&&<button disabled={busy||!email} onClick={magicLink} className="mt-3 w-full rounded-xl border border-white/[.09] py-3 text-xs font-medium text-slate-300 transition hover:bg-white/[.04] disabled:opacity-40">Send me a magic link</button>}
        <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[.15em] text-slate-600"><span className="h-px flex-1 bg-white/[.07]"/>or continue with<span className="h-px flex-1 bg-white/[.07]"/></div>
        <button onClick={google} disabled={busy} className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/[.1] bg-white/[.025] py-3 text-xs font-medium text-slate-200 transition hover:bg-white/[.06] disabled:opacity-50"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-blue-600">G</span> Continue with Google</button>
        <p className="mt-6 text-center text-[10px] leading-relaxed text-slate-600">By continuing, you agree to use CloudVault in accordance with its terms and privacy policy.</p>
      </section>
    </div>
  </main>;
}
