"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, ChevronDown, Cloud, Database, Files, FolderSync, Gauge, Globe2, Layers3, LockKeyhole, Menu, Play, Search, ShieldCheck, Sparkles, Zap, X, ArrowLeftRight, ScanSearch, UploadCloud, ChartNoAxesCombined, Users } from "lucide-react";

const featureItems = [
  [Layers3, "One calm workspace", "Bring connected Google Drive accounts into one clear, searchable workspace."],
  [FolderSync, "Move files with less friction", "Upload, organize, download and transfer files without switching between account tabs."],
  [Zap, "Smarter file workflows", "Route uploads, spot duplicates and build repeatable storage routines."],
  [Gauge, "Know where your space goes", "See storage usage across connected accounts and make informed decisions."],
  [Globe2, "Work together", "Invite teammates and manage workspace roles from one place."],
  [ShieldCheck, "Stay in control", "Your files remain with Google Drive. CloudVault works through the permissions you grant."]
] as const;
const steps = [["01","Create your workspace","Sign in securely and open your personal CloudVault workspace."],["02","Connect Google Drive","Choose the Google account you want to bring into your workspace."],["03","Work from one view","Browse, organize, transfer and manage files with a clearer workflow."]] as const;
const faqs = [
 ["Does CloudVault store my files?","Your files stay in your connected Google Drive accounts. CloudVault stores workspace and file metadata needed to power the experience, and uses the Google permissions you authorize."],
 ["Can I connect more than one Google account?","Yes. CloudVault is designed to bring multiple connected Google Drive accounts into one workspace."],
 ["Do I need to install anything?","No. CloudVault runs in your browser and is designed to work across desktop, tablet and mobile screens."],
 ["Can I invite teammates?","Yes. The workspace includes team invitations and role management."]
] as const;

