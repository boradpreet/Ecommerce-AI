"use client";

import React from "react";
import { MarketingShell, PageHero, FeatureGrid, CTABand } from "src/components/marketing/marketing-shell";
import {
  PhoneCall, Users, Calendar, Target, Play, BarChart3, Download,
  FileText, Activity, Globe, Mic, BookOpen, ShieldCheck,
} from "lucide-react";

const FUNCTIONALITY = [
  { icon: <PhoneCall className="w-5 h-5" />, title: "Inbound & Outbound Calls", desc: "AI voice agents handle both directions — answering inbound and dialing outbound autonomously." },
  { icon: <Users className="w-5 h-5" />, title: "Lead Qualification", desc: "Agents qualify prospects on every call and capture intent, so your team only talks to ready buyers." },
  { icon: <Calendar className="w-5 h-5" />, title: "Meeting Booking", desc: "Book appointments live during the conversation and sync them straight to your calendar." },
  { icon: <Target className="w-5 h-5" />, title: "Campaign Management", desc: "Create, schedule and monitor outbound dialer campaigns with per-campaign targeting." },
  { icon: <Play className="w-5 h-5" />, title: "Real-time Dialer", desc: "Sequential, compliance-aware auto-dialing that respects calling windows and retry rules." },
  { icon: <BarChart3 className="w-5 h-5" />, title: "Call Analytics", desc: "Live KPIs, call-volume trends, outcomes and containment — updated in real time." },
  { icon: <Download className="w-5 h-5" />, title: "Campaign Reports", desc: "One-click downloadable reports covering calls, talk minutes, leads and outcomes per campaign." },
  { icon: <FileText className="w-5 h-5" />, title: "Call Recording & Transcripts", desc: "Every call is recorded and transcribed with a searchable, structured summary." },
  { icon: <Activity className="w-5 h-5" />, title: "Sentiment & Interest Scoring", desc: "Automatic positive/negative sentiment and an interest score for each conversation." },
  { icon: <Globe className="w-5 h-5" />, title: "Multi-language Calling", desc: "Speak to customers in English and 9 Indian languages, each in a natural native voice." },
  { icon: <Mic className="w-5 h-5" />, title: "Neural Voice Synthesis", desc: "A library of premium neural voices — male and female — for on-brand conversations." },
  { icon: <BookOpen className="w-5 h-5" />, title: "Knowledge Base (RAG)", desc: "Ground agents in your own documents so answers are accurate and up to date." },
  { icon: <ShieldCheck className="w-5 h-5" />, title: "Compliance & DNC Scrubbing", desc: "HIPAA-, GDPR- and TCPA-aligned controls with automatic do-not-call scrubbing." },
];

export default function FunctionalityPage() {
  return (
    <MarketingShell>
      <div className="space-y-16">
        <PageHero
          eyebrow="Functionality"
          title="Everything Voqly AI can"
          highlight="do"
          subtitle="A complete AI calling platform — from real-time dialing to analytics, transcripts and compliance. Here's the full feature set."
        />
        <FeatureGrid items={FUNCTIONALITY} />
        <CTABand
          title="See it on your own calls"
          subtitle="Spin up an AI agent and try every one of these features with 100 minutes free AI calls."
        />
      </div>
    </MarketingShell>
  );
}
