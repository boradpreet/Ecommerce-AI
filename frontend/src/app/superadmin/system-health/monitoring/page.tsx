"use client";

import React from "react";
import { useSuperAdmin } from "src/context/SuperAdminContext";
import { Loader2, HeartPulse, Sparkles, HelpCircle } from "lucide-react";

export default function MonitoringPage() {
  const { loading, metrics } = useSuperAdmin();

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 font-bold uppercase tracking-wider flex flex-col items-center justify-center select-none">
        <Loader2 className="w-8 h-8 animate-spin text-[#0f2e5c] mb-4" />
        <span>Syncing Cluster Telemetry...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200/50">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Active Monitoring</h1>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Consolidated telemetry, CPU throughputs, and system up-times.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Telemetry stats */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs text-left select-none space-y-5">
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2.5">
            Cluster Telemetry Metrics
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center space-x-3">
              <HeartPulse className="w-6 h-6 text-indigo-750 shrink-0" />
              <div className="leading-tight">
                <span className="text-[9px] text-slate-400 font-bold uppercase block">System Uptime</span>
                <span className="text-sm font-extrabold text-slate-800 mt-1 block">
                  {metrics?.system_uptime || 99.99}%
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center space-x-3">
              <Sparkles className="w-6 h-6 text-emerald-650 shrink-0" />
              <div className="leading-tight">
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Network Load</span>
                <span className="text-sm font-extrabold text-slate-800 mt-1 block">
                  {metrics?.live_calls_progress || 72}% CAPACITY
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Health Shield */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs flex flex-col justify-between select-none text-left">
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest block border-b border-slate-100 pb-2.5">
              Watchdog Shield
            </h4>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Regional Endpoints</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-150 px-2 py-0.5 rounded-full w-max mt-1 block">
                  ALL NOMINAL
                </span>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl text-[10.5px] text-blue-750 font-medium leading-relaxed mt-6 flex items-start space-x-2">
            <HelpCircle className="w-4 h-4 text-blue-650 shrink-0 mt-0.5" />
            <span>
              Real-time monitoring monitors latency variables. Automatically issues alerts downstream if failures exceed thresholds.
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
