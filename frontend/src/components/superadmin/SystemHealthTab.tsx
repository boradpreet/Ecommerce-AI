import React from "react";
import { Database, Cpu, Phone, Server, Globe, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { InfraData } from "src/types/system";

interface SystemHealthTabProps {
  infraData: InfraData | null;
  simulatedLogs: string[];
  onClearLogs: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  lastChecked: string;
  terminalEndRef: React.RefObject<HTMLDivElement | null>;
}

const SERVICE_ICON: Record<string, React.ElementType> = {
  database: Database,
  api: Server,
  llm: Cpu,
  telephony: Phone,
  webhook: Globe,
};

const dotColor = (status: string) =>
  status === "nominal" ? "bg-emerald-500" : status === "warning" ? "bg-amber-500" : "bg-red-500 animate-pulse";

export default function SystemHealthTab({
  infraData,
  simulatedLogs,
  onClearLogs,
  onRefresh,
  refreshing,
  lastChecked,
  terminalEndRef,
}: SystemHealthTabProps) {
  if (!infraData) return null;

  const { incident } = infraData;
  const severity = incident.severity || (incident.status === "Resolved" ? "none" : "high");

  const badge =
    severity === "high"
      ? { label: "Critical", cls: "bg-red-50 border-red-200 text-red-600" }
      : severity === "medium"
        ? { label: "Degraded", cls: "bg-amber-50 border-amber-200 text-amber-600" }
        : { label: "Operational", cls: "bg-emerald-50 border-emerald-200 text-emerald-600" };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch animate-fade-in text-left select-none">

      {/* Left Column: Health list & scrolling events logs */}
      <div className="lg:col-span-2 space-y-6 flex flex-col justify-between">

        {/* Status grid — real services */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {infraData.services.map((srv) => {
            const Icon = SERVICE_ICON[srv.id] || Server;
            return (
              <div key={srv.id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-3xs flex flex-col justify-between min-h-[128px] relative hover:scale-[1.02] transition-transform">
                <span className={`w-2.5 h-2.5 rounded-full absolute top-5 right-5 ${dotColor(srv.status)}`} />

                <div className="space-y-0.5 text-left">
                  <Icon className={`w-5 h-5 ${srv.status === "nominal" ? "text-blue-600" : srv.status === "warning" ? "text-amber-500" : "text-red-500"}`} />
                  <h4 className="text-xs font-black text-slate-900 mt-2 block">{srv.name}</h4>
                </div>

                <div className="leading-tight mt-2 text-left">
                  <span className="text-[11px] font-black text-slate-800">{srv.uptime}</span>
                  <p className="text-[9px] text-slate-400 font-bold block mt-1 font-mono">
                    {srv.latency && srv.latency !== "—" ? `${srv.latency} · ` : ""}{srv.detail || ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dark System event logger window — real audit stream */}
        <div className="bg-slate-950 rounded-3xl p-6 border border-slate-900 text-left font-mono space-y-4 shadow-xl flex-1 flex flex-col justify-between min-h-[360px] relative">

          <div className="flex justify-between items-center select-none border-b border-slate-900 pb-3.5 mb-2">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
              <span className="text-[9.5px] font-sans font-black text-slate-500 uppercase tracking-widest ml-3">system_events.log</span>
            </div>

            <div className="flex items-center space-x-4 text-[9px] font-sans font-bold text-slate-400 uppercase">
              {lastChecked && <span className="text-slate-600 normal-case tracking-normal">synced {lastChecked}</span>}
              <button
                type="button"
                onClick={onClearLogs}
                className="hover:text-slate-100 cursor-pointer outline-none"
              >
                Clear Screen
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 max-h-[290px] pr-2 text-left select-text">
            {simulatedLogs.length === 0 ? (
              <div className="text-[9.5px] text-slate-600 font-semibold">No audit events yet.</div>
            ) : simulatedLogs.map((log, idx) => {
              const isError = log.includes("[ERROR]");
              const isWarn = log.includes("[WARN]");
              const isDebug = log.includes("[DEBUG]");
              return (
                <div key={idx} className="text-[9.5px] font-semibold leading-relaxed tracking-wide truncate">
                  <span className="text-blue-500 mr-2 shrink-0">›</span>
                  <span className={
                    isError
                      ? "text-red-400 font-bold bg-red-950/20 px-1 rounded"
                      : isWarn
                        ? "text-amber-400 font-bold bg-amber-950/20 px-1 rounded"
                        : isDebug
                          ? "text-slate-500 font-bold"
                          : "text-slate-200"
                  }>
                    {log}
                  </span>
                </div>
              );
            })}
            <div ref={terminalEndRef} />
          </div>
        </div>
      </div>

      {/* Right Column: Real health summary */}
      <div className="bg-[#fcfdfd] border border-slate-200 rounded-3xl p-6 shadow-3xs flex flex-col justify-between min-h-[460px] relative text-left">

        <div className="space-y-6">
          <div className="flex justify-between items-start select-none pb-4 border-b border-slate-100">
            <div>
              <span className={`text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border ${badge.cls}`}>
                {badge.label}
              </span>
              <h3 className="text-sm font-black text-slate-900 mt-2.5">Platform Status</h3>
              <span className="text-[10px] text-slate-400 font-mono font-bold">{incident.id}</span>
            </div>
            {severity === "none"
              ? <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              : <AlertTriangle className="w-6 h-6 text-amber-500" />}
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left">
                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">STATUS</span>
                <span className="text-xs font-black text-slate-900 mt-1.5 flex items-center space-x-1.5">
                  <span className={`w-2 h-2 rounded-full ${incident.status === "Resolved" ? "bg-emerald-500" : "bg-red-500 animate-pulse"}`} />
                  <span>{incident.status}</span>
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left">
                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">DETECTED</span>
                <span className="text-xs font-black text-slate-900 block mt-1.5 font-mono">{incident.detected}</span>
              </div>
            </div>

            <div className="text-left space-y-1.5">
              <h5 className="text-xs font-black text-slate-900">{incident.title}</h5>
              <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">{incident.description}</p>
            </div>

            {/* Real detail / error trace box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left font-mono text-[9px] text-slate-600 leading-normal max-h-28 overflow-y-auto select-text">
              {incident.error_trace}
            </div>

            {/* Auto-detection timeline */}
            {incident.timeline.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block">TIMELINE</span>
                <div className="space-y-2.5 max-h-36 overflow-y-auto pr-1">
                  {incident.timeline.map((event, idx) => (
                    <div key={idx} className="flex items-start space-x-2.5 text-[9.5px]">
                      <span className="font-mono text-slate-400 font-extrabold shrink-0 mt-0.5">{event.time}</span>
                      <span className="text-slate-600 font-semibold leading-relaxed text-left">{event.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Real action: re-run the health check */}
        <div className="pt-6 border-t border-slate-100 flex flex-col gap-2">
          {lastChecked && <span className="text-[9px] text-slate-400 font-bold">Last checked: {lastChecked} · auto every 20s</span>}
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="h-9 bg-[#0b1931] hover:bg-slate-950 disabled:opacity-60 text-white text-[10px] font-black rounded-lg cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Checking..." : "Re-run Health Check"}
          </button>
        </div>
      </div>

    </div>
  );
}
