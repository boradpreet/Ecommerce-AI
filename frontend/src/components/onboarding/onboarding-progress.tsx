import React from "react";
import { Check } from "lucide-react";

interface ProgressProps {
  currentStep: number;
}

const steps = [
  { id: 1, label: "Account", desc: "Security setup" },
  { id: 2, label: "Organization", desc: "Workplace setup" },
  { id: 3, label: "Agent Config", desc: "Voice selections" },
  { id: 4, label: "Campaign", desc: "Call routing" },
];

export const OnboardingProgress: React.FC<ProgressProps> = ({ currentStep }) => {
  return (
    <div className="w-full">
      {/* Desktop Step Progression Line */}
      <div className="hidden md:flex justify-between items-center relative w-full mb-8">
        {/* Connection bar */}
        <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-white/[0.04] -translate-y-1/2 z-0" />
        <div 
          className="absolute top-1/2 left-0 h-[2px] bg-gradient-to-r from-indigo-500 to-violet-500 -translate-y-1/2 z-0 transition-all duration-500 ease-out" 
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((step) => {
          const isCompleted = currentStep > step.id;
          const isActive = currentStep === step.id;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              {/* Step indicator circle */}
              <div 
                className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-500 backdrop-blur-md ${
                  isCompleted 
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                    : isActive
                    ? "bg-slate-900 border-indigo-500 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.25)]"
                    : "bg-slate-950 border-white/[0.08] text-slate-500"
                }`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span className="text-xs font-semibold">{step.id}</span>
                )}
              </div>
              
              {/* Label & Description */}
              <div className="mt-2 text-center">
                <p className={`text-xs font-medium transition-colors duration-300 ${isActive ? "text-white" : isCompleted ? "text-indigo-400" : "text-slate-400"}`}>
                  {step.label}
                </p>
                <p className="text-[10px] text-slate-500 hidden lg:block mt-0.5">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile Step Progression Tracker */}
      <div className="md:hidden flex flex-col space-y-2 mb-6">
        <div className="flex justify-between items-center text-xs">
          <span className="text-indigo-400 font-semibold uppercase tracking-wider">Step {currentStep} of 4</span>
          <span className="text-white font-medium">{steps[currentStep - 1].label}</span>
        </div>
        <div className="w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500 ease-out" 
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
