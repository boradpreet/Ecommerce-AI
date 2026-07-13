"use client";

import React from "react";
import { useVendorDetail } from "../context";
import { CreditCard, CheckCircle2, TrendingUp, HelpCircle, Activity } from "lucide-react";

export default function VendorDetailSubscriptionPage() {
  const { vendorDetail } = useVendorDetail();

  if (!vendorDetail) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* 2 Column Plan Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Subscription Detail Panel */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs text-left">
          <div className="border-b border-slate-100 pb-3 mb-6 select-none flex justify-between items-center">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-blue-650" />
              <span>Subscription Overview</span>
            </h4>
            <span className="text-[9px] font-black bg-blue-50 text-blue-750 border border-blue-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider select-none">
              {vendorDetail.plan_status.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-4 select-none">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Pricing Matrix Model</span>
                <span className="text-xl font-extrabold text-slate-900 mt-1 block">{vendorDetail.plan} Plan</span>
              </div>
              
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Billing Contract Cycle</span>
                <span className="text-xs font-bold text-slate-700 mt-1 block">Monthly auto-renewals on credit-ledger</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Next Renewal Cycle</span>
                <span className="text-xs font-mono font-bold text-[#0F2D67] mt-1 block bg-slate-50 border border-slate-150 rounded-lg px-2.5 py-1 w-max">
                  {vendorDetail.renewal_date}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 select-none space-y-3.5">
              <h5 className="text-[10.5px] font-black text-slate-900 uppercase tracking-wider">Plan Inclusions</h5>
              
              <div className="space-y-2.5">
                {[
                  `Up to ${vendorDetail.concurrency_limit} concurrent SIP channels`,
                  "Real-time dynamic voice bridge routers",
                  "Global AI inference optimization network access",
                  "Full-stack team member dashboard seating",
                  "Dedicated API logs backup retention (30 days)"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start space-x-2 text-xs font-semibold text-slate-655">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Financial telemetry details */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs flex flex-col justify-between select-none">
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest block border-b border-slate-100 pb-2.5">
              Subscription Cost Matrix
            </h4>
            
            <div className="space-y-3">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <CreditCard className="w-4 h-4 text-blue-650" />
                  <span className="text-xs font-bold text-slate-900">Base Plan Price</span>
                </div>
                <span className="text-sm font-extrabold text-slate-950">$499.00/mo</span>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <Activity className="w-4 h-4 text-indigo-650" />
                  <span className="text-xs font-bold text-slate-900">SIP Bridge Cost</span>
                </div>
                <span className="text-sm font-extrabold text-slate-950">Pay-as-you-go</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl text-[10px] text-amber-800 font-semibold leading-relaxed mt-6 flex items-start space-x-2">
            <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Dynamic routing failovers may incur additional API usage fees. Monitor active billing invoices downstream.
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
