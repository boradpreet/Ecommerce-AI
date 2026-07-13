"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { MarketingShell, PageHero, CTABand } from "src/components/marketing/marketing-shell";
import {
  ShoppingBag, HeartPulse, Home, Landmark, ShieldCheck, GraduationCap,
  Plane, Hotel, UtensilsCrossed, Car, Users, Truck, RadioTower,
  Bot, Globe, Clock, PhoneCall, ArrowRight, Sparkles, PhoneIncoming, PhoneOutgoing,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Every industry in the AI agent catalog + its ready-made agents.     */
/* Keep in sync with backend app/services/industry_catalog.py.         */
/* ------------------------------------------------------------------ */
interface Accent { tile: string; chip: string; dot: string; }

interface Industry {
  key: string;
  title: string;
  tagline: string;
  icon: React.ReactNode;
  accent: Accent;
  agents: string[];
  isNew?: boolean;
}

const INDUSTRIES: Industry[] = [
  {
    key: "E-commerce",
    title: "E-commerce",
    tagline: "Confirm orders, recover carts, and turn every delivery into a repeat sale.",
    icon: <ShoppingBag className="w-6 h-6" />,
    accent: { tile: "bg-rose-50 text-rose-600 border-rose-100", chip: "bg-rose-50 text-rose-700", dot: "bg-rose-400" },
    agents: ["Order Confirmation", "Delivery Updates", "Cart Recovery", "Customer Support", "Product Recommendations"],
  },
  {
    key: "Healthcare",
    title: "Healthcare",
    tagline: "HIPAA-aligned agents that book, remind and follow up with patients 24/7.",
    icon: <HeartPulse className="w-6 h-6" />,
    accent: { tile: "bg-emerald-50 text-emerald-600 border-emerald-100", chip: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-400" },
    agents: ["Appointment Booking", "Reminders", "Patient Follow-up", "Prescription Reminders", "Health Campaigns"],
  },
  {
    key: "Real Estate",
    title: "Real Estate",
    tagline: "Qualify buyers, book site visits and keep every lead warm automatically.",
    icon: <Home className="w-6 h-6" />,
    accent: { tile: "bg-sky-50 text-sky-600 border-sky-100", chip: "bg-sky-50 text-sky-700", dot: "bg-sky-400" },
    agents: ["Property Inquiry", "Site Visit Booking", "Home Loan Help", "Property Follow-up", "Investment Advice"],
  },
  {
    key: "Banking & Finance",
    title: "Banking & Finance",
    tagline: "Compliance-safe agents for verification, collections and card sales.",
    icon: <Landmark className="w-6 h-6" />,
    accent: { tile: "bg-violet-50 text-violet-600 border-violet-100", chip: "bg-violet-50 text-violet-700", dot: "bg-violet-400" },
    agents: ["Loan Verification", "EMI Reminders", "KYC Verification", "Card Sales", "Banking Support"],
  },
  {
    key: "Insurance",
    title: "Insurance",
    tagline: "Renewals, claims and lead qualification handled on every call.",
    icon: <ShieldCheck className="w-6 h-6" />,
    accent: { tile: "bg-indigo-50 text-indigo-600 border-indigo-100", chip: "bg-indigo-50 text-indigo-700", dot: "bg-indigo-400" },
    agents: ["Policy Renewal", "Claim Status", "Insurance Advisor", "Lead Qualification", "Premium Reminders"],
  },
  {
    key: "Education",
    title: "Education",
    tagline: "Answer admissions queries and follow up with students instantly.",
    icon: <GraduationCap className="w-6 h-6" />,
    accent: { tile: "bg-amber-50 text-amber-600 border-amber-100", chip: "bg-amber-50 text-amber-700", dot: "bg-amber-400" },
    agents: ["Admission Counseling", "Student Follow-up", "Fee Reminders", "Course Advice", "Student Support"],
  },
  {
    key: "Travel & Hospitality",
    title: "Travel & Hospitality",
    tagline: "Bookings, flight updates and itinerary confirmations, always on.",
    icon: <Plane className="w-6 h-6" />,
    accent: { tile: "bg-cyan-50 text-cyan-600 border-cyan-100", chip: "bg-cyan-50 text-cyan-700", dot: "bg-cyan-400" },
    agents: ["Hotel Reservation", "Flight Updates", "Travel Packages", "Booking Confirmation", "Customer Care"],
  },
  {
    key: "Hotel",
    title: "Hotel",
    tagline: "Reservations, guest care, events and post-stay reviews — one AI voice team.",
    icon: <Hotel className="w-6 h-6" />,
    accent: { tile: "bg-orange-50 text-orange-600 border-orange-100", chip: "bg-orange-50 text-orange-700", dot: "bg-orange-400" },
    agents: ["Room Reservations", "Guest Support", "Event & Banquet", "Promotions", "Feedback & Reviews"],
    isNew: true,
  },
  {
    key: "Restaurants",
    title: "Restaurants",
    tagline: "Take reservations, confirm orders and grow loyalty with every guest.",
    icon: <UtensilsCrossed className="w-6 h-6" />,
    accent: { tile: "bg-red-50 text-red-600 border-red-100", chip: "bg-red-50 text-red-700", dot: "bg-red-400" },
    agents: ["Table Reservations", "Order Confirmation", "Feedback", "Offer Promotions", "Loyalty Program"],
  },
  {
    key: "Automotive",
    title: "Automotive",
    tagline: "Service reminders, test-drive booking and sales follow-up for dealerships.",
    icon: <Car className="w-6 h-6" />,
    accent: { tile: "bg-slate-100 text-slate-600 border-slate-200", chip: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
    agents: ["Service Reminders", "Test Drive Booking", "Vehicle Sales", "Warranty Reminders", "Customer Follow-up"],
  },
  {
    key: "Recruitment & HR",
    title: "Recruitment & HR",
    tagline: "Screen candidates and schedule interviews around the clock, in any language.",
    icon: <Users className="w-6 h-6" />,
    accent: { tile: "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100", chip: "bg-fuchsia-50 text-fuchsia-700", dot: "bg-fuchsia-400" },
    agents: ["Candidate Screening", "Interview Scheduling", "Recruitment Follow-up", "Onboarding", "HR Support"],
  },
  {
    key: "Logistics",
    title: "Logistics",
    tagline: "Keep shipments moving and customers informed with live call updates.",
    icon: <Truck className="w-6 h-6" />,
    accent: { tile: "bg-teal-50 text-teal-600 border-teal-100", chip: "bg-teal-50 text-teal-700", dot: "bg-teal-400" },
    agents: ["Delivery Confirmation", "Shipment Tracking", "Pickup Scheduling", "Warehouse Support", "Customer Support"],
  },
  {
    key: "Telecom",
    title: "Telecom",
    tagline: "Onboard, upsell and retain subscribers with proactive AI calls.",
    icon: <RadioTower className="w-6 h-6" />,
    accent: { tile: "bg-blue-50 text-blue-600 border-blue-100", chip: "bg-blue-50 text-blue-700", dot: "bg-blue-400" },
    agents: ["Customer Onboarding", "Plan Upgrades", "Bill Reminders", "Retention", "Technical Support"],
  },
];

const STATS = [
  { icon: <Landmark className="w-4 h-4" />, value: "13", label: "Industries" },
  { icon: <Bot className="w-4 h-4" />, value: "65+", label: "Ready-made agents" },
  { icon: <Globe className="w-4 h-4" />, value: "10+", label: "Languages" },
  { icon: <Clock className="w-4 h-4" />, value: "24/7", label: "Inbound & outbound" },
];

const CAPABILITIES = [
  { icon: <PhoneIncoming className="w-4 h-4" />, text: "Inbound answering" },
  { icon: <PhoneOutgoing className="w-4 h-4" />, text: "Outbound campaigns" },
  { icon: <Globe className="w-4 h-4" />, text: "10+ languages" },
  { icon: <Sparkles className="w-4 h-4" />, text: "Auto follow-up on WhatsApp & email" },
];

export default function IndustriesPage() {
  const router = useRouter();

  return (
    <MarketingShell>
      <div className="space-y-16 sm:space-y-20">
        <PageHero
          eyebrow="Industries"
          title="AI voice agents for"
          highlight="every industry"
          subtitle="Voqly AI adapts to your sector out of the box. Pick a vertical, launch a ready-made agent, and it's answering and dialing your customers in minutes — in their language."
        />

        {/* Stat strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 max-w-3xl mx-auto -mt-6">
          {STATS.map((s) => (
            <div key={s.label} className="bg-white/80 backdrop-blur border border-slate-200/70 rounded-2xl px-4 py-4 text-center shadow-[0_4px_20px_-12px_rgba(0,0,0,0.1)]">
              <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-2">{s.icon}</div>
              <div className="text-xl font-black text-slate-900 leading-none">{s.value}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Industry grid */}
        <div>
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Purpose-built agents for <span className="font-serif italic text-orange-600">your vertical</span>
            </h2>
            <p className="text-sm text-slate-500 font-semibold leading-relaxed">
              Each industry ships with a full team of specialised agents — ready to use, fully editable, and yours to brand.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {INDUSTRIES.map((ind) => (
              <div
                key={ind.key}
                className="group relative bg-white border border-slate-200/70 rounded-3xl p-6 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.08)] hover:shadow-[0_16px_44px_-14px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all duration-300 flex flex-col"
              >
                {ind.isNew && (
                  <span className="absolute top-5 right-5 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-orange-600 text-white shadow-sm">
                    <Sparkles className="w-2.5 h-2.5" /> New
                  </span>
                )}

                <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-105 ${ind.accent.tile}`}>
                  {ind.icon}
                </div>

                <h3 className="text-base font-black text-slate-900">{ind.title}</h3>
                <p className="text-[13px] text-slate-500 font-semibold leading-relaxed mt-1.5 mb-5">{ind.tagline}</p>

                <div className="mt-auto">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2.5 flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${ind.accent.dot}`} />
                    Ready-made agents
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ind.agents.map((a) => (
                      <span key={a} className={`text-[10px] font-bold px-2 py-1 rounded-lg ${ind.accent.chip}`}>{a}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* Custom / "Other" tile */}
            <button
              onClick={() => router.push("/login")}
              className="group relative text-left bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-800 rounded-3xl p-6 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.3)] hover:-translate-y-1 transition-all duration-300 flex flex-col cursor-pointer overflow-hidden"
            >
              <div className="absolute -top-16 -right-10 w-48 h-48 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 text-orange-300 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-white">Don&apos;t see your industry?</h3>
              <p className="text-[13px] text-slate-300 font-semibold leading-relaxed mt-1.5 mb-5">
                Build a fully custom agent — write your own prompts, pick a voice, and go live on any calling use case.
              </p>
              <span className="mt-auto inline-flex items-center gap-2 text-xs font-black text-white uppercase tracking-wider">
                Build your own <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
          </div>
        </div>

        {/* Shared capabilities strip */}
        <div className="bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-8 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.08)]">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6 justify-between">
            <div className="max-w-md">
              <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-orange-650 mb-2">
                <PhoneCall className="w-3.5 h-3.5" /> Works the same everywhere
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Every agent, every industry — one platform</h3>
              <p className="text-[13px] text-slate-500 font-semibold leading-relaxed mt-1.5">
                No matter the vertical, your agents inherit the same capabilities out of the box.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 shrink-0">
              {CAPABILITIES.map((c) => (
                <div key={c.text} className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-3">
                  <span className="w-7 h-7 rounded-lg bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center shrink-0">{c.icon}</span>
                  <span className="text-[11px] font-bold text-slate-700 leading-tight">{c.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <CTABand
          title="Launch your industry agent today"
          subtitle="Spin up a ready-made agent for your sector with 100 minutes of free AI calls — no credit card, live in under five minutes."
        />
      </div>
    </MarketingShell>
  );
}
