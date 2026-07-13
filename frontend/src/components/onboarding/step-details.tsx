"use client";

import React, { useState, useEffect } from "react";
import { useOnboardingStore } from "src/store/useOnboardingStore";
import { useAuthStore } from "src/store/authStore";
import { ChevronDown, Check, Loader2, Play, PhoneCall, PhoneOff } from "lucide-react";
import { apiFetch, getApiUrl } from "src/lib/api";

const ROLES = [
  "Founder / Co-founder",
  "CEO / Executive",
  "Product Manager",
  "Software Engineer",
  "Marketing / Growth",
  "Sales / Business Development",
  "Customer Support / Success",
  "Operations",
  "Finance / Accounts",
  "HR / Recruiting",
  "Agency / Consultant",
  "Other",
];

const USE_CASES = [
  "Lead Qualification",
  "Sales Outreach",
  "Appointment Booking",
  "Order Confirmation",
  "Delivery Updates",
  "Payment Reminders",
  "Loan Collection",
  "Inbound Support",
  "Customer Feedback",
  "Survey",
  "Renewal Reminders",
  "Cart Recovery",
  "Hiring",
  "Others",
];

export const StepDetails: React.FC = () => {
  const {
    businessName,
    selectedWorkflows,
    voiceMinutes,
    businessType,
    selectedIndustry,
    callDirection,
    setBusinessDetails,
    toggleWorkflow,
  } = useOnboardingStore();

  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const setAuthUser = useAuthStore((s) => s.setUser);

  // Local States
  const [role, setRole] = useState("Founder / Co-founder");
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [volumeId, setVolumeId] = useState("less_100k");

  // Launch modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deploymentStep, setDeploymentStep] = useState(0);
  const [apiSuccess, setApiSuccess] = useState(false);
  const [apiError, setApiError] = useState("");

  // Map initially if store already has values
  useEffect(() => {
    if (voiceMinutes >= 500000) {
      setVolumeId("more_500k");
    } else if (voiceMinutes >= 250000) {
      setVolumeId("100k_500k");
    } else {
      setVolumeId("less_100k");
    }
  }, [voiceMinutes]);

  // Handle outside click for dropdown
  useEffect(() => {
    const handleOutsideClick = () => setRoleDropdownOpen(false);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  const handleLaunch = async () => {
    if (!businessName.trim()) return;

    setIsModalOpen(true);
    setDeploymentStep(1);
    setApiError("");

    try {
      // Step 1: Simulated Profile Sync
      await new Promise((resolve) => setTimeout(resolve, 800));
      setDeploymentStep(2);

      // Step 2: Simulated AI voice pipeline calibration
      await new Promise((resolve) => setTimeout(resolve, 900));
      setDeploymentStep(3);

      // Step 3: Trigger API onboarding-complete
      const payload = {
        user_email: user?.email || "user@voqly.com",
        business_name: businessName,
        website_url: "",
        industry: selectedIndustry || "Other",
        tax_id: "",
        business_type: businessType || "Startup",
        company_size: "1-10 Employees",
        street_address: "",
        country: "United States",
        state_province: "",
        agent_name: "Evelyn",
        selected_voice: "21m00Tcm4TlvDq8ikWAM",
        voice_speaking_rate: 1.0,
        voice_pitch_variance: 0.0,
        voice_output_volume: 85.0,
        voice_test_script: "Hello! I am your new Voqly AI agent. How can I assist you with your operations today?",
        agent_system_prompt: `# IDENTITY\nYou are Evelyn, a senior client success representative from ${businessName}. Your goal is to help customers understand our solutions.\n\n# PERSONALITY\nMaintain a warm, professional, and efficient tone. Use short, conversational sentences designed for audio playback.`,
        selected_industry: selectedIndustry || "Other",
        compliance_hipaa: selectedIndustry === "Healthcare",
        selected_workflows: selectedWorkflows || [],
        team_members: [],
        selected_plan: "free",
        billing_cycle: "monthly",
        voice_minutes: volumeId === "less_100k" ? 50000 : volumeId === "100k_500k" ? 250000 : 500000,
        kb_files: [],
        kb_urls: [],
        kb_faqs: "",
        campaign_name: "Initial Outreach",
        call_direction: callDirection || "OUTBOUND",
        logo_url: null,
      };

      // Resolve the API base URL via the shared helper. On a production HTTPS
      // host this auto-rewrites a stale localhost build value to `${origin}/api/v1`,
      // so the request reaches the backend instead of the user's own machine.
      const apiUrl = getApiUrl();
      let response: Response;
      try {
        response = await fetch(`${apiUrl}/organizations/onboarding-complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch {
        throw new Error(
          `Could not reach the deployment server at ${apiUrl}. Please check your connection and try again.`
        );
      }

      if (!response.ok) {
        // Surface the real backend reason instead of a generic message.
        let detail = `Failed to deploy workspace configuration (HTTP ${response.status}).`;
        try {
          const errData = await response.json();
          if (errData?.detail) detail = String(errData.detail);
        } catch {
          /* response body was not JSON — keep the status-based message */
        }
        throw new Error(detail);
      }

      setDeploymentStep(4);
      setApiSuccess(true);

      // Refresh /auth/me to update auth state dynamically
      if (token) {
        try {
          const meData = await apiFetch<{ id: number; full_name: string; email: string; has_completed_onboarding?: boolean }>(
            "/auth/me",
            "GET",
            undefined,
            token
          );
          if (meData) {
            setAuthUser({
              id: meData.id,
              full_name: meData.full_name,
              email: meData.email,
              has_completed_onboarding: true,
            });
          }
        } catch {
          // Fallback user update if profile fail
          if (user) {
            setAuthUser({ ...user, has_completed_onboarding: true });
          }
        }
      } else if (user) {
        setAuthUser({ ...user, has_completed_onboarding: true });
      }

      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 2500);

    } catch (err) {
      setApiError(err instanceof Error ? err.message : "An unexpected error occurred during workspace launch.");
      setDeploymentStep(-1);
    }
  };

  // Add event listener to handle save step 3 when layout "Continue" is clicked
  useEffect(() => {
    const handleSave = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!businessName.trim()) {
        customEvent.detail?.setInvalid();
        return;
      }
      handleLaunch();
    };
    window.addEventListener("onboarding-save-step-3", handleSave);
    return () => window.removeEventListener("onboarding-save-step-3", handleSave);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessName, selectedWorkflows, volumeId, selectedIndustry, businessType]);

  return (
    <div className="w-full text-slate-800 text-left animate-fade-in select-none">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Left Column: Form Details */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-slate-950 tracking-tight">We need a few more details.</h2>
            <p className="text-xs text-slate-500 font-medium">
              Tell us about your organization and requirements to configure your first neural agent campaign.
            </p>
          </div>

          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            
            {/* Organization Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Name of organization *
              </label>
              <input
                type="text"
                placeholder="e.g. One Web Mart"
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 font-semibold transition"
                value={businessName}
                onChange={(e) => setBusinessDetails({ businessName: e.target.value })}
              />
            </div>

            {/* Your Role Dropdown */}
            <div className="space-y-1 relative">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Your role
              </label>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setRoleDropdownOpen(!roleDropdownOpen);
                }}
                className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 font-semibold cursor-pointer select-none"
              >
                <span>{role}</span>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${roleDropdownOpen ? "rotate-180" : ""}`} />
              </div>

              {roleDropdownOpen && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 overflow-hidden animate-fade-in">
                  {ROLES.map((r) => (
                    <div
                      key={r}
                      onClick={() => {
                        setRole(r);
                        setRoleDropdownOpen(false);
                      }}
                      className="px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 cursor-pointer flex justify-between items-center"
                    >
                      <span>{r}</span>
                      {role === r && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Call direction preference */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                How will your agent mostly call?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { v: "OUTBOUND", t: "Outbound", d: "Dial out to leads" },
                  { v: "INBOUND", t: "Inbound", d: "Answer incoming calls" },
                ] as const).map((o) => {
                  const active = (callDirection || "OUTBOUND") === o.v;
                  return (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setBusinessDetails({ callDirection: o.v })}
                      className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        active ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20" : "bg-white border-slate-200 hover:border-slate-350"
                      }`}
                    >
                      <p className="text-xs font-black text-slate-900">{o.t}</p>
                      <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{o.d}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Use cases (Multi-select Chips) */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Use cases
              </label>
              <div className="flex flex-wrap gap-2">
                {USE_CASES.map((uc) => {
                  const isSelected = selectedWorkflows.includes(uc);
                  return (
                    <button
                      key={uc}
                      type="button"
                      onClick={() => toggleWorkflow(uc)}
                      className={`px-4 py-2 rounded-full border text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-350"
                      }`}
                    >
                      {uc}
                    </button>
                  );
                })}
              </div>
            </div>
          </form>
        </div>

        {/* Right Column: Illustration Card */}
        <div className="lg:col-span-5 hidden lg:flex flex-col justify-center items-center bg-[#faf9f6] border border-slate-200 rounded-3xl p-8 relative overflow-hidden min-h-[500px] shadow-xs">
          
          {/* Wave vector background decals */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="wavyGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 0 20 Q 10 10, 20 20 T 40 20" fill="none" stroke="black" strokeWidth="2" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#wavyGrid)" />
            </svg>
          </div>

          {/* Premium Vector Phone Agent sitting on cloud */}
          <div className="w-full flex-1 flex flex-col items-center justify-center relative space-y-4">
            
            {/* SVG Agent Illustration */}
            <svg viewBox="0 0 400 400" className="w-72 h-72 animate-float">
              {/* Cloud Drawing */}
              <path
                d="M 120 280 C 90 280, 80 250, 90 230 C 70 210, 80 170, 110 160 C 120 120, 180 110, 210 130 C 240 100, 300 110, 310 150 C 340 160, 350 200, 330 220 C 340 240, 330 280, 290 280 Z"
                fill="#ffffff"
                stroke="#0f172a"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-md"
              />

              {/* Character Legs (sitting cross-legged) */}
              <path
                d="M 170 260 C 170 265, 190 290, 220 290 C 250 290, 260 265, 260 260"
                fill="none"
                stroke="#0f172a"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d="M 190 270 C 200 275, 230 275, 240 270"
                fill="none"
                stroke="#0f172a"
                strokeWidth="4"
                strokeLinecap="round"
              />
              {/* Shoes */}
              <path d="M 165 255 A 8 8 0 0 1 173 263 L 163 263 Z" fill="#0f172a" stroke="#0f172a" strokeWidth="2" />
              <path d="M 255 255 A 8 8 0 0 1 263 263 L 253 263 Z" fill="#0f172a" stroke="#0f172a" strokeWidth="2" />

              {/* Character Body (Shirt) */}
              <path
                d="M 185 190 L 245 190 L 250 260 L 180 260 Z"
                fill="#93c5fd"
                stroke="#0f172a"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Character Head */}
              <circle cx="215" cy="150" r="30" fill="#fef08a" stroke="#0f172a" strokeWidth="4" />
              
              {/* Curly Hair outline */}
              <path
                d="M 185 150 C 180 130, 200 110, 215 115 C 230 110, 250 130, 245 150 C 255 140, 250 115, 235 110 C 220 100, 200 105, 190 115 C 180 120, 175 135, 185 150 Z"
                fill="#0f172a"
                stroke="#0f172a"
                strokeWidth="2"
              />

              {/* Face Details */}
              <circle cx="205" cy="145" r="3" fill="#0f172a" />
              <circle cx="225" cy="145" r="3" fill="#0f172a" />
              {/* Smiling mouth */}
              <path d="M 210 160 Q 215 168, 220 160" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />

              {/* Left Arm holding phone receiver */}
              <path
                d="M 185 200 C 160 190, 150 160, 165 145"
                fill="none"
                stroke="#0f172a"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Hand */}
              <circle cx="165" cy="145" r="5" fill="#fef08a" stroke="#0f172a" strokeWidth="3" />

              {/* Phone Receiver */}
              <path
                d="M 155 125 C 158 135, 168 155, 172 165"
                fill="none"
                stroke="#0f172a"
                strokeWidth="10"
                strokeLinecap="round"
              />
              {/* Phone cord curly loop */}
              <path
                d="M 165 210 C 145 220, 130 200, 140 180 C 150 160, 135 150, 125 170"
                fill="none"
                stroke="#0f172a"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-pulse"
              />

              {/* Right Arm resting */}
              <path
                d="M 245 200 Q 260 215, 255 240"
                fill="none"
                stroke="#0f172a"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle cx="255" cy="240" r="5" fill="#fef08a" stroke="#0f172a" strokeWidth="3" />

              {/* Floating Sparks/Stars */}
              <g className="text-yellow-400">
                <path d="M 120 90 L 123 96 L 130 97 L 125 102 L 126 108 L 120 105 L 114 108 L 115 102 L 110 97 L 117 96 Z" fill="currentColor" className="animate-pulse" />
                <path d="M 290 80 L 292 84 L 297 85 L 293 89 L 294 94 L 290 92 L 286 94 L 287 89 L 283 85 L 288 84 Z" fill="currentColor" className="animate-pulse" />
              </g>
            </svg>

            {/* Speech bubble */}
            <div className="absolute top-10 right-4 bg-white border border-slate-200 shadow-lg rounded-2xl px-4 py-2.5 max-w-[160px] text-[10px] font-bold text-slate-700 leading-snug animate-bounce select-none">
              Deploy your campaign workspace in seconds! 🚀
            </div>
          </div>
        </div>

      </div>

      {/* ── Launch Popup / Deployment Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-100 flex flex-col items-center text-center space-y-6 select-none scale-in">
            
            {/* Smooth calling animation — connecting (blue) → live (emerald) → failed (red) */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-28 h-28 flex items-center justify-center">
                {deploymentStep === -1 ? (
                  <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 border-2 border-red-500 flex items-center justify-center shadow-lg">
                    <PhoneOff className="w-7 h-7" />
                  </div>
                ) : (
                  <>
                    {/* concentric call pulse rings */}
                    <span className={`absolute inset-0 rounded-full animate-ping ${apiSuccess ? "bg-emerald-400/15" : "bg-blue-400/15"}`} />
                    <span
                      className={`absolute inset-3 rounded-full animate-ping ${apiSuccess ? "bg-emerald-400/25" : "bg-blue-400/25"}`}
                      style={{ animationDuration: "1.6s" }}
                    />
                    <div className={`relative w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-colors duration-500 ${
                      apiSuccess ? "bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/30" : "bg-gradient-to-br from-blue-600 to-indigo-600 shadow-blue-500/30"
                    }`}>
                      <PhoneCall className="w-7 h-7" />
                    </div>
                    {apiSuccess && (
                      <span className="absolute bottom-0.5 right-0.5 w-6 h-6 rounded-full bg-white border border-emerald-100 flex items-center justify-center shadow animate-scale-in">
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3px]" />
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* live audio waveform */}
              {deploymentStep !== -1 && (
                <div className="flex items-end gap-1 h-6">
                  {[10, 18, 12, 22, 14, 20, 11, 16].map((h, i) => (
                    <div
                      key={i}
                      className={`w-1.5 rounded-full ${apiSuccess ? "bg-emerald-500 animate-bounce" : "bg-blue-500 animate-pulse"}`}
                      style={{ height: `${h}px`, animationDelay: `${i * 0.09}s`, animationDuration: apiSuccess ? "0.9s" : "1.2s" }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Message header */}
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-950">
                {apiSuccess ? "Workspace Deployed Live!" : deploymentStep === -1 ? "Deployment Failed" : "Launching Workspace"}
              </h3>
              <p className="text-xs text-slate-500 font-semibold px-4">
                {apiSuccess
                  ? "Redirecting you to the workspace dashboard..."
                  : deploymentStep === -1
                  ? "We encountered an issue provisioning your account."
                  : "Hang tight while we configure your neural AI agent pipelines."}
              </p>
            </div>

            {/* Simulated builds console logs */}
            <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left font-mono text-[10px] space-y-2.5 text-slate-600 font-bold shadow-inner">
              <div className="flex items-center space-x-2">
                {deploymentStep >= 1 ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[3px]" />
                ) : (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400 shrink-0" />
                )}
                <span className={deploymentStep >= 1 ? "text-slate-800" : "text-slate-400"}>
                  Profile synchronizer initialization
                </span>
              </div>

              <div className="flex items-center space-x-2">
                {deploymentStep >= 2 ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[3px]" />
                ) : deploymentStep === 1 ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
                )}
                <span className={deploymentStep >= 2 ? "text-slate-800" : "text-slate-400"}>
                  Provisioning Gemini neural voice agent
                </span>
              </div>

              <div className="flex items-center space-x-2">
                {deploymentStep >= 3 ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[3px]" />
                ) : deploymentStep === 2 ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
                )}
                <span className={deploymentStep >= 3 ? "text-slate-800" : "text-slate-400"}>
                  Applying compliance engine & guardrails
                </span>
              </div>

              <div className="flex items-center space-x-2">
                {deploymentStep >= 4 ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[3px]" />
                ) : deploymentStep === 3 ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
                )}
                <span className={deploymentStep >= 4 ? "text-slate-800" : "text-slate-400"}>
                  Database workspace creation complete
                </span>
              </div>
            </div>

            {/* Error Message & retry */}
            {apiError && (
              <div className="text-xs text-rose-600 font-bold border border-rose-100 bg-rose-50/50 rounded-xl p-3 w-full text-left">
                Error: {apiError}
              </div>
            )}

            {deploymentStep === -1 && (
              <button
                type="button"
                onClick={handleLaunch}
                className="h-10 px-6 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <span>Retry Deployment</span>
                <Play className="w-3.5 h-3.5 fill-white" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
