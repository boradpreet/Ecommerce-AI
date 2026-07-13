"use client";

import React from "react";
import { MarketingShell, PageHero, FeatureGrid, CheckList, CTABand } from "src/components/marketing/marketing-shell";
import { Headphones, Clock, Globe, Share2, BookOpen, MessageSquare } from "lucide-react";

export default function SupportAgentsPage() {
  return (
    <MarketingShell>
      <div className="space-y-20">
        <PageHero
          eyebrow="Solutions / Support Agents"
          title="AI support agents that"
          highlight="never sleep"
          subtitle="Resolve inbound support calls instantly, around the clock, in any language - and escalate to a human only when it actually matters."
        />

        <FeatureGrid items={[
          { icon: <Clock className="w-5 h-5" />, title: "24/7 availability", desc: "Pick up every call in milliseconds, day or night, with zero hold music and no queues." },
          { icon: <MessageSquare className="w-5 h-5" />, title: "Instant resolution", desc: "Answer FAQs, update accounts, and walk callers through setup using your own knowledge base." },
          { icon: <Globe className="w-5 h-5" />, title: "Multilingual", desc: "Greet and support callers in 10+ languages, automatically matching the caller's language." },
          { icon: <Share2 className="w-5 h-5" />, title: "Smart routing", desc: "Understand intent and route to the right team - or escalate to a human with full context." },
          { icon: <BookOpen className="w-5 h-5" />, title: "Knowledge aware", desc: "Connect docs, FAQs and policies so answers stay accurate and on-brand every time." },
          { icon: <Headphones className="w-5 h-5" />, title: "Sentiment aware", desc: "Detect frustration in real time and soften, slow down, or hand off before it escalates." },
        ]} />

        <section className="grid md:grid-cols-2 gap-10 items-center bg-white border border-slate-200/70 rounded-3xl p-8 md:p-12 shadow-sm">
          <div className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Cut ticket response times by 84%</h2>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">Deploy a support agent in minutes with FAQ templates, custom personalities, and timezone window locking out of the box.</p>
          </div>
          <CheckList items={[
            "Custom FAQ templates and prompt personalities",
            "Timezone window locking for global teams",
            "Seamless human escalation with call context",
            "Two-way CRM sync and post-call summaries",
            "Live transcripts and sentiment scoring",
          ]} />
        </section>

        <CTABand title="Put a support agent on every call" subtitle="Start free with 100 AI calls - no credit card, no setup fees." />
      </div>
    </MarketingShell>
  );
}
