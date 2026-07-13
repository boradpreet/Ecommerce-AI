"use client";

import React from "react";
import { useOnboardingStore } from "src/store/useOnboardingStore";
import { Database, ShieldAlert, CheckCircle } from "lucide-react";

export const StepResidency: React.FC = () => {
  const { residencyLocation, setBusinessDetails } = useOnboardingStore();

  const locations = [
    { id: "us-east", label: "US East (N. Virginia)", provider: "AWS", desc: "Default ultra-low latency gateway node." },
    { id: "eu-west", label: "EU West (Frankfurt)", provider: "AWS", desc: "Sovereign GDPR compliant node with encryption locks." },
    { id: "ap-south", label: "AP South (Mumbai)", provider: "GCP", desc: "High-uptime Asia gateway for regional calling." },
  ];

  return (
    <div className="w-full space-y-6 text-slate-800 text-left animate-fade-in">
      
      {/* Title */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-slate-950 tracking-tight">Data Residency</h2>
        <p className="text-xs text-slate-500 font-medium">
          Select geolocations for hosting active audio records, transcripts, and model weights.
        </p>
      </div>

      <div className="space-y-4">
        {locations.map((loc) => {
          const isSelected = residencyLocation === loc.id;
          return (
            <div
              key={loc.id}
              onClick={() => setBusinessDetails({ residencyLocation: loc.id })}
              className={`p-4 rounded-xl border cursor-pointer select-none transition-all duration-300 flex justify-between items-center ${
                isSelected
                  ? "bg-blue-50/50 border-blue-600 shadow-md ring-2 ring-blue-600/10"
                  : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
              }`}
            >
              <div className="flex items-center space-x-3.5">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  <Database className="w-4 h-4" />
                </div>
                
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{loc.label} ({loc.provider})</h4>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{loc.desc}</p>
                </div>
              </div>

              {isSelected && <CheckCircle className="w-4 h-4 text-blue-600" />}
            </div>
          );
        })}
      </div>

      <div className="p-4 bg-blue-50 border border-blue-150 rounded-xl flex items-start space-x-3 text-[11px] text-blue-700 font-semibold leading-relaxed">
        <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <span>Sovereign nodes operate under zero-knowledge encryption patterns. Audio records and transcriptions are fully encrypted at rest with Customer-Managed Keys (CMK).</span>
      </div>

    </div>
  );
};
