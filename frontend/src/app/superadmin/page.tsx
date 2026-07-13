"use client";

import React from "react";
import { useSuperAdmin } from "src/context/SuperAdminContext";
import OverviewTab from "src/components/superadmin/OverviewTab";
import { Loader2 } from "lucide-react";

export default function SuperAdminPage() {
  const {
    loading,
    metrics,
    mrrChart,
    infraData,
  } = useSuperAdmin();

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 font-bold uppercase tracking-wider flex flex-col items-center justify-center select-none">
        <Loader2 className="w-8 h-8 animate-spin text-[#0f2e5c] mb-4" />
        <span>Calibrating Administrative Console...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200/50">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Overview Dashboard</h1>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Unified back-office telemetry across all registered tenants.
          </p>
        </div>
      </div>
      <OverviewTab
        metrics={metrics}
        mrrChart={mrrChart}
        infraData={infraData}
      />
    </div>
  );
}
