"use client";

import React, { useRef } from "react";
import Image from "next/image";
import { useOnboardingStore } from "src/store/useOnboardingStore";
import { ShieldCheck, Info } from "lucide-react";

export const StepProfile: React.FC = () => {
  const {
    businessName, websiteUrl, industry, taxId, businessType,
    companySize, streetAddress, country, stateProvince, companyLogo,
    setBusinessDetails, triggerToast
  } = useOnboardingStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      triggerToast("File is too large. Maximum size is 2MB.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setBusinessDetails({ companyLogo: event.target?.result as string });
      triggerToast("Company logo uploaded successfully!", "success");
    };
    reader.readAsDataURL(file);
  };

  React.useEffect(() => {
    const handleSave = (e: Event) => {
      const customEvent = e as CustomEvent;
      const s = useOnboardingStore.getState();
      const isValid = !!(
        s.businessName.trim() &&
        s.industry.trim() &&
        s.streetAddress.trim() &&
        s.country.trim() &&
        s.stateProvince.trim()
      );
      if (!isValid) {
        customEvent.detail?.setInvalid();
        s.triggerToast("Please fill in all required profile fields.", "error");
        return;
      }
      s.triggerToast("Step 1 Completed: Business Profile details verified!", "success");
    };
    window.addEventListener("onboarding-save-step-1", handleSave);
    return () => window.removeEventListener("onboarding-save-step-1", handleSave);
  }, []);

  return (
    <div className="w-full space-y-6 text-slate-800 text-left animate-fade-in select-none">
      <div className="space-y-1">
        <span className="text-blue-600 text-xs font-bold tracking-wider uppercase block mb-1">Step 1 of 15</span>
        <h2 className="text-2xl font-bold text-slate-950 tracking-tight">Business Details</h2>
        <p className="text-xs text-slate-500 font-medium">
          Provide the foundational details for your business entity.
        </p>
      </div>

      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>

        {/* Card 1: Identity */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Identity</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Business Name *</label>
                <input type="text" placeholder="e.g. Acme Corp"
                  className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 font-semibold"
                  value={businessName} onChange={(e) => setBusinessDetails({ businessName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Website URL <span className="text-slate-400 font-normal normal-case">(optional)</span>
                </label>
                <input type="text" placeholder="https://acme.com"
                  className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 font-semibold"
                  value={websiteUrl} onChange={(e) => setBusinessDetails({ websiteUrl: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Industry *</label>
              <input type="text" placeholder="e.g. Telecommunications, Healthcare, Finance..."
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 font-semibold"
                value={industry} onChange={(e) => setBusinessDetails({ industry: e.target.value })} />
            </div>

            {/* Logo upload */}
            <div className="space-y-2 pt-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Company Logo <span className="text-slate-400 font-normal normal-case">(optional, max 2MB)</span>
              </label>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
              {companyLogo ? (
                <div className="flex items-center space-x-4 p-3 bg-slate-50 border border-slate-200 rounded-xl max-w-sm">
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-blue-500 shadow-sm shrink-0 bg-white flex items-center justify-center relative">
                    <Image src={companyLogo} alt="Logo" fill className="object-cover" />
                  </div>
                  <div className="space-y-1 text-left">
                    <span className="text-xs font-bold text-slate-900 block">Logo Uploaded</span>
                    <button type="button" onClick={handleLogoUploadClick}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-extrabold hover:underline outline-none cursor-pointer">
                      Change Logo
                    </button>
                  </div>
                </div>
              ) : (
                <div onClick={handleLogoUploadClick}
                  className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50/50 transition-all select-none max-w-sm bg-slate-50">
                  <svg className="w-6 h-6 text-slate-400 mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span className="text-[11px] font-bold text-slate-700">Upload Company Logo</span>
                  <span className="text-[9px] text-slate-450 font-semibold mt-0.5">PNG, JPG or SVG · max 2MB</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Status Card */}
          <div className="w-full lg:w-56 rounded-xl bg-[#0f2e5c] text-white p-5 flex flex-col justify-center space-y-3 shrink-0 shadow-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,_transparent_1px),_linear-gradient(90deg,_rgba(255,255,255,0.015)_1px,_transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
            <div className="space-y-1 z-10">
              <h4 className="text-xs font-bold">Verify Status</h4>
              <p className="text-[10px] text-slate-300 leading-relaxed">Details provided here are used for AI voice training context.</p>
            </div>
          </div>
        </div>

        {/* Card 2: Compliance & Tax */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Compliance & Tax</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">GST / Tax Number</label>
                <Info className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <input type="text" placeholder="e.g. 22AAAAA0000A1Z5"
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 font-semibold"
                value={taxId} onChange={(e) => setBusinessDetails({ taxId: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Business Type</label>
              <select className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-600 font-semibold"
                value={businessType} onChange={(e) => setBusinessDetails({ businessType: e.target.value })}>
                <option value="Select Type">Select Type</option>
                <option value="Corporation">Corporation</option>
                <option value="Partnership">Partnership</option>
                <option value="Sole Proprietorship">Sole Proprietorship</option>
                <option value="LLC">Limited Liability Company (LLC)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Company Size</label>
              <select className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-600 font-semibold"
                value={companySize} onChange={(e) => setBusinessDetails({ companySize: e.target.value })}>
                <option value="1-10 Employees">1-10 Employees</option>
                <option value="11-50 Employees">11-50 Employees</option>
                <option value="51-200 Employees">51-200 Employees</option>
                <option value="200+ Employees">200+ Employees</option>
              </select>
            </div>
          </div>
        </div>

        {/* Card 3: Registered Address — NO MAP */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Registered Address</h3>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Street Address *</label>
            <textarea rows={2} placeholder="Suite 400, Innovation Drive..."
              className="flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 resize-none font-semibold"
              value={streetAddress} onChange={(e) => setBusinessDetails({ streetAddress: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Country *</label>
              <input type="text" placeholder="e.g. United States"
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 font-semibold"
                value={country} onChange={(e) => setBusinessDetails({ country: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">State / Province *</label>
              <input type="text" placeholder="e.g. California"
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 font-semibold"
                value={stateProvince} onChange={(e) => setBusinessDetails({ stateProvince: e.target.value })} />
            </div>
          </div>
        </div>

      </form>
    </div>
  );
};
