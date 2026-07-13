"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useVendorDetail } from "./context";
import {
  DollarSign, Activity, Users, PhoneCall, Building2, Calendar,
  Globe, TrendingUp, CreditCard, ShieldCheck, Mail,
  Bot, Target, Contact, Settings, ArrowUpRight
} from "lucide-react";

export default function VendorDetailOverviewPage() {
  const { vendorDetail } = useVendorDetail();
  const params = useParams();
  const rawVendorId = params?.vendorId as string;

  if (!vendorDetail) return null;

  const quickLinks = [
    { href: "agents", label: "AI Agents", icon: Bot, desc: `${vendorDetail.active_agents} active`, color: "text-violet-600 bg-violet-50" },
    { href: "campaigns", label: "Campaigns", icon: Target, desc: "Runs & history", color: "text-blue-600 bg-blue-50" },
    { href: "leads", label: "Leads", icon: Contact, desc: "Lead lists", color: "text-rose-600 bg-rose-50" },
    { href: "call-logs", label: "Call Logs", icon: PhoneCall, desc: "Calls & audio", color: "text-emerald-600 bg-emerald-50" },
    { href: "subscriptions", label: "Subscriptions", icon: TrendingUp, desc: `${vendorDetail.plan} plan`, color: "text-indigo-600 bg-indigo-50" },
    { href: "billing", label: "Billing", icon: CreditCard, desc: "Invoices", color: "text-amber-600 bg-amber-50" },
    { href: "settings", label: "Settings", icon: Settings, desc: "Config & telephony", color: "text-slate-600 bg-slate-100" },
  ];

  const cardItems = [
    { icon: DollarSign, label: "Total Revenue", value: `$${vendorDetail.total_revenue.toFixed(2)}`, color: "text-emerald-600", bg: "bg-emerald-50" },
    { icon: Activity, label: "Prepaid Balance", value: `$${vendorDetail.prepaid_balance.toFixed(2)}`, color: "text-blue-600", bg: "bg-blue-50" },
    { icon: Users, label: "Active Agents", value: String(vendorDetail.active_agents), color: "text-violet-600", bg: "bg-violet-50" },
    { icon: PhoneCall, label: "Phone Numbers", value: String(vendorDetail.phone_numbers_count), color: "text-amber-600", bg: "bg-amber-50" },
  ];

  const detailGridItems = [
    { icon: Building2, label: "Industry", value: vendorDetail.industry || "—" },
    { icon: Globe, label: "Website", value: vendorDetail.website_url || "—" },
    { icon: Calendar, label: "Joined", value: vendorDetail.created_at || "—" },
    { icon: TrendingUp, label: "Plan", value: `${vendorDetail.plan} (${vendorDetail.plan_status})` },
    { icon: Calendar, label: "Renewal Date", value: vendorDetail.renewal_date || "—" },
    { icon: Users, label: "Team Members", value: `${vendorDetail.team_members} members` },
    { icon: Activity, label: "Concurrency Limit", value: `${vendorDetail.concurrency_limit} streams` },
    { icon: CreditCard, label: "Platform Margin", value: "12.5%" },
  ];

  return (
    <div className="space-y-6">

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 select-none">
        {cardItems.map((item, idx) => (
          <div key={idx} className={`${item.bg} rounded-2xl p-5 border border-slate-100 flex flex-col justify-between h-24 hover:scale-[1.01] transition-all`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{item.label}</span>
              <item.icon className={`w-4 h-4 ${item.color}`} />
            </div>
            <p className="text-xl font-extrabold text-slate-900 leading-none mt-2">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Access — jump straight to any of this vendor's sections */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest block select-none border-b border-slate-100 pb-2.5 mb-4">
          Quick Access
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {quickLinks.map((q) => (
            <Link
              key={q.href}
              href={`/superadmin/vendors/${rawVendorId}/${q.href}`}
              className="group flex items-center gap-3 p-3.5 rounded-2xl border border-slate-150 bg-slate-50/60 hover:bg-white hover:border-blue-200 hover:shadow-sm transition select-none"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${q.color}`}>
                <q.icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-slate-800 truncate">{q.label}</p>
                <p className="text-[10px] text-slate-400 font-bold truncate">{q.desc}</p>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      {/* Row detail list & owner info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Detail Parameters */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-4">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest block select-none border-b border-slate-100 pb-2.5">
            Operational Metadata
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {detailGridItems.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 select-none">
                <item.icon className="w-4 h-4 text-slate-450 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{item.label}</p>
                  <p className="text-xs font-bold text-slate-800 mt-0.5 truncate max-w-[200px]">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Owner details card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest block select-none border-b border-slate-100 pb-2.5">
              Account Authority
            </h4>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-[#0F2D67] flex items-center justify-center text-white font-bold text-sm shrink-0">
                {(vendorDetail.owner_name || "?").charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-900">{vendorDetail.owner_name || "Primary Owner"}</p>
                <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                  <Mail className="w-3 h-3 shrink-0" />
                  <span className="truncate max-w-[140px]">{vendorDetail.email}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 select-none bg-blue-50/50 border border-blue-100 rounded-xl p-3.5 flex items-start space-x-2 text-[11px] text-blue-700 font-medium leading-relaxed">
            <ShieldCheck className="w-4 h-4 shrink-0 text-blue-650" />
            <span>
              Onboarded on {vendorDetail.created_at}. All KYC documentation is validated. Sandbox security key active.
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
