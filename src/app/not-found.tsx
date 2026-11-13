import Link from "next/link";
import { Cloud, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return <main className="flex min-h-screen items-center justify-center bg-[#08090f] px-6 text-white"><div className="text-center"><div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500"><Cloud size={26}/></div><div className="text-xs font-semibold uppercase tracking-[.25em] text-violet-300">404 · Lost in the cloud</div><h1 className="mt-4 text-4xl font-semibold tracking-tight">This page drifted away.</h1><p className="mt-3 text-sm text-slate-500">The page you're looking for doesn't exist or has moved.</p><Link href="/" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-3 text-xs font-semibold"><ArrowLeft size={14}/> Back to CloudVault</Link></div></main>;
}
