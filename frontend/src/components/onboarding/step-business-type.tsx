"use client";

import React from "react";
import { useOnboardingStore } from "src/store/useOnboardingStore";
import { Rocket, Layers, Building2, User, CheckCircle } from "lucide-react";

interface BusinessTypeOption {
  id: string;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}

const businessTypes: BusinessTypeOption[] = [
  {
    id: "Startup",
    label: "Startup",
    desc: "Fast-growing companies looking to scale customer outreach and lead qualification.",
    icon: Rocket,
  },
  {
    id: "Agency",
    label: "Agency",
    desc: "Managing multiple client calling campaigns, white-label dashboards, and provisioning sub-accounts.",
    icon: Layers,
  },
  {
    id: "Enterprise",
    label: "Enterprise",
    desc: "High-volume call operations with dedicated compliance guardrails, SSO, and custom integrations.",
    icon: Building2,
  },
  {
    id: "Individual / Creator",
    label: "Individual / Creator",
    desc: "Personal assistant agents, automated scheduling, or small scale calling utilities.",
    icon: User,
  },
];

export const StepBusinessType: React.FC = () => {
  const { businessType, setBusinessDetails } = useOnboardingStore();

  return (
    <div className="w-full space-y-6 text-slate-800 text-left animate-fade-in select-none">
      {/* Title block */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-slate-950 tracking-tight">What type of business are you?</h2>
        <p className="text-xs text-slate-500 font-medium">
          Select the option that best describes your organization structure so we can customize your workspace.
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {businessTypes.map((item) => {
          const isSelected = businessType === item.id;
          const Icon = item.icon;

          return (
            <div
              key={item.id}
              onClick={() => setBusinessDetails({ businessType: item.id })}
              className={`relative bg-white rounded-2xl border p-6 cursor-pointer select-none transition-all duration-300 ${
                isSelected
                  ? "border-blue-600 ring-2 ring-blue-600/10 shadow-md bg-blue-50/10"
                  : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
              }`}
            >
              {/* Header inside card */}
              <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                  isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  <Icon className="w-6 h-6" />
                </div>

                {isSelected && (
                  <CheckCircle className="w-5 h-5 text-blue-600 animate-scale-in" />
                )}
              </div>

              {/* Title & Desc */}
              <div className="space-y-1.5">
                <h4 className="text-sm font-bold text-slate-900">{item.label}</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  {item.desc}
                </p>
              </div>

              {/* SVG Decal background */}
              <div className={`absolute right-4 bottom-4 opacity-5 select-none pointer-events-none transition-all ${
                isSelected ? "text-blue-600 opacity-10 scale-110" : "text-slate-400"
              }`}>
                <Icon className="w-16 h-16" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
