"use client";

import React from "react";
import { useOnboardingStore } from "src/store/useOnboardingStore";
import { Paintbrush, LayoutGrid } from "lucide-react";

export const StepWhiteLabel: React.FC = () => {
  const { brandColor, setBusinessDetails, businessName } = useOnboardingStore();

  const colors = [
    { id: "#2563eb", name: "Royal Blue" },
    { id: "#4f46e5", name: "Indigo Indigo" },
    { id: "#7c3aed", name: "Purple Passion" },
    { id: "#059669", name: "Emerald Green" },
  ];

  return (
    <div className="w-full space-y-6 text-slate-800 text-left animate-fade-in">
      
      {/* Title */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-slate-950 tracking-tight">White-labeling</h2>
        <p className="text-xs text-slate-500 font-medium">
          Customize dashboard palettes and provision dedicated hostnames for client-facing portals.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Colors selector */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
          <span className="text-xs font-bold text-slate-900 flex items-center">
            <Paintbrush className="w-4 h-4 mr-2 text-blue-600" /> Primary Branding Color
          </span>

          <div className="grid grid-cols-2 gap-3">
            {colors.map((color) => {
              const isSelected = brandColor === color.id;
              return (
                <div
                  key={color.id}
                  onClick={() => setBusinessDetails({ brandColor: color.id })}
                  className={`p-3 rounded-lg border cursor-pointer select-none transition-all flex items-center space-x-3.5 ${
                    isSelected
                      ? "bg-slate-50 border-slate-900 ring-1 ring-slate-900"
                      : "bg-white border-slate-200 hover:border-slate-350"
                  }`}
                >
                  <span className="w-5 h-5 rounded-full block shadow-inner" style={{ backgroundColor: color.id }} />
                  <span className="text-[10px] font-bold text-slate-700">{color.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom subdomain */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-900 flex items-center">
              <LayoutGrid className="w-4 h-4 mr-2 text-blue-600" /> Custom Domain
            </span>

            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
              Publish client-facing calling metrics dashboards under a dedicated organizational hostname.
            </p>
          </div>

          <div className="relative flex items-center">
            <span className="absolute left-3 text-xs text-slate-400 font-bold uppercase select-none">
              voice.
            </span>
            <input
              type="text"
              readOnly
              value={`${businessName.toLowerCase().replace(/[^a-z0-9]/g, "") || "acme"}.com`}
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 font-semibold outline-none pl-14"
            />
          </div>
        </div>

      </div>

    </div>
  );
};
