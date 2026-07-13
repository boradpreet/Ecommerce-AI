"use client";

import React, { useState } from "react";
import { useOnboardingStore } from "src/store/useOnboardingStore";
import {
  Building2,
  HelpCircle, Check, Settings, Menu
} from "lucide-react";

interface StepItem {
  id: number;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  optional?: boolean;
  skippable?: boolean;
}

const wizardSteps: StepItem[] = [
  { id: 1,  label: "Business Type",      icon: Building2 },
  { id: 2,  label: "Industry Selection", icon: Settings },
  { id: 3,  label: "Additional Details", icon: HelpCircle },
];

interface OnboardingLayoutProps {
  children: React.ReactNode;
  onBack: () => void;
  onContinue: () => void;
  isLoading?: boolean;
  isContinueDisabled?: boolean;
  totalSteps?: number;
  onSkip?: () => void;
}

export const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
  children,
  onBack,
  onContinue,
  isLoading,
  isContinueDisabled,
  totalSteps = 3,
  onSkip,
}) => {
  const { step, setStep } = useOnboardingStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col justify-between font-sans">

      {/* Top Header */}
      <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm z-20 select-none">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden md:block p-1.5 -ml-1.5 text-slate-500 rounded-lg hover:bg-slate-100 transition"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="flex items-center space-x-1.5 select-none">
            <span className="text-base font-extrabold tracking-wider text-slate-800 lowercase">voqly</span>
            <div className="px-2 py-0.5 rounded-lg bg-black flex items-center justify-center text-white font-black text-[9px] uppercase tracking-wider">AI</div>
          </div>
          <span className="text-slate-300">|</span>
          <span className="text-xs font-semibold text-slate-500">Step {step} of {totalSteps}</span>
        </div>
      </header>

      <div className="flex-1 flex flex-row items-stretch">

        {/* Sidebar */}
        {sidebarOpen && (
        <aside className="w-56 bg-[#f1f5f9] border-r border-slate-200 p-5 flex flex-col justify-between hidden md:flex shrink-0">
          <div className="space-y-5">
            <div className="space-y-2 text-left">
              <h4 className="text-sm font-bold text-slate-800">Voqly AI</h4>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">Onboarding Wizard</p>
              <div className="space-y-1 pt-1">
                <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-500"
                    style={{ width: `${(step / totalSteps) * 100}%` }}
                  />
                </div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Step {step} of {totalSteps}
                </div>
              </div>
            </div>

            <nav className="flex flex-col space-y-0.5 max-h-[calc(100vh-220px)] overflow-y-auto pr-1 select-none w-full">
              {wizardSteps.map((s) => {
                const isActive = step === s.id;
                const isVisited = step > s.id;
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    onClick={() => { if (s.id <= step) setStep(s.id); }}
                    className={`flex items-center space-x-2.5 px-3 py-2 rounded-lg text-left text-xs font-semibold transition-all w-full cursor-pointer ${
                      isActive
                        ? "bg-blue-600 text-white shadow-md"
                        : isVisited
                        ? "text-slate-700 hover:bg-slate-200/50"
                        : "text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-white" : isVisited ? "text-slate-500" : "text-slate-400"}`} />
                    <span className="truncate flex-1 font-bold">{s.label}</span>
                    {s.optional && !isActive && (
                      <span className="text-[8px] text-slate-400 font-bold shrink-0">opt</span>
                    )}
                    {isVisited && (
                      <Check className="w-3 h-3 text-emerald-500 shrink-0 stroke-[3px]" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-left">
            SECURE PORTAL
          </div>
        </aside>
        )}

        {/* Main content */}
        <main className="flex-1 bg-[#f8fafc] p-6 md:p-10 overflow-y-auto flex justify-center items-start">
          <div className="w-full max-w-4xl space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Footer — extra right padding so Back/Continue clear the floating chat widget */}
      <footer className="h-16 bg-white border-t border-slate-200 pl-6 pr-20 md:pr-28 flex items-center justify-between shadow-md z-20 select-none">
        <div className="text-[10px] md:text-xs text-slate-500 font-semibold">
          © {new Date().getFullYear()} Voqly AI. All progress is auto-saved.
        </div>

        <div className="flex items-center space-x-3">
          {/* Skip button — only shown when onSkip is provided */}
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="h-10 px-4 text-xs font-bold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
            >
              Skip
            </button>
          )}

          <button
            type="button"
            onClick={onBack}
            className="h-10 px-5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer"
          >
            Back
          </button>

          <button
            type="button"
            onClick={onContinue}
            disabled={isLoading || isContinueDisabled}
            className="h-10 px-5 text-xs font-bold text-white bg-[#0f2e5c] hover:bg-[#1e40af] rounded-lg hover:shadow-md active:scale-[0.98] transition-all flex items-center justify-center min-w-[90px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : step === totalSteps ? (
              "Complete"
            ) : (
              "Continue"
            )}
          </button>
        </div>
      </footer>
    </div>
  );
};
