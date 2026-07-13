"use client";

import React, { useState } from "react";
import { useSuperAdmin } from "src/context/SuperAdminContext";
import { Loader2, HeartCrack } from "lucide-react";

export default function AlertsPage() {
  const { loading, infraData, triggerSuccess } = useSuperAdmin();
  const [resolved, setResolved] = useState(false);

  const handleResolve = () => {
    setResolved(true);
    triggerSuccess("High severity incident marked as resolved.");
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 font-bold uppercase tracking-wider flex flex-col items-center justify-center select-none">
        <Loader2 className="w-8 h-8 animate-spin text-[#0f2e5c] mb-4" />
        <span>Gauging Critical Incident Triggers...</span>
      </div>
    );
  }

  const incident = infraData?.incident;

  return (
    <div className="space-y-6 animate-fade-in text-left">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200/50">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Active Alerts</h1>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Monitor and manage ongoing network incidents and automated watchdogs.
          </p>
        </div>
      </div>

      {!incident || resolved ? (
        <div className="py-16 text-center bg-white border border-slate-200 rounded-3xl select-none">
          <HeartCrack className="w-10 h-10 text-emerald-500 mx-auto mb-3 opacity-80" />
          <h3 className="text-sm font-bold text-slate-800">All Systems Nominal</h3>
          <p className="text-xs text-slate-450 font-medium mt-1">No active incidents are flagged on the cluster.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs flex flex-col justify-between select-none">
          
          <div className="space-y-6">
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <span className="bg-red-50 border border-red-200 text-red-600 text-[8.5px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                  HIGH SEVERITY
                </span>
                <h3 className="text-sm font-black text-slate-900 mt-2.5">{incident.title}</h3>
                <span className="text-[10px] text-slate-400 font-mono font-bold">{incident.id}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-150 rounded-xl p-3">
                  <span className="text-[8px] text-slate-455 font-bold uppercase tracking-wider block">STATUS</span>
                  <span className="text-xs font-black text-slate-900 mt-1.5 flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span>Investigating</span>
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 font-mono">
                  <span className="text-[8px] text-slate-450 font-bold uppercase tracking-wider block">DETECTED</span>
                  <span className="text-xs font-black text-slate-900 mt-1.5">{incident.detected}</span>
                </div>
              </div>

              <div className="text-left space-y-1.5">
                <h5 className="text-xs font-black text-slate-900">Incident Details</h5>
                <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">{incident.description}</p>
              </div>

              {/* timeline */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <span className="text-[8.5px] text-slate-450 font-bold uppercase tracking-wider block">TIMELINE</span>
                <div className="space-y-2.5 max-h-36 overflow-y-auto pr-1">
                  {incident.timeline.map((event, idx) => (
                    <div key={idx} className="flex items-start space-x-2.5 text-[9.5px]">
                      <span className="font-mono text-slate-400 font-extrabold shrink-0 mt-0.5">{event.time}</span>
                      <span className="text-slate-655 font-semibold leading-relaxed">{event.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end">
            <button
              onClick={handleResolve}
              className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white rounded-xl transition shadow-md cursor-pointer"
            >
              Resolve Incident
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
