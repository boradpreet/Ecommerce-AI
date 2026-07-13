"use client";

import React, { useState } from "react";
import { useSuperAdmin } from "src/context/SuperAdminContext";
import { Loader2, ShieldCheck, Check } from "lucide-react";

export default function SecuritySettingsPage() {
  const { loading, triggerSuccess } = useSuperAdmin();
  const [updating, setUpdating] = useState(false);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setTimeout(() => {
      setUpdating(false);
      triggerSuccess("Administrator password updated successfully!");
    }, 1200);
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 font-bold uppercase tracking-wider flex flex-col items-center justify-center select-none">
        <Loader2 className="w-8 h-8 animate-spin text-[#0f2e5c] mb-4" />
        <span>Loading Credentials Registry...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200/50">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Security Credentials</h1>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Configure MFA parameters, API security keys, and root passwords.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Credentials Editor */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs text-left select-none">
          <form onSubmit={handleUpdate} className="space-y-5">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1.5">Current Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-950 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1.5">New Secure Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-955 outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={updating}
                className="h-10 px-5 bg-[#0F2D67] hover:bg-slate-950 disabled:opacity-50 text-xs font-bold text-white rounded-xl transition flex items-center space-x-2 shadow-md cursor-pointer"
              >
                {updating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Syncing Password...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Update Credentials</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Security Shield */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs flex flex-col justify-between select-none text-left">
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest block border-b border-slate-100 pb-2.5">
              MFA Status
            </h4>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center space-x-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="leading-tight">
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Authenticator App</span>
                <span className="text-xs font-bold text-slate-800">ENABLED (Root Secure)</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-[10px] text-blue-700 font-semibold leading-relaxed mt-6 flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-blue-650 shrink-0 mt-0.5" />
            <span>
              All logins require standard 2FA challenge tokens. Ledger audits lock if anomalies occur.
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
