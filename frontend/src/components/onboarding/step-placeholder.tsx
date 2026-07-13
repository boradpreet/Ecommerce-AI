"use client";

import React from "react";
import { useOnboardingStore } from "src/store/useOnboardingStore";
import { Sliders, Globe, Shield, CreditCard, Activity } from "lucide-react";

interface PlaceholderProps {
  title: string;
  desc: string;
  stepId: number;
}

export const StepPlaceholder: React.FC<PlaceholderProps> = ({ title, desc, stepId }) => {
  const { businessName } = useOnboardingStore();

  const getStepIcon = () => {
    switch (stepId) {
      case 3: return <Globe className="w-8 h-8 text-blue-600" />;
      case 6: return <Shield className="w-8 h-8 text-blue-600" />;
      case 11: return <CreditCard className="w-8 h-8 text-blue-600" />;
      default: return <Activity className="w-8 h-8 text-blue-600" />;
    }
  };

  return (
    <div className="w-full space-y-6 text-slate-800 animate-fade-in text-left">
      
      {/* Title */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-slate-950 tracking-tight">{title}</h2>
        <p className="text-xs text-slate-500 font-medium">{desc}</p>
      </div>

      {/* Main card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row gap-6 items-center">
        
        <div className="w-16 h-16 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 shadow-inner">
          {getStepIcon()}
        </div>

        <div className="flex-1 space-y-2">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Step {stepId} Configuration
          </h4>
          <p className="text-xs text-slate-500 font-semibold leading-relaxed">
            Voqly AI compliance engine is automatically calibrating **{businessName || "your enterprise"}** workspace parameters. 
            No manual configuration is required for this step.
          </p>
        </div>

      </div>

      {/* Interactive Sliders sub card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <span className="text-xs font-bold text-slate-900 flex items-center">
          <Sliders className="w-4 h-4 mr-2 text-blue-600 animate-pulse" /> Advanced Calibration Metrics
        </span>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Automatic Priority Weight</span>
              <span className="text-blue-650 font-bold">98% Optimized</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="w-[98%] h-full bg-blue-600" />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Dynamic Latency Shield</span>
              <span className="text-blue-655 font-bold">0.4ms Target</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="w-[85%] h-full bg-blue-600" />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
