"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { MarketingShell, PageHero, CTABand } from "src/components/marketing/marketing-shell";
import { Check } from "lucide-react";

const TIERS = [
  {
    name: "Starter",
    price: "$0",
    period: "forever",
    desc: "Kick the tires with real AI calls.",
    cta: "Start free",
    features: ["100 free AI calls", "1 AI agent", "Standard voices", "Basic analytics", "Email support"],
    highlight: false,
  },
  {
    name: "Growth",
    price: "$49",
    period: "/ month",
    desc: "For teams running real campaigns.",
    cta: "Start Growth",
    features: ["2,000 call minutes / mo", "5 AI agents", "All neural voices", "Campaign Desk", "Live analytics", "CRM sync"],
    highlight: true,
  },
  {
    name: "Scale",
    price: "$199",
    period: "/ month",
    desc: "High-volume calling with controls.",
    cta: "Start Scale",
    features: ["10,000 call minutes / mo", "Unlimited agents", "Priority routing", "Compliance Core", "API access", "Priority support"],
    highlight: false,
  },
];

const FAQ = [
  { q: "How does the free plan work?", a: "Create an account and get 100 free AI calls instantly - no credit card required. Upgrade only when you need more volume or features." },
  { q: "What counts as a call minute?", a: "Connected talk time, billed per second and rounded up. Ringing and unanswered calls are free." },
  { q: "Can I bring my own phone numbers?", a: "Yes. Use Voqly-provisioned local numbers or connect your own SIP trunks and carrier numbers." },
  { q: "Is there a contract?", a: "No. Monthly plans are pay-as-you-go and you can upgrade, downgrade or cancel any time." },
];

export default function PricingPage() {
  const router = useRouter();
  return (
    <MarketingShell>
      <div className="space-y-20">
        <PageHero
          eyebrow="Pricing"
          title="Simple pricing that"
          highlight="scales"
          subtitle="Start free with 100 AI calls. Upgrade when you're ready - no contracts, no setup fees, cancel any time."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {TIERS.map((t) => (
            <div key={t.name} className={`relative rounded-3xl p-8 flex flex-col ${t.highlight ? "bg-slate-950 text-white shadow-2xl md:-translate-y-3 border border-slate-800" : "bg-white text-slate-900 border border-slate-200/70 shadow-sm"}`}>
              {t.highlight && (
                <span className="absolute top-5 right-5 text-[9px] font-black uppercase tracking-widest bg-orange-500 text-white px-2.5 py-1 rounded-full">Popular</span>
              )}
              <h3 className={`text-sm font-black uppercase tracking-widest ${t.highlight ? "text-orange-400" : "text-slate-400"}`}>{t.name}</h3>
              <div className="mt-4 flex items-end gap-1.5">
                <span className="text-5xl font-black tracking-tight">{t.price}</span>
                <span className={`text-xs font-bold pb-2 ${t.highlight ? "text-slate-400" : "text-slate-400"}`}>{t.period}</span>
              </div>
              <p className={`mt-2 text-sm font-medium ${t.highlight ? "text-slate-300" : "text-slate-500"}`}>{t.desc}</p>
              <ul className="mt-6 space-y-3 flex-1">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm font-semibold">
                    <Check className={`w-4 h-4 mt-0.5 shrink-0 ${t.highlight ? "text-orange-400" : "text-emerald-500"}`} />
                    <span className={t.highlight ? "text-slate-200" : "text-slate-700"}>{f}</span>
                  </li>
                ))}
              </ul>
              <button onClick={() => router.push("/login")} className={`mt-8 h-11 rounded-full text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer ${t.highlight ? "bg-white text-slate-900 hover:bg-slate-100" : "bg-black text-white hover:bg-slate-800"}`}>{t.cta}</button>
            </div>
          ))}
        </div>

        <div className="max-w-3xl mx-auto bg-white border border-slate-200/70 rounded-3xl p-8 md:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="space-y-1.5 text-center sm:text-left">
            <h3 className="text-xl font-black text-slate-900">Enterprise</h3>
            <p className="text-sm text-slate-500 font-medium">Custom volume, dedicated numbers, SSO, SLAs and white-glove onboarding.</p>
          </div>
          <button onClick={() => router.push("/contact")} className="h-11 px-7 bg-black text-white text-xs font-black rounded-full uppercase tracking-wider hover:bg-slate-800 transition-all active:scale-95 cursor-pointer shrink-0">Contact sales</button>
        </div>

        <div className="max-w-3xl mx-auto w-full space-y-4">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight text-center mb-8">Frequently asked questions</h2>
          {FAQ.map((item) => (
            <div key={item.q} className="bg-white border border-slate-200/70 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 mb-1.5">{item.q}</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>

        <CTABand title="Ready to make your first AI call?" subtitle="Start free with 100 AI calls - upgrade only when you need more." />
      </div>
    </MarketingShell>
  );
}
