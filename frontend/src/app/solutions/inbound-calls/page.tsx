"use client";

import React from "react";
import { MarketingShell, PageHero, FeatureGrid, CheckList, CTABand } from "src/components/marketing/marketing-shell";
import { PhoneIncoming, Clock, Globe, Share2, ShieldCheck, Voicemail } from "lucide-react";

export default function InboundCallsPage() {
  return (
    <MarketingShell>
      <div className="space-y-20">
        <PageHero
          eyebrow="Solutions / Inbound Calls"
          title="Answer every incoming call with"
          highlight="an AI agent"
          subtitle="Point a Plivo or Twilio number at Voqly and an AI agent picks up instantly, understands why the caller is ringing, and handles it end to end — 24/7, in any language."
        />

        <FeatureGrid items={[
          { icon: <PhoneIncoming className="w-5 h-5" />, title: "Instant pickup", desc: "Every inbound call is answered in milliseconds — no IVR menus, no hold music, no missed calls." },
          { icon: <Clock className="w-5 h-5" />, title: "24/7, always on", desc: "Inbound agents run around the clock, so nights, weekends and spikes are covered automatically." },
          { icon: <Share2 className="w-5 h-5" />, title: "Number-based routing", desc: "Each inbound number maps to a vendor and its answering agent, so callers always reach the right team." },
          { icon: <Globe className="w-5 h-5" />, title: "Multilingual", desc: "Greet and assist callers in 10+ languages, automatically matching the caller's language." },
          { icon: <ShieldCheck className="w-5 h-5" />, title: "Plivo & Twilio", desc: "Bring your own numbers on either carrier — Voqly auto-registers the answer webhook on assignment." },
          { icon: <Voicemail className="w-5 h-5" />, title: "Capture & follow-up", desc: "Log every call with transcript and interest score, and auto-send details to the caller on WhatsApp + email." },
        ]} />

        <section className="grid md:grid-cols-2 gap-10 items-center bg-white border border-slate-200/70 rounded-3xl p-8 md:p-12 shadow-sm">
          <div className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">From missed calls to booked business</h2>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">Turn on inbound in the campaign builder, assign a number, and your agent starts answering — no engineering, live in minutes.</p>
          </div>
          <CheckList items={[
            "Assign existing Plivo or Twilio numbers to an agent",
            "Auto-registered answer webhooks — zero telephony config",
            "Direction-aware inbound prompts, editable per agent",
            "Live transcripts, sentiment and interest scoring",
            "Seamless human escalation with full call context",
          ]} />
        </section>

        <CTABand title="Never miss an inbound call again" subtitle="Start free with 100 AI calls — no credit card, no setup fees." />
      </div>
    </MarketingShell>
  );
}
