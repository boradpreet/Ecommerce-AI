"use client";

import React from "react";
import { MarketingShell, PageHero, FeatureGrid, CheckList, CTABand } from "src/components/marketing/marketing-shell";
import { Layers, Users, Clock, BarChart3, RefreshCw, Shield } from "lucide-react";

export default function CampaignDeskPage() {
  return (
    <MarketingShell>
      <div className="space-y-20">
        <PageHero
          eyebrow="Solutions / Campaign Desk"
          title="Launch campaigns in"
          highlight="minutes"
          subtitle="Build, schedule and track inbound and outbound AI calling campaigns from one command center - no engineers required."
        />

        <FeatureGrid items={[
          { icon: <Layers className="w-5 h-5" />, title: "Visual builder", desc: "Compose call flows and branching logic with a drag-and-drop builder anyone can use." },
          { icon: <Users className="w-5 h-5" />, title: "Audience segments", desc: "Upload lists or sync your CRM, then target precise segments per campaign." },
          { icon: <Clock className="w-5 h-5" />, title: "Smart scheduling", desc: "Set windows, pacing and timezones so calls land at the moment they convert best." },
          { icon: <BarChart3 className="w-5 h-5" />, title: "Live analytics", desc: "Watch connection, conversion and call-back rates update in real time as calls run." },
          { icon: <RefreshCw className="w-5 h-5" />, title: "Retry logic", desc: "Automatically retry no-answers and busies with configurable backoff rules." },
          { icon: <Shield className="w-5 h-5" />, title: "Compliance windows", desc: "Lock calling hours and honor do-not-call lists automatically, by region." },
        ]} />

        <section className="grid md:grid-cols-2 gap-10 items-center bg-white border border-slate-200/70 rounded-3xl p-8 md:p-12 shadow-sm">
          <div className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">One desk to run them all</h2>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">Clone winning campaigns, refine with post-call analytics, and scale the ones that work - all from a single dashboard.</p>
          </div>
          <CheckList items={[
            "Drag-and-drop campaign builder",
            "CRM sync and CSV list uploads",
            "Per-campaign pacing and timezone control",
            "Real-time dashboards and exportable reports",
            "Automatic retries and DNC scrubbing",
          ]} />
        </section>

        <CTABand title="Ship your first campaign today" subtitle="Get 100 free AI calls to launch and measure a live campaign." />
      </div>
    </MarketingShell>
  );
}
