"use client";

import React, { useState } from "react";
import { useSuperAdmin } from "src/context/SuperAdminContext";
import { Loader2, Bell, ShieldCheck, Check } from "lucide-react";

export default function NotificationsSettingsPage() {
  const { loading, triggerSuccess } = useSuperAdmin();
  const [updating, setUpdating] = useState(false);

  const [incidentEmail, setIncidentEmail] = useState(true);
  const [billingSms, setBillingSms] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState(true);

  const handleSave = () => {
    setUpdating(true);
    setTimeout(() => {
      setUpdating(false);
      triggerSuccess("Notification routing protocols updated!");
    }, 1200);
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 font-bold uppercase tracking-wider flex flex-col items-center justify-center select-none">
        <Loader2 className="w-8 h-8 animate-spin text-[#0f2e5c] mb-4" />
        <span>Syncing notification hooks...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200/50">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Notification Protocols</h1>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Configure system notification thresholds, email alerts, and SLA triggers.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Toggle list */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs text-left select-none space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">
              Notification Channels
            </h4>
          </div>

          <div className="space-y-5">
            {[
              { id: "incident", title: "Critical System Incidents", desc: "Instantly sends logs and traces via email on 5xx trigger spikes.", state: incidentEmail, setter: setIncidentEmail },
              { id: "billing", title: "Vendor Prepaid Low Balance SMS", desc: "Trigger low prepaid balances thresholds via Twilio SMS bridges.", state: billingSms, setter: setBillingSms },
              { id: "weekly", title: "Consolidated Weekly Growth Email", desc: "MRR summaries and platform connection capacity charts sent every Monday.", state: weeklyReport, setter: setWeeklyReport },
            ].map((channel) => (
              <div key={channel.id} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="text-left space-y-1">
                  <span className="text-xs font-black text-slate-900">{channel.title}</span>
                  <p className="text-[10px] text-slate-450 font-semibold leading-relaxed">{channel.desc}</p>
                </div>

                <button
                  onClick={() => channel.setter(!channel.state)}
                  className={`w-9 h-5 rounded-full p-0.5 transition duration-300 cursor-pointer shrink-0 ${
                    channel.state ? "bg-[#0f2e5c] flex justify-end" : "bg-slate-200 flex justify-start"
                  }`}
                >
                  <span className="w-4 h-4 bg-white rounded-full shadow-md" />
                </button>
              </div>
            ))}

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={handleSave}
                disabled={updating}
                className="h-10 px-5 bg-[#0F2D67] hover:bg-slate-950 disabled:opacity-50 text-xs font-bold text-white rounded-xl transition flex items-center space-x-2 shadow-md cursor-pointer"
              >
                {updating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving protocols...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Routing Protocols</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs flex flex-col justify-between select-none text-left">
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest block border-b border-slate-100 pb-2.5">
              Protocol Status
            </h4>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center space-x-3">
              <Bell className="w-5 h-5 text-indigo-700 shrink-0 animate-bounce" />
              <div className="leading-tight">
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Hooks Status</span>
                <span className="text-xs font-bold text-slate-800">nominal (0 retries in queue)</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl text-[10px] text-blue-750 font-medium leading-relaxed mt-6 flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-blue-650 shrink-0 mt-0.5" />
            <span>
              All notifications are HIPAA compliant and encrypted prior to transmission.
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
