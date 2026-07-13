"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu, X, ChevronDown, ArrowRight, Check, Phone,
} from "lucide-react";
import { SiteFooter } from "./site-footer";

export const SOLUTIONS = [
  { label: "Support Agents", href: "/solutions/support-agents", desc: "Always-on inbound support" },
  { label: "Inbound Calls", href: "/solutions/inbound-calls", desc: "Answer incoming calls 24/7" },
  { label: "Outbound Sales", href: "/solutions/outbound-sales", desc: "Autonomous dialing at scale" },
  { label: "Campaign Desk", href: "/solutions/campaign-desk", desc: "Launch & track campaigns" },
];

/* ------------------------------------------------------------------ */
/* Shell: floating header + page body + footer                         */
/* ------------------------------------------------------------------ */
export function MarketingShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);

  return (
    <div className="w-full min-h-screen text-slate-800 font-sans relative overflow-x-hidden bg-[#faf9f5]">
      {/* Sunset stripes backdrop */}
      <div className="absolute top-0 inset-x-0 h-[420px] flex pointer-events-none -z-10 overflow-hidden justify-center">
        {Array.from({ length: 24 }).map((_, i) => {
          const d = Math.abs(i - 12);
          const opacity = Math.max(0, 1 - d * 0.08);
          return (
            <div key={i} className="flex-1 h-full min-w-[20px] md:min-w-[45px]"
              style={{ background: `linear-gradient(to bottom, rgba(249,115,22,${opacity * 0.5}) 0%, rgba(251,146,60,${opacity * 0.22}) 45%, transparent 100%)` }} />
          );
        })}
      </div>

      {/* Floating capsule header */}
      <header className="fixed top-6 left-6 right-6 h-[4.4rem] bg-white/70 backdrop-blur-xl border border-white/30 rounded-full flex items-center justify-between px-8 z-50 max-w-7xl mx-auto shadow-[0_8px_32px_-4px_rgba(0,0,0,0.06)] select-none">
        <div className="flex items-center space-x-12">
          <Link href="/" className="flex items-center space-x-1.5 hover:opacity-90 transition-opacity">
            <span className="text-base font-extrabold tracking-wider text-slate-800 lowercase">voqly</span>
            <div className="px-2 py-0.5 rounded-lg bg-black flex items-center justify-center text-white font-black text-[9px] uppercase tracking-wider">AI</div>
          </Link>

          <nav className="hidden md:flex items-center space-x-6 text-xs font-bold text-slate-500">
            <Link href="/" className="hover:text-slate-900 transition-colors py-1">Home</Link>

            <div
              className="relative py-1"
              onMouseEnter={() => setSolutionsOpen(true)}
              onMouseLeave={() => setSolutionsOpen(false)}
            >
              <Link href="/solutions" onClick={() => setSolutionsOpen(false)} className="hover:text-slate-900 transition-colors flex items-center gap-1 cursor-pointer">
                <span>Solutions</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${solutionsOpen ? "rotate-180" : ""}`} />
              </Link>
              {/* pt-2.5 is a transparent hover bridge over the gap so the menu stays open while moving the cursor onto it */}
              <div className={`absolute top-full left-1/2 -translate-x-1/2 pt-2.5 w-56 transition-all duration-200 origin-top z-[55] ${solutionsOpen ? "opacity-100 pointer-events-auto scale-100" : "opacity-0 pointer-events-none scale-95"}`}>
                <div className="bg-white border border-slate-100 rounded-2xl shadow-xl p-2 flex flex-col gap-1">
                  {SOLUTIONS.map((s) => (
                    <Link key={s.href} href={s.href} onClick={() => setSolutionsOpen(false)} className="hover:bg-slate-50 text-slate-700 hover:text-slate-900 py-2 px-3 rounded-xl transition-all">
                      <span className="block font-bold">{s.label}</span>
                      <span className="block text-[10px] text-slate-400 font-semibold">{s.desc}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <Link href="/industries" className="hover:text-slate-900 transition-colors py-1">Industries</Link>
            <Link href="/pricing" className="hover:text-slate-900 transition-colors py-1">Pricing</Link>
            <Link href="/contact" className="hover:text-slate-900 transition-colors py-1">Contact Us</Link>
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          <button onClick={() => router.push("/login")} className="hidden sm:flex text-xs font-bold text-slate-600 hover:text-slate-950 transition-colors cursor-pointer">Login</button>
          <button onClick={() => router.push("/login")} className="hidden sm:flex h-10 px-5 items-center justify-center text-[10px] font-extrabold text-white bg-black hover:bg-slate-800 rounded-full transition-all active:scale-95 cursor-pointer uppercase tracking-wider">Get Free Calls</button>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-slate-600 hover:text-slate-950 bg-white border border-slate-200 rounded-full cursor-pointer">
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-[#FAF9F5] pt-28 px-6 flex flex-col gap-3 overflow-y-auto pb-10">
          <Link href="/" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold text-slate-700 py-2 border-b border-slate-200">Home</Link>
          <Link href="/solutions" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold text-slate-700 py-2 border-b border-slate-200">Solutions</Link>
          {SOLUTIONS.map((s) => (
            <Link key={s.href} href={s.href} onClick={() => setMobileMenuOpen(false)} className="text-xs font-bold text-slate-500 py-1.5 pl-3">{s.label}</Link>
          ))}
          <Link href="/industries" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold text-slate-700 py-2 border-b border-slate-200">Industries</Link>
          <Link href="/pricing" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold text-slate-700 py-2 border-b border-slate-200">Pricing</Link>
          <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold text-slate-700 py-2 border-b border-slate-200">Contact Us</Link>
          <button onClick={() => { setMobileMenuOpen(false); router.push("/login"); }} className="w-full h-11 bg-black text-white font-bold rounded-full text-xs mt-4 uppercase tracking-wider">Get Free Calls</button>
        </div>
      )}

      {/* Page body */}
      <main className="relative z-10 pt-36 pb-24 px-6 max-w-7xl mx-auto w-full">
        {children}
      </main>

      <SiteFooter />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Reusable sections                                                   */
/* ------------------------------------------------------------------ */
export function PageHero({ eyebrow, title, highlight, subtitle }: {
  eyebrow: string; title: string; highlight?: string; subtitle: string;
}) {
  return (
    <div className="max-w-3xl mx-auto text-center space-y-6">
      <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200/50 text-[10px] md:text-xs font-black uppercase tracking-wider text-orange-650">
        <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping shrink-0" />
        {eyebrow}
      </span>
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 leading-[1.08] tracking-tight">
        {title}{highlight ? <> <span className="font-serif italic text-orange-600">{highlight}</span></> : null}
      </h1>
      <p className="text-sm sm:text-base text-slate-500 leading-relaxed max-w-xl mx-auto font-semibold">{subtitle}</p>
    </div>
  );
}

export function FeatureGrid({ items }: { items: { icon: React.ReactNode; title: string; desc: string }[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {items.map((f, i) => (
        <div key={i} className="bg-white border border-slate-200/70 rounded-3xl p-7 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all">
          <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 mb-5">{f.icon}</div>
          <h3 className="text-base font-black text-slate-900 mb-2">{f.title}</h3>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">{f.desc}</p>
        </div>
      ))}
    </div>
  );
}

export function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((t, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <Check className="w-3 h-3" />
          </span>
          <span className="text-sm text-slate-700 font-semibold leading-relaxed">{t}</span>
        </li>
      ))}
    </ul>
  );
}

export function CTABand({ title, subtitle }: { title: string; subtitle: string }) {
  const router = useRouter();
  return (
    <div className="relative overflow-hidden rounded-[36px] bg-slate-950 px-8 py-16 text-center">
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[520px] h-[280px] bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10 max-w-2xl mx-auto space-y-5">
        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">{title}</h2>
        <p className="text-sm text-slate-300 font-medium max-w-lg mx-auto">{subtitle}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button onClick={() => router.push("/login")} className="h-12 px-8 bg-white hover:bg-slate-100 text-slate-900 text-xs font-black rounded-full flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer uppercase tracking-wider">
            <Phone className="w-3.5 h-3.5 fill-current text-orange-500 shrink-0" />
            Start with 100 minutes free AI calls
          </button>
          <button onClick={() => router.push("/contact")} className="h-12 px-8 bg-white/10 hover:bg-white/20 text-white text-xs font-black rounded-full flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer uppercase tracking-wider border border-white/15">
            Talk to sales
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
}

