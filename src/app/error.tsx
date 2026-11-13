"use client";

import { useEffect } from "react";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("CloudVault route error", error); }, [error]);
  return (
    <main className="grid min-h-screen place-items-center bg-[#090b12] px-6 text-white">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#151827] p-7 text-center shadow-2xl">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-rose-400/10 text-xl text-rose-300">!</div>
        <h1 className="mt-5 text-xl font-semibold">This page hit an unexpected error</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">Your CloudVault data has not been intentionally changed. Try loading this page again.</p>
        {error.digest ? <p className="mt-3 text-xs text-slate-600">Reference: {error.digest}</p> : null}
        <button onClick={() => reset()} className="mt-6 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500">Try again</button>
        <a href="/" className="ml-3 inline-block text-sm text-violet-300 hover:text-violet-200">Return to workspace</a>
      </section>
    </main>
  );
}
