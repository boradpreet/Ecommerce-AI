"use client";

import React, { useState } from "react";
import { useVendorDetail } from "../context";
import { useSuperAdmin } from "src/context/SuperAdminContext";
import { Settings, Check, Loader2 } from "lucide-react";
import { useAuthStore } from "src/store/authStore";
import { apiFetch } from "src/lib/api";
import InboundNumbersPanel from "src/components/superadmin/InboundNumbersPanel";

export default function VendorDetailSettingsPage() {
  const { vendorDetail, handleLocalToggleSuspension, updateDetailFields } = useVendorDetail();
  const { triggerSuccess, triggerError } = useSuperAdmin();

  const [saving, setSaving] = useState(false);
  const [concurrency, setConcurrency] = useState(String(vendorDetail?.concurrency_limit || 150));
  const [tier, setTier] = useState(vendorDetail?.plan || "Growth");
  const [margin, setMargin] = useState("12.5");

  if (!vendorDetail) return null;


  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = useAuthStore.getState().token;
      await apiFetch(`/superadmin/vendors/${vendorDetail.id}/settings`, "PUT", {
        concurrency_limit: parseInt(concurrency) || 150,
        plan_tier: tier.toLowerCase()
      }, token);

      updateDetailFields({
        concurrency_limit: parseInt(concurrency) || 150,
        plan: tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase()
      });
      triggerSuccess(`Settings updated successfully for ${vendorDetail.name}!`);
    } catch (err) {
      console.error(err);
      triggerError(err instanceof Error ? err.message : "Failed to save vendor settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* settings dials */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Configurations Dial */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs text-left">
          <div className="border-b border-slate-100 pb-3 mb-6 select-none flex items-center gap-1.5">
            <Settings className="w-4 h-4 text-blue-650" />
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">
              Tenant Variable Controls
            </h4>
          </div>

          <form onSubmit={handleSave} className="space-y-5 text-left">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1.5">Concurrency Limit Channels</label>
                <input
                  type="number"
                  value={concurrency}
                  onChange={(e) => setConcurrency(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-950 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1.5">Platform Margin (%)</label>
                <input
                  type="text"
                  value={margin}
                  onChange={(e) => setMargin(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-955 outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-500 font-bold block mb-1.5">Subscription Plan Tier</label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="Starter">Starter Plan</option>
                <option value="Growth">Growth Plan</option>
                <option value="Enterprise">Enterprise Plan</option>
              </select>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end select-none">
              <button
                type="submit"
                disabled={saving}
                className="h-10 px-5 bg-[#0F2D67] hover:bg-slate-950 disabled:opacity-50 text-xs font-bold text-white rounded-xl transition flex items-center space-x-2 shadow-md cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Committing Dials...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Configurations</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Danger zone actions */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs flex flex-col justify-between text-left select-none border-red-100 bg-red-50/10">
          <div className="space-y-4">
            <h4 className="text-xs font-black text-red-655 uppercase tracking-widest block border-b border-red-100 pb-2.5">
              Administrative Lockdowns
            </h4>

            <div className="space-y-3.5 leading-relaxed text-xs text-slate-550 font-medium">
              <p>
                Suspending the organization blocks WebRTC streams, API key validations, and dials incoming SIP trunks instantly.
              </p>
              <p>
                Ledger status will remain active for administrative queries, allowing billing and audit downloads.
              </p>
            </div>
          </div>

          <div className="pt-6">
            <button
              onClick={handleLocalToggleSuspension}
              className={`w-full h-10 text-xs font-bold uppercase rounded-xl border transition cursor-pointer select-none ${
                vendorDetail.status === "SUSPENDED"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                  : "bg-red-600 hover:bg-red-750 text-white border-red-600"
              }`}
            >
              {vendorDetail.status === "SUSPENDED" ? "Unsuspend Organization" : "Suspend Organization"}
            </button>
          </div>
        </div>

      </div>

      {/* Inbound calling — assign platform numbers to this vendor's agents */}
      <InboundNumbersPanel
        vendorId={vendorDetail.id}
        agents={((vendorDetail as unknown as { agents?: { id: number; name: string }[] }).agents) || []}
        defaultProvider={vendorDetail.telephony_provider || "plivo"}
        defaultNumber={(vendorDetail.telephony_provider === "twilio" ? vendorDetail.twilio_number : vendorDetail.plivo_number) || ""}
      />

    </div>
  );
}
