"use client";

import React from "react";
import { useSuperAdmin } from "src/context/SuperAdminContext";
import SettingsTab from "src/components/superadmin/SettingsTab";
import { Loader2 } from "lucide-react";

export default function SuperAdminSettingsPage() {
  const {
    loading,
    concurrentStreams,
    setConcurrentStreams,
    maxTokens,
    setMaxTokens,
    whiteLabelEnabled,
    setWhiteLabelEnabled,
    vendorMargin,
    setVendorMargin,
    modelTemp,
    setModelTemp,
    sttBuffer,
    setSttBuffer,
    routingMode,
    setRoutingMode,
    savingSettings,
    handleSaveSettings,
    fetchAllAdminData,
    auditLogs,
  } = useSuperAdmin();

  const settingsData = React.useMemo(() => ({
    settings: {
      concurrent_streams: concurrentStreams,
      max_tokens: maxTokens,
      white_label_enabled: whiteLabelEnabled,
      vendor_margin: vendorMargin,
      model_temp: modelTemp,
      stt_buffer: sttBuffer,
      routing_mode: routingMode
    },
    audit_logs: auditLogs.length > 0 ? auditLogs : [
      { timestamp: "2026-05-28 14:22:10", actor: "Admin User X", action: "Changed Model Routing", target: "Vendor Y (ID: 9942)", status: "SUCCESS" },
      { timestamp: "2026-05-28 13:45:04", actor: "System Cron", action: "Auto-Scaled Inference Pods", target: "Cluster: us-east-1", status: "INFO" },
      { timestamp: "2026-05-28 12:01:33", actor: "Admin User X", action: "Updated API Key Expiry", target: "Vendor Z (ID: 1102)", status: "SUCCESS" }
    ]
  }), [concurrentStreams, maxTokens, whiteLabelEnabled, vendorMargin, modelTemp, sttBuffer, routingMode, auditLogs]);

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 font-bold uppercase tracking-wider flex flex-col items-center justify-center select-none">
        <Loader2 className="w-8 h-8 animate-spin text-[#0f2e5c] mb-4" />
        <span>Loading Platform Configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200/50">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Settings</h1>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Control global platform variables, regional connection margins, and audit trails.
          </p>
        </div>
      </div>
      <SettingsTab
        settingsData={settingsData}
        concurrentStreams={concurrentStreams}
        setConcurrentStreams={setConcurrentStreams}
        maxTokens={maxTokens}
        setMaxTokens={setMaxTokens}
        whiteLabelEnabled={whiteLabelEnabled}
        setWhiteLabelEnabled={setWhiteLabelEnabled}
        vendorMargin={vendorMargin}
        setVendorMargin={setVendorMargin}
        modelTemp={modelTemp}
        setModelTemp={setModelTemp}
        sttBuffer={sttBuffer}
        setSttBuffer={setSttBuffer}
        routingMode={routingMode}
        setRoutingMode={setRoutingMode}
        savingSettings={savingSettings}
        onSaveSettings={handleSaveSettings}
        onDiscardChanges={() => fetchAllAdminData(false)}
      />
    </div>
  );
}
