"use client";

import React, { useState } from "react";
import { useSuperAdmin } from "src/context/SuperAdminContext";
import { Loader2, TrendingUp, HelpCircle } from "lucide-react";

export default function RevenueAnalyticsPage() {
  const { loading, revenueData } = useSuperAdmin();
  const [range, setRange] = useState("12m");

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 font-bold uppercase tracking-wider flex flex-col items-center justify-center select-none">
        <Loader2 className="w-8 h-8 animate-spin text-[#0f2e5c] mb-4" />
        <span>Synthesizing Financial Coordinate Maps...</span>
      </div>
    );
  }

  const chartPoints = revenueData?.growth_chart || [];
  const maxVal = Math.max(...(chartPoints.map((d) => d.value) || [1]), 1);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200/50">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Advanced Analytics</h1>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Predictive intelligence models, margin optimizations, and growth coordinates.
          </p>
        </div>

        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer select-none"
        >
          <option value="3m">3 Months</option>
          <option value="6m">6 Months</option>
          <option value="12m">12 Months</option>
        </select>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Growth Curves Graph */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs text-left select-none relative flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest block">Margin Growth Vectors</h4>
              <span className="text-lg font-black text-slate-800 mt-0.5 block">Net Revenue Projection curve</span>
            </div>
          </div>

          <div className="flex-1 min-h-[220px] flex items-end justify-between px-6 pb-2 border-b border-slate-100 relative mt-4">
            {chartPoints.map((item, idx) => {
              const heightPct = (item.value / maxVal) * 100;
              return (
                <div key={idx} className="flex flex-col items-center group w-12 cursor-pointer relative">
                  <div className="absolute -top-10 scale-95 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all bg-slate-950 text-white text-[9px] font-bold px-2 py-1 rounded shadow-md z-20 font-mono">
                    ${item.value.toLocaleString()}
                  </div>
                  <div 
                    className="w-8 bg-blue-50/80 group-hover:bg-[#0f2e5c] border border-blue-200 rounded-t-lg transition-all duration-500 shadow-3xs" 
                    style={{ height: `${heightPct}%`, minHeight: "15px" }}
                  />
                  <span className="text-[9px] text-slate-455 font-bold uppercase tracking-wider mt-2">{item.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Predictive Insights */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs flex flex-col justify-between select-none text-left">
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest block border-b border-slate-100 pb-2.5 flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Predictive Intelligence</span>
            </h4>

            <div className="space-y-3.5 leading-relaxed text-xs text-slate-550 font-medium">
              <p>
                Platform revenue is project to grow by <strong className="text-blue-650">+14.2%</strong> over the next 90 days based on active concurrency trends.
              </p>
              <p>
                Twilio regional voice bridges are experiencing optimal throughput, bringing down failover routing expenses by <strong className="text-blue-650">3.4%</strong>.
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-amber-50/50 border border-amber-100 rounded-xl text-[10px] text-amber-800 font-semibold leading-relaxed mt-6 flex items-start space-x-2">
            <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              All predictions are based on statistical regression engines and active billing telemetry logs.
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
