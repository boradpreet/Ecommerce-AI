"use client";

import React from "react";
import Link from "next/link";
import { MarketingShell, PageHero, CTABand } from "src/components/marketing/marketing-shell";
import { Headphones, Phone, PhoneIncoming, Layers, ArrowRight } from "lucide-react";

const ITEMS = [
  {
    href: "/solutions/support-agents",
    icon: <Headphones className="w-5 h-5" />,
    title: "Support Agents",
    desc: "Resolve inbound support 24/7 in any language, and escalate to a human only when it matters.",
  },
  {
    href: "/solutions/inbound-calls",
    icon: <PhoneIncoming className="w-5 h-5" />,
    title: "Inbound Calls",
    desc: "Point a Plivo or Twilio number at Voqly and an AI agent answers every incoming call, 24/7.",
  },
  {
    href: "/solutions/outbound-sales",
    icon: <Phone className="w-5 h-5" />,
    title: "Outbound Sales",
    desc: "Qualify leads, follow up instantly, and book meetings on autopilot at a scale no team could match.",
  },
  {
    href: "/solutions/campaign-desk",
    icon: <Layers className="w-5 h-5" />,
    title: "Campaign Desk",
    desc: "Build, schedule and track inbound and outbound calling campaigns from one command center.",
  },
];

export default function SolutionsPage() {
  return (
    <MarketingShell>
      <div className="space-y-16">
        <PageHero
          eyebrow="Solutions"
          title="AI calling for every"
          highlight="team"
          subtitle="One platform, four ways to put AI on the phone - support, inbound, outbound sales and full campaigns. Pick where you want to start."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {ITEMS.map((it) => (
            <Link key={it.href} href={it.href} className="group bg-white border border-slate-200/70 rounded-3xl p-8 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.08)] hover:shadow-[0_16px_44px_-12px_rgba(0,0,0,0.14)] hover:-translate-y-1 transition-all flex flex-col">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 mb-6">{it.icon}</div>
              <h3 className="text-lg font-black text-slate-900 mb-2">{it.title}</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed flex-1">{it.desc}</p>
              <span className="mt-6 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-orange-600 group-hover:gap-2.5 transition-all">
                Explore
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          ))}
        </div>

        <CTABand title="Not sure where to start?" subtitle="Talk to our team, or jump in with 100 free AI calls and try any solution." />
      </div>
    </MarketingShell>
  );
}
