"use client";

import React from "react";
import { Loader2 } from "lucide-react";

export default function SuperAdminLoading() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8 select-none">
      <Loader2 className="w-8 h-8 animate-spin text-[#0F2D67] mb-4" />
      <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest animate-pulse">
        Loading Console Data...
      </h2>
      <p className="text-xs text-slate-400 mt-1.5 font-medium">
        Synchronizing cluster metrics and telemetry nodes.
      </p>
    </div>
  );
}
