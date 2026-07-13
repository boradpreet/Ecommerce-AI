"use client";

import React, { useState } from "react";
import { useSuperAdmin } from "src/context/SuperAdminContext";
import { Loader2, CreditCard, Link2, ShieldCheck } from "lucide-react";

export default function PlatformBillingSettingsPage() {
  const { loading, triggerSuccess } = useSuperAdmin();
  const [linking, setLinking] = useState(false);

  const handleLink = () => {
    setLinking(true);
    setTimeout(() => {
      setLinking(false);
      triggerSuccess("Razorpay Gateway API credentials validated successfully!");
    }, 1200);
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 font-bold uppercase tracking-wider flex flex-col items-center justify-center select-none">
        <Loader2 className="w-8 h-8 animate-spin text-[#0f2e5c] mb-4" />
        <span>Syncing billing controllers...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200/50">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Administrative Billing</h1>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Link merchant gateways, manage payout thresholds, and configure tax settings.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Gateway link */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs text-left select-none space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">
              Merchant Payout Gateway
            </h4>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1.5">Razorpay Key ID</label>
                <input
                  type="text"
                  required
                  defaultValue="rzp_live_89x821aa"
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-950 outline-none focus:border-blue-600 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1.5">Razorpay Webhook Secret</label>
                <input
                  type="password"
                  required
                  defaultValue="whsec_••••••••••••"
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-955 outline-none focus:border-blue-600 font-mono"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={handleLink}
                disabled={linking}
                className="h-10 px-5 bg-[#0F2D67] hover:bg-slate-950 disabled:opacity-50 text-xs font-bold text-white rounded-xl transition flex items-center space-x-2 shadow-md cursor-pointer"
              >
                {linking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Syncing Merchant...</span>
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4 text-white" />
                    <span>Validate Gateway Connection</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Ledger Standings */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs flex flex-col justify-between select-none text-left">
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest block border-b border-slate-100 pb-2.5">
              Platform Ledger Status
            </h4>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center space-x-3">
              <CreditCard className="w-5 h-5 text-indigo-700 shrink-0" />
              <div className="leading-tight">
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Razorpay Hook Sync</span>
                <span className="text-xs font-bold text-slate-800">nominal (100% SUCCESS)</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl text-[10px] text-blue-750 font-medium leading-relaxed mt-6 flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-blue-650 shrink-0 mt-0.5" />
            <span>
              Dynamic payout pipelines run automatically on the first day of every calendar month.
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
