"use client";

import React from "react";
import { useOnboardingStore } from "src/store/useOnboardingStore";
import {
  PlusSquare, Home, ShoppingCart, ShieldCheck, Landmark, MoreHorizontal,
  GraduationCap, Plane, UtensilsCrossed, Car, Users, Truck, RadioTower,
  Hotel, CheckCircle, AlertCircle
} from "lucide-react";

interface IndustryItem {
  id: string;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  compliance: string;
}

// Ids match the AI Agent Catalog categories so the vendor's chosen industry
// surfaces the matching ready-made agents in agent creation.
const industries: IndustryItem[] = [
  { id: "E-commerce", label: "E-commerce", desc: "Order confirmation, COD verification, delivery updates, abandoned-cart recovery and support.", icon: ShoppingCart, compliance: "Your voice agents are optimized for high-volume order and delivery workflows." },
  { id: "Healthcare", label: "Healthcare", desc: "Appointment booking, reminders, patient follow-ups and prescription reminders.", icon: PlusSquare, compliance: "By selecting Healthcare, your account is prioritized for HIPAA-compliant server nodes and encrypted data residency." },
  { id: "Real Estate", label: "Real Estate", desc: "Lead qualification, property inquiries and site-visit scheduling.", icon: Home, compliance: "Compliance models suited for housing guidelines and regional disclosure scripts." },
  { id: "Banking & Finance", label: "Banking & Finance", desc: "Loan verification, EMI reminders, KYC calls and customer service.", icon: Landmark, compliance: "Banking-grade security overlays for verification and payment workflows." },
  { id: "Insurance", label: "Insurance", desc: "Policy renewals, claim status and lead generation.", icon: ShieldCheck, compliance: "High-precision guardrails for policy and claim verification." },
  { id: "Education", label: "Education", desc: "Admission counseling, fee reminders and student support.", icon: GraduationCap, compliance: "Workflows tuned for admissions and student engagement." },
  { id: "Travel & Hospitality", label: "Travel & Hospitality", desc: "Hotel bookings, flight updates and reservation confirmation.", icon: Plane, compliance: "Optimized for bookings, itineraries and travel notifications." },
  { id: "Hotel", label: "Hotel", desc: "Room reservations, guest support, event & banquet booking, promotions and post-stay feedback.", icon: Hotel, compliance: "Purpose-built for reservations, guest service, event sales and loyalty workflows." },
  { id: "Restaurants", label: "Restaurants", desc: "Table reservations and food-order confirmation.", icon: UtensilsCrossed, compliance: "Fast reservation and order-confirmation flows." },
  { id: "Automotive", label: "Automotive", desc: "Service reminders, test-drive bookings and sales follow-up.", icon: Car, compliance: "Service and sales follow-up workflows for dealerships." },
  { id: "Recruitment & HR", label: "Recruitment & HR", desc: "Interview scheduling and candidate screening.", icon: Users, compliance: "Candidate engagement and scheduling workflows." },
  { id: "Logistics", label: "Logistics", desc: "Delivery confirmation and shipment tracking.", icon: Truck, compliance: "Delivery and tracking notification workflows." },
  { id: "Telecom", label: "Telecom", desc: "Customer onboarding, plan upgrades and retention campaigns.", icon: RadioTower, compliance: "Onboarding, upsell and retention workflows for telecom." },
  { id: "Other", label: "Other (Custom)", desc: "Build a custom industry — write your own agents and prompts.", icon: MoreHorizontal, compliance: "Custom-configured workflows tailored to your exact niche in the AI Agents section." },
];

// Map legacy stored industry ids (from accounts onboarded before the 12-industry
// catalog) onto the current catalog category ids, so old accounts still line up.
const LEGACY_INDUSTRY_MAP: Record<string, string> = {
  "E-Commerce": "E-commerce",
  "Ecommerce": "E-commerce",
  "FinTech": "Banking & Finance",
  "Finance": "Banking & Finance",
};
export const normalizeIndustry = (id: string): string => LEGACY_INDUSTRY_MAP[id] || id || "";

export const StepIndustry: React.FC = () => {
  const { selectedIndustry, setSelectedIndustry } = useOnboardingStore();
  const currentIndustry = normalizeIndustry(selectedIndustry);

  const activeIndustry = industries.find((i) => i.id === currentIndustry) || industries[0];

  return (
    <div className="w-full space-y-6 text-slate-800">
      
      {/* Title */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-slate-950 tracking-tight">What industry are you in?</h2>
        <p className="text-xs text-slate-500 font-medium">
          {"We'll tailor your voice model and guardrails to your industry's specific compliance needs."}
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {industries.map((item) => {
          const isSelected = currentIndustry === item.id;
          const Icon = item.icon;

          return (
            <div
              key={item.id}
              onClick={() => setSelectedIndustry(item.id, item.id === "Healthcare")}
              className={`relative bg-white rounded-xl border p-5 cursor-pointer select-none transition-all duration-300 ${
                isSelected
                  ? "border-blue-600 ring-2 ring-blue-600/10 shadow-md"
                  : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
              }`}
            >
              {/* Header inside card */}
              <div className="flex justify-between items-start mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  <Icon className="w-5 h-5" />
                </div>

                {isSelected && (
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                )}
              </div>

              {/* Title & Desc */}
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-900">{item.label}</h4>
                <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                  {item.desc}
                </p>
              </div>

              {/* SVG Decal background */}
              <div className="absolute right-0 bottom-0 opacity-5 select-none pointer-events-none">
                <Icon className="w-16 h-16" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Compliance Engine Alert banner */}
      <div className="bg-amber-100 border border-amber-200 rounded-xl p-5 flex items-start space-x-3 shadow-inner">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-amber-800">Compliance Engine</h4>
          <p className="text-[11px] text-amber-700 leading-relaxed font-semibold">
            {activeIndustry.compliance}
          </p>
        </div>
      </div>

    </div>
  );
};
