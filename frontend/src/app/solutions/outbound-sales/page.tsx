"use client";

import React from "react";
import { MarketingShell, PageHero, FeatureGrid, CheckList, CTABand } from "src/components/marketing/marketing-shell";
import { Phone, Target, Zap, Calendar, Layers, MapPin } from "lucide-react";

export default function OutboundSalesPage() {
  return (
    <MarketingShell>
      <div className="space-y-20">
        <PageHero
          eyebrow="Solutions / Outbound Sales"
          title="Outbound dialing that"
          highlight="closes"
          subtitle="Qualify leads, follow up the instant they convert, and book meetings on autopilot - at a scale no human team could match."
        />

        <FeatureGrid items={[
          { icon: <Phone className="w-5 h-5" />, title: "10x dialing", desc: "Run thousands of concurrent outbound calls without hiring or training a single rep." },
          { icon: <Target className="w-5 h-5" />, title: "Lead qualification", desc: "Score and qualify every prospect against your criteria before a human ever steps in." },
          { icon: <Zap className="w-5 h-5" />, title: "Instant follow-up", desc: "Call new leads within seconds of a form fill, while intent is still at its peak." },
          { icon: <Calendar className="w-5 h-5" />, title: "Meeting booking", desc: "Check live calendars and book qualified demos straight into your reps' schedules." },
          { icon: <Layers className="w-5 h-5" />, title: "A/B scripts", desc: "Test openers, offers and objection handling, then auto-promote the winning script." },
          { icon: <MapPin className="w-5 h-5" />, title: "Local presence", desc: "Dial from local SIP numbers to lift answer rates across every region you target." },
        ]} />

        <section className="grid md:grid-cols-2 gap-10 items-center bg-white border border-slate-200/70 rounded-3xl p-8 md:p-12 shadow-sm">
          <div className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Automate outbound 10x faster</h2>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">From cold lists to warm pipelines, Voqly works every lead consistently and logs the outcome straight to your CRM.</p>
          </div>
          <CheckList items={[
            "Concurrent dialing with smart retry logic",
            "Real-time lead scoring and disposition tags",
            "Calendar-aware meeting booking",
            "Local presence numbers in every region",
            "Full call recordings and analytics",
          ]} />
        </section>

        <CTABand title="Fill your pipeline while you sleep" subtitle="Spin up an outbound campaign today and get 100 free AI calls to test it." />
      </div>
    </MarketingShell>
  );
}