export default function LandingPage() {
 const [menuOpen,setMenuOpen]=useState(false);
 const [openFaq,setOpenFaq]=useState<number|null>(0);
 return <main className="cv-landing min-h-screen overflow-hidden bg-[#080a12] text-white">
  <div className="cv-ambient cv-ambient-one"/><div className="cv-ambient cv-ambient-two"/>
  <header className="cv-landing-nav">
   <Link href="/" className="cv-brand"><span className="cv-brand-mark"><Cloud size={19}/></span><span>Cloud<span>Vault</span></span></Link>
   <nav className="cv-desktop-links"><a href="#features">Features</a><a href="#how-it-works">How it works</a><a href="#security">Security</a><a href="#faq">FAQ</a></nav>
   <div className="cv-nav-actions"><Link href="/login" className="cv-nav-signin">Sign in</Link><Link href="/login?mode=signup" className="cv-nav-cta">Get started <ArrowUpRight size={14}/></Link></div>
   <button className="cv-mobile-menu" onClick={()=>setMenuOpen(v=>!v)} aria-label="Toggle navigation">{menuOpen?<X size={20}/>:<Menu size={20}/>}</button>
  </header>
  {menuOpen&&<nav className="cv-mobile-links"><a href="#features" onClick={()=>setMenuOpen(false)}>Features</a><a href="#how-it-works" onClick={()=>setMenuOpen(false)}>How it works</a><a href="#security" onClick={()=>setMenuOpen(false)}>Security</a><a href="#faq" onClick={()=>setMenuOpen(false)}>FAQ</a><Link href="/login">Sign in</Link></nav>}
  <section className="cv-hero">
   <div className="cv-hero-copy">
    <div className="cv-eyebrow"><span className="cv-live-dot"/> YOUR CLOUD. FINALLY IN SYNC.</div>
    <h1>All your cloud files.<br/><span className="cv-gradient-text">One clear view.</span></h1>
    <p className="cv-hero-lede">A smarter workspace for your Google Drive accounts. Find files faster, move them with ease, and bring your storage workflow together.</p>
    <div className="cv-hero-actions"><Link href="/login?mode=signup" className="cv-button-primary">Get started <ArrowRight size={16}/></Link><a href="#how-it-works" className="cv-button-quiet"><span className="cv-play"><Play size={11} fill="currentColor"/></span> See how it works</a></div>
    <div className="cv-proof-row"><span className="cv-proof-icon"><ShieldCheck size={15}/></span><span>Your files stay in Google Drive</span><i/><span>No app install required</span></div>
   </div>
   <div className="cv-hero-visual">
    <div className="cv-orbit cv-orbit-a"/><div className="cv-orbit cv-orbit-b"/>
    <div className="cv-float-tag cv-tag-top"><span className="cv-tag-dot"/> Workspace synced</div>
    <div className="cv-product-window">
     <div className="cv-window-top"><div className="flex items-center gap-2"><span className="cv-mini-brand"><Cloud size={12}/></span><b>CloudVault</b><span className="cv-window-workspace">/ Workspace</span></div><div className="flex gap-1.5"><i/><i/><i/></div></div>
     <div className="cv-window-body">
      <aside className="cv-window-sidebar"><div className="cv-window-side-active"><Layers3 size={13}/> Overview</div><div><Files size={13}/> My cloud</div><div><Database size={13}/> Accounts</div><div><Zap size={13}/> Automations</div><div><LockKeyhole size={13}/> Security</div><div className="cv-window-side-bottom"><span className="cv-avatar-dot"/> Personal workspace</div></aside>
      <div className="cv-window-content">
       <div className="cv-window-heading"><div><small>YOUR WORKSPACE</small><h3>Your cloud at a glance</h3></div><span className="cv-window-avatar">C</span></div>
       <div className="cv-window-metrics"><div><small>CONNECTED ACCOUNTS</small><strong>03</strong><span>One workspace</span></div><div><small>FILES ORGANIZED</small><strong>1,284</strong><span className="cv-green">At a glance</span></div></div>
       <div className="cv-window-files-head"><b>Recent files</b><span>View all <ArrowUpRight size={10}/></span></div>
       <div className="cv-file-preview"><span className="cv-file-symbol cv-file-purple"><Files size={14}/></span><div><b>Brand assets</b><small>Google Drive · Folder</small></div><span className="cv-file-date">Just now</span></div>
       <div className="cv-file-preview"><span className="cv-file-symbol cv-file-blue"><Database size={14}/></span><div><b>Project overview.pdf</b><small>Google Drive · PDF</small></div><span className="cv-file-date">2 hours ago</span></div>
       <div className="cv-file-preview"><span className="cv-file-symbol cv-file-green"><Files size={14}/></span><div><b>Q4 reports</b><small>Google Drive · Folder</small></div><span className="cv-file-date">Yesterday</span></div>
       <div className="cv-window-storage"><div><span>Combined storage</span><b>Workspace view</b></div><div className="cv-storage-track"><i/></div><small>Usage across connected accounts</small></div>
      </div>
     </div>
    </div>
    <div className="cv-fly-card cv-fly-left"><span className="cv-fly-icon"><FolderSync size={16}/></span><div><b>Files, together</b><small>One organized view</small></div><Check size={14} className="text-emerald-300"/></div>
    <div className="cv-fly-card cv-fly-right"><span className="cv-fly-icon blue"><Sparkles size={16}/></span><div><b>Less switching</b><small>More getting done</small></div></div>
    <div className="cv-float-tag cv-tag-bottom"><Sparkles size={13}/> Smart workflows</div>
   </div>
  </section>
  <section className="cv-strip"><div className="cv-strip-inner"><span>BUILT FOR A BETTER FILE WORKFLOW</span><b><Cloud size={16}/> Connected drives</b><b><Search size={16}/> Find things faster</b><b><FolderSync size={16}/> Move with ease</b><b><LockKeyhole size={16}/> Your permissions</b></div></section>
  <section className="cv-capacity-section">
   <div className="cv-capacity-copy">
    <div className="cv-section-kicker">MULTIPLE ACCOUNTS. ONE WORKSPACE.</div>
    <h2>Your storage setup,<br/><span className="cv-gradient-text">working together.</span></h2>
    <p>Connect the Google Drive accounts you already use. CloudVault gives you one place to browse them, understand their available space and choose where your files belong.</p>
    <div className="cv-capacity-points"><span><Check size={14}/> See accounts side by side</span><span><Check size={14}/> Check available space at a glance</span><span><Check size={14}/> Keep each Google account in your control</span></div>
    <Link href="/login?mode=signup" className="cv-inline-link">Bring your accounts together <ArrowRight size={15}/></Link>
   </div>
   <div className="cv-capacity-visual">
    <div className="cv-capacity-orb"/>
    <div className="cv-capacity-card">
     <div className="cv-capacity-card-head"><div><small>YOUR CONNECTED ACCOUNTS</small><b>Storage overview</b></div><span><span/> LIVE VIEW</span></div>
     <div className="cv-account-row"><span className="cv-account-logo">G</span><div><b>Personal Drive</b><small>Google account 01</small></div><div className="cv-account-meter"><i style={{width:"42%"}}/></div><strong>42%</strong></div>
     <div className="cv-account-row"><span className="cv-account-logo">G</span><div><b>Work Drive</b><small>Google account 02</small></div><div className="cv-account-meter"><i style={{width:"68%"}}/></div><strong>68%</strong></div>
     <div className="cv-account-row"><span className="cv-account-logo">G</span><div><b>Archive Drive</b><small>Google account 03</small></div><div className="cv-account-meter"><i style={{width:"24%"}}/></div><strong>24%</strong></div>
     <div className="cv-capacity-summary"><span className="cv-capacity-summary-icon"><ChartNoAxesCombined size={17}/></span><div><small>YOUR STORAGE, AT A GLANCE</small><b>One combined overview</b></div><span className="cv-summary-check"><Check size={14}/></span></div>
    </div>
    <div className="cv-capacity-float"><Layers3 size={15}/> Multiple drives, one view</div>
   </div>
   <p className="cv-capacity-footnote">Storage quotas remain separate in each Google account. CloudVault provides a combined view; it does not merge Google's individual quotas into one Google Drive quota. Available space depends on each account's plan and usage.</p>
  </section>
  <section id="features" className="cv-section">
   <div className="cv-section-kicker">A BETTER WAY TO WORK</div><div className="cv-section-heading"><h2>Everything connected.<br/><span className="cv-muted-gradient">Nothing complicated.</span></h2><p>CloudVault brings the everyday parts of managing cloud storage into one focused workspace—without getting in your way.</p></div>
   <div className="cv-feature-grid">{featureItems.map(([I,title,desc],i)=><article className="cv-feature-card" key={title} style={{animationDelay:(i*70)+"ms"}}><span className="cv-feature-icon"><I size={19}/></span><h3>{title}</h3><p>{desc}</p><span className="cv-feature-index">0{i+1}</span></article>)}</div>
  </section>
  <section id="how-it-works" className="cv-how-section">
   <div className="cv-how-visual"><div className="cv-how-glow"/><div className="cv-how-card"><div className="cv-how-top"><span className="cv-mini-brand"><Cloud size={12}/></span><b>CloudVault setup</b><span className="cv-setup-status"><Check size={11}/> Ready</span></div><div className="cv-connect-flow"><div className="cv-google-g">G</div><div className="cv-flow-line"><i/></div><div className="cv-cloud-target"><Cloud size={23}/></div></div><div className="cv-connect-title">Your workspace, connected</div><p>One simple place to manage your files.</p><div className="cv-connect-progress"><i/></div><div className="cv-connect-foot"><span>Secure connection</span><span><LockKeyhole size={11}/> Protected</span></div></div><div className="cv-how-floating"><Zap size={14}/> Simple by design</div></div>
   <div className="cv-how-copy"><div className="cv-section-kicker">GET STARTED IN MINUTES</div><h2>Three steps.<br/><span className="cv-gradient-text">One better workflow.</span></h2><p className="cv-how-intro">No complicated setup. Just connect the account you already use and start working from one place.</p><div className="cv-steps">{steps.map(([n,t,d])=><div className="cv-step" key={n}><span>{n}</span><div><h3>{t}</h3><p>{d}</p></div></div>)}</div><Link href="/login?mode=signup" className="cv-inline-link">Create your workspace <ArrowRight size={15}/></Link></div>
  </section>
  <section className="cv-workflows-section">
   <div className="cv-workflows-heading"><div><div className="cv-section-kicker">LESS TAB-HOPPING. MORE FLOW.</div><h2>Small tasks feel easier<br/><span className="cv-gradient-text">when everything connects.</span></h2></div><p>Move through your everyday file tasks from one workspace, with a clear view of where things are stored.</p></div>
   <div className="cv-workflow-grid">
    <article className="cv-workflow-card"><span className="cv-workflow-icon"><ScanSearch size={20}/></span><small>01 / FIND</small><h3>Search across your workspace</h3><p>Spend less time remembering which Google account holds a file.</p><div className="cv-search-demo"><Search size={13}/><span>Search files and folders...</span><kbd>⌘ K</kbd></div></article>
    <article className="cv-workflow-card"><span className="cv-workflow-icon"><ArrowLeftRight size={20}/></span><small>02 / ORGANIZE</small><h3>Move files between accounts</h3><p>Keep your files organized across the connected drives you choose.</p><div className="cv-transfer-demo"><span><Cloud size={14}/> Drive 01</span><ArrowRight size={16}/><span><Cloud size={14}/> Drive 02</span></div></article>
    <article className="cv-workflow-card"><span className="cv-workflow-icon"><UploadCloud size={20}/></span><small>03 / UPLOAD</small><h3>Choose where uploads go</h3><p>Pick the destination account that makes sense for your storage setup.</p><div className="cv-upload-demo"><span><UploadCloud size={15}/> project-files.zip</span><span className="cv-upload-ready"><Check size={12}/> Destination selected</span></div></article>
    <article className="cv-workflow-card"><span className="cv-workflow-icon"><Users size={20}/></span><small>04 / COLLABORATE</small><h3>Keep your workspace in order</h3><p>Give your team a consistent place to work with connected cloud files.</p><div className="cv-team-demo"><i>Y</i><i>A</i><i>M</i><span>Workspace members</span></div></article>
   </div>
  </section>
  <section id="security" className="cv-security-section"><div className="cv-security-icon"><ShieldCheck size={25}/></div><div><div className="cv-section-kicker">YOUR DATA. YOUR CONTROL.</div><h2>Designed to work with the permissions you choose.</h2><p>CloudVault connects to Google Drive using the access you authorize. Your original files remain in your Google account, and you can manage connected accounts from your workspace.</p></div><div className="cv-security-points"><div><Check size={15}/> Google sign-in</div><div><Check size={15}/> Permission-based access</div><div><Check size={15}/> Files remain in Drive</div></div></section>
  <section id="faq" className="cv-faq-section"><div className="cv-section-kicker">GOOD TO KNOW</div><div className="cv-faq-layout"><div><h2>Questions?<br/><span className="cv-gradient-text">We've got clarity.</span></h2><p>Everything you need to know before creating your workspace.</p></div><div className="cv-faq-list">{faqs.map(([q,a],i)=><div className={"cv-faq-item "+(openFaq===i?"open":"")} key={q}><button onClick={()=>setOpenFaq(openFaq===i?null:i)} aria-expanded={openFaq===i}><span>{q}</span><ChevronDown size={17}/></button>{openFaq===i&&<p>{a}</p>}</div>)}</div></div></section>
  <section className="cv-final-cta"><div className="cv-cta-orb"/><div className="cv-section-kicker">MAKE SPACE FOR BETTER WORK</div><h2>Your cloud deserves<br/><span className="cv-gradient-text">a clearer home.</span></h2><p>Bring your connected Google Drive accounts into one focused workspace.</p><Link href="/login?mode=signup" className="cv-button-primary">Start with CloudVault <ArrowRight size={16}/></Link><div className="cv-cta-note"><ShieldCheck size={13}/> Secure sign-in · Browser-based · Your files stay in Drive</div></section>
  <footer className="cv-footer"><Link href="/" className="cv-brand"><span className="cv-brand-mark"><Cloud size={17}/></span><span>Cloud<span>Vault</span></span></Link><span>© {new Date().getFullYear()} CloudVault. A clearer way to manage your cloud.</span><div><Link href="/login">Sign in</Link><Link href="/admin">Owner access</Link><a href="#features">Features</a><a href="#faq">FAQ</a></div></footer>
 </main>;
}
