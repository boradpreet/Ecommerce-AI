"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { useSuperAdmin } from "src/context/SuperAdminContext";
import SystemHealthTab from "src/components/superadmin/SystemHealthTab";
import { Loader2 } from "lucide-react";

export default function SuperAdminSystemHealthPage() {
  const {
    loading,
    infraData,
    simulatedLogs,
    setSimulatedLogs,
    triggerSuccess,
    fetchAllAdminData,
  } = useSuperAdmin();

  const [lastChecked, setLastChecked] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Keep the console pinned to the newest real log line
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [simulatedLogs]);

  // Real re-fetch of infra health + audit-log stream
  const runHealthCheck = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchAllAdminData();
      setLastChecked(new Date().toLocaleTimeString());
    } finally {
      setRefreshing(false);
    }
  }, [fetchAllAdminData]);

  // Stamp the initial load time and auto-refresh every 20s (real data, no fake events)
  useEffect(() => {
    setLastChecked(new Date().toLocaleTimeString());
    const id = setInterval(() => { runHealthCheck(); }, 20000);
    return () => clearInterval(id);
  }, [runHealthCheck]);

  const handleClearLogs = () => {
    setSimulatedLogs([]);
    triggerSuccess("Terminal cleared.");
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 font-bold uppercase tracking-wider flex flex-col items-center justify-center select-none">
        <Loader2 className="w-8 h-8 animate-spin text-[#0f2e5c] mb-4" />
        <span>Gauging Infrastructure Nodes Health...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200/50">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Infrastructure Health</h1>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Live service telemetry from the running backend, real audit-event stream, and derived incident status.
          </p>
        </div>
      </div>
      <SystemHealthTab
        infraData={infraData}
        simulatedLogs={simulatedLogs}
        onClearLogs={handleClearLogs}
        onRefresh={runHealthCheck}
        refreshing={refreshing}
        lastChecked={lastChecked}
        terminalEndRef={terminalEndRef}
      />
    </div>
  );
}
