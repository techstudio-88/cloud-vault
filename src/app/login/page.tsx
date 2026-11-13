"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Cloud, Eye, EyeOff, ArrowLeft, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  useEffect(() => { if (new URLSearchParams(window.location.search).get("mode") === "signup") setMode("signup"); }, []);
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
        const params = new URLSearchParams(window.location.search);
        const requestedNext = params.get("next");
        const invite = params.get("invite");
        const safeNext = requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/dashboard";
        const next = invite ? "/dashboard?invite=" + encodeURIComponent(invite) : safeNext;
        router.replace(next === "/" ? "/dashboard" : next);
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email, password, options: { data: { display_name: name }, emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(new URLSearchParams(location.search).get("invite") ? "/dashboard?invite=" + new URLSearchParams(location.search).get("invite") : "/dashboard")}` },
        });
        if (error) throw error;
        if (data.session) { router.replace("/dashboard"); router.refresh(); }
        else setMessage("Account created. Check your email to confirm your address, then sign in.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally { setBusy(false); }
  }

  async function magicLink() {
    setBusy(true); setError(""); setMessage("");
    try {
      const { error } = await createClient().auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/auth/callback?next=/dashboard` } });
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

  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f2f5f6] px-4 py-12 text-[#20394b] cv-auth">
    <div className="cv-grid pointer-events-none absolute inset-0 opacity-50"/>
    <div className="absolute -left-32 top-10 h-80 w-80 rounded-full bg-violet-600/15 blur-[100px]"/>
    <div className="absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-blue-600/10 blur-[100px]"/>
    <div className="relative grid w-full max-w-[930px] overflow-hidden rounded-[28px] border border-[#dbe5e9] bg-white/95 shadow-[0_28px_90px_rgba(31,61,79,.14)] md:grid-cols-[.95fr_1.05fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-[#d8e3e8] bg-gradient-to-br from-[#e5eef2] via-[#f8faf9] to-[#dce9ed] p-9 md:flex">
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#315f83] to-[#4d8195]"><Cloud size={22}/></div><span className="text-lg font-bold tracking-tight">Cloud<span className="text-[#426f8d]">Vault</span></span></div>
        <div className="relative z-10"><div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#9db8c5] bg-[#e7eff2] px-3 py-1.5 text-[10px] text-[#426f8d]"><Sparkles size={12}/> YOUR CONNECTED CLOUD WORKSPACE</div><h1 className="max-w-sm text-[38px] font-semibold leading-[1.12] tracking-[-.05em]">Every drive. One workspace. <span className="text-[#426f8d]">More room to work.</span></h1><p className="mt-4 max-w-sm text-sm leading-6 text-[#617684]">Connect multiple Google Drive accounts, see their combined available capacity, and work across them from one organized workspace. Your files remain stored in their original Google accounts.</p><div className="mt-8 grid grid-cols-2 gap-3"><div className="rounded-2xl border border-[#d7e3e8] bg-white/80 p-4 shadow-sm"><div className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#718895]">One workspace</div><div className="mt-2 text-[22px] font-semibold tracking-tight text-[#24465d]">All drives</div><p className="mt-1 text-[10px] leading-5 text-[#718391]">Browse connected accounts without switching tabs.</p></div><div className="rounded-2xl border border-[#d7e3e8] bg-white/80 p-4 shadow-sm"><div className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#718895]">Combined view</div><div className="mt-2 text-[22px] font-semibold tracking-tight text-[#24465d]">Shared total</div><p className="mt-1 text-[10px] leading-5 text-[#718391]">See capacity across each connected account.</p></div></div><div className="mt-5 space-y-3 text-xs text-[#40596a]"><div className="flex items-center gap-3"><ShieldCheck size={16} className="text-[#4f8876]"/> Your accounts, your permissions</div><div className="flex items-center gap-3"><Cloud size={16} className="text-[#426f8d]"/> Your files stay with Google Drive</div><div className="flex items-center gap-3"><Sparkles size={16} className="text-[#426f8d]"/> Upload, search and organize from one place</div></div></div>
        <p className="text-[10px] text-[#82919b]">CloudVault · Secure cloud workspace</p>
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full border border-violet-300/10"/><div className="absolute -bottom-16 -right-16 h-56 w-56 rounded-full border border-violet-300/10"/>
      </section>
      <section className="p-6 sm:p-9">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-xs text-[#718391] transition hover:text-white"><ArrowLeft size={14}/> Back to home</Link>
        <div className="mb-7 md:hidden"><div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#315f83] to-[#4d8195]"><Cloud size={22}/></div><div className="text-lg font-bold">Cloud<span className="text-[#426f8d]">Vault</span></div></div>
        <div className="mb-6"><h2 className="text-2xl font-semibold tracking-tight">{mode === "signin" ? "Welcome back" : "Create your account"}</h2><p className="mt-2 text-xs text-[#718391]">{mode === "signin" ? "Sign in to continue to your cloud workspace." : "Start building your unified cloud workspace."}</p></div>
        <div className="mb-5 grid grid-cols-2 rounded-xl bg-[#edf2f4] p-1"><button onClick={()=>{setMode("signin");setError("");setMessage("");}} className={`rounded-lg py-2.5 text-xs font-semibold transition ${mode==="signin"?"bg-[#dce8ed] text-white":"text-[#718391]"}`}>Sign in</button><button onClick={()=>{setMode("signup");setError("");setMessage("");}} className={`rounded-lg py-2.5 text-xs font-semibold transition ${mode==="signup"?"bg-[#dce8ed] text-white":"text-[#718391]"}`}>Create account</button></div>
        <form onSubmit={submit} className="space-y-4">
          {mode==="signup"&&<label className="block text-xs text-[#617684]">Full name<input value={name} onChange={e=>setName(e.target.value)} required placeholder="Your name" className="mt-2 w-full rounded-xl border border-[#dce5e9] bg-[#f7f9fa] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#82919b] focus:border-[#6d99ad]"/></label>}
          <label className="block text-xs text-[#617684]">Email address<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@example.com" className="mt-2 w-full rounded-xl border border-[#dce5e9] bg-[#f7f9fa] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#82919b] focus:border-[#6d99ad]"/></label>
          <label className="block text-xs text-[#617684]">Password<div className="relative mt-2"><input type={showPassword?"text":"password"} autoComplete={mode==="signin"?"current-password":"new-password"} value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} placeholder="At least 8 characters" className="w-full rounded-xl border border-[#dce5e9] bg-[#f7f9fa] px-4 py-3 pr-11 text-sm text-white outline-none transition placeholder:text-[#82919b] focus:border-[#6d99ad]"/><button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#718391]">{showPassword?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></label>
          {error&&<div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-relaxed text-rose-700">{error}</div>}
          {message&&<div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-700">{message}</div>}
          <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#315f83] to-[#4d8195] py-3.5 text-xs font-semibold shadow-lg shadow-violet-500/15 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">{busy&&<LoaderCircle size={15} className="animate-spin"/>}{mode==="signin"?"Sign in to CloudVault":"Create account"}</button>
        </form>
        {mode==="signin"&&<button disabled={busy||!email} onClick={magicLink} className="mt-3 w-full rounded-xl border border-[#dce5e9] py-3 text-xs font-medium text-[#40596a] transition hover:bg-[#edf2f4] disabled:opacity-40">Send me a magic link</button>}
        <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[.15em] text-[#82919b]"><span className="h-px flex-1 bg-white/[.07]"/>or continue with<span className="h-px flex-1 bg-white/[.07]"/></div>
        <button onClick={google} disabled={busy} className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#dce5e9] bg-white/[.025] py-3 text-xs font-medium text-slate-200 transition hover:bg-[#edf3f5] disabled:opacity-50"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-blue-600">G</span> Continue with Google</button>
        <div className="mt-6 grid grid-cols-2 gap-2"><div className="rounded-xl border border-[#e2e9ec] bg-[#f8fafb] p-3"><ShieldCheck size={15} className="mb-2 text-[#4f8876]"/><b className="block text-[10px] text-[#36566b]">Privacy-aware</b><span className="mt-1 block text-[9px] leading-4 text-[#82919b]">Provider permissions stay in control.</span></div><div className="rounded-xl border border-[#e2e9ec] bg-[#f8fafb] p-3"><Cloud size={15} className="mb-2 text-[#426f8d]"/><b className="block text-[10px] text-[#36566b]">Built for multiple drives</b><span className="mt-1 block text-[9px] leading-4 text-[#82919b]">Manage connected storage together.</span></div></div><p className="mt-5 text-center text-[10px] leading-relaxed text-[#82919b]">By continuing, you agree to use CloudVault in accordance with its terms and privacy policy.</p>
      </section>
    </div>
  </main>;
}
