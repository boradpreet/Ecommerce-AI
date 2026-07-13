"use client";

import React, { useState, useEffect } from "react";
import { useOnboardingStore } from "src/store/useOnboardingStore";
import { useAuthStore } from "src/store/authStore";
import { useRouter } from "next/navigation";
import { OnboardingLayout } from "src/components/onboarding/onboarding-layout";
import { StepBusinessType } from "src/components/onboarding/step-business-type";
import { StepIndustry } from "src/components/onboarding/step-industry";
import { StepDetails } from "src/components/onboarding/step-details";

export default function OnboardingPage() {
  const { isLoggedIn, setIsLoggedIn, step, setStep } = useOnboardingStore();
  const token = useAuthStore((s) => s.token);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { toast, clearToast, businessType, selectedIndustry, businessName } = useOnboardingStore();
  const user = useAuthStore((s) => s.user);

  const TOTAL_STEPS = 3;

  const isCurrentStepValid = () => {
    switch (step) {
      case 1: return businessType !== "Select Type" && !!businessType;
      case 2: return !!selectedIndustry;
      case 3: return !!businessName.trim();
      default: return true;
    }
  };

  useEffect(() => {
    if (step > TOTAL_STEPS) {
      setStep(1);
    }
  }, [step, setStep]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!token) router.replace("/");
  }, [token, hasHydrated, router]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (token && user?.has_completed_onboarding) router.replace("/dashboard");
  }, [token, user, hasHydrated, router]);

  useEffect(() => {
    if (token && !isLoggedIn) setIsLoggedIn(true);
  }, [token, isLoggedIn, setIsLoggedIn]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => clearToast(), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast, clearToast]);

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleContinue = async () => {
    const store = useOnboardingStore.getState();

    if (step === 1) {
      store.triggerToast("Step 1 Completed: Business type selected!", "success");
    }

    if (step === 2) {
      store.triggerToast("Step 2 Completed: Industry profile configured!", "success");
    }

    if (step === 3) {
      let isStepValid = true;
      const event = new CustomEvent("onboarding-save-step-3", {
        cancelable: true,
        detail: { setInvalid: () => { isStepValid = false; } }
      });
      window.dispatchEvent(event);
      if (!isStepValid) return;
    }

    if (step < TOTAL_STEPS) {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 400));
      setIsLoading(false);
      setStep(step + 1);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="text-sm font-semibold text-slate-500 animate-pulse">Loading Onboarding Portal...</div>
      </div>
    );
  }

  return (
    <>
      <OnboardingLayout
        onBack={handleBack}
        onContinue={handleContinue}
        isLoading={isLoading}
        isContinueDisabled={!isCurrentStepValid()}
        totalSteps={TOTAL_STEPS}
      >
        {step === 1 && <StepBusinessType />}
        {step === 2 && <StepIndustry />}
        {step === 3 && <StepDetails />}
      </OnboardingLayout>

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-[9999] max-w-sm w-full bg-white/90 backdrop-blur-md border border-slate-200 shadow-2xl rounded-2xl p-4 flex items-start space-x-3 animate-slide-in select-none">
          <div className={`p-1.5 rounded-full shrink-0 ${
            toast.type === "success" ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
            : toast.type === "error" ? "bg-red-50 text-red-600 border border-red-200"
            : "bg-blue-50 text-blue-600 border border-blue-200"
          }`}>
            {toast.type === "success" ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            ) : toast.type === "error" ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
          </div>
          <div className="flex-1 space-y-0.5 text-left">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              {toast.type === "success" ? "Success" : toast.type === "error" ? "Error" : "Info"}
            </span>
            <span className="text-xs font-bold text-slate-800 leading-relaxed block">{toast.message}</span>
          </div>
          <button onClick={clearToast} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}
    </>
  );
}
