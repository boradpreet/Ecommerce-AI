import React from "react";
import { Loader2 } from "lucide-react";

interface SettingsTabProps {
  settingsData: {
    settings: {
      concurrent_streams: number;
      max_tokens: number;
      white_label_enabled: boolean;
      vendor_margin: number;
      model_temp: number;
      stt_buffer: number;
      routing_mode: string;
    };
    audit_logs: Array<{ timestamp: string; actor: string; action: string; target: string; status: string }>;
  } | null;
  concurrentStreams: number;
  setConcurrentStreams: (val: number) => void;
  maxTokens: number;
  setMaxTokens: (val: number) => void;
  whiteLabelEnabled: boolean;
  setWhiteLabelEnabled: (val: boolean) => void;
  vendorMargin: number;
  setVendorMargin: (val: number) => void;
  modelTemp: number;
  setModelTemp: (val: number) => void;
  sttBuffer: number;
  setSttBuffer: (val: number) => void;
  routingMode: string;
  setRoutingMode: (val: string) => void;
  savingSettings: boolean;
  onSaveSettings: () => void;
  onDiscardChanges: () => void;
}

export default function SettingsTab({
  settingsData,
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
  onSaveSettings,
  onDiscardChanges,
}: SettingsTabProps) {
  if (!settingsData) return null;

  return (
    <div className="space-y-8 animate-fade-in text-left select-none max-w-4xl">
      
      {/* Settings columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        
        {/* Left: General & limits */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-6">
          <div className="flex justify-between items-center select-none border-b border-slate-100 pb-3 mb-4">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Global Usage Limits</h4>
            <span className="text-[10px] text-slate-400 font-bold uppercase select-none font-mono">Platform Limits</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Concurrent Streams per Vendor</label>
              <input
                type="number"
                value={concurrentStreams}
                onChange={(e) => setConcurrentStreams(parseInt(e.target.value) || 0)}
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-955 outline-none focus:border-blue-600"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[10px] text-slate-505 font-bold uppercase tracking-wider block">Max Monthly API Tokens (Global)</label>
              <input
                type="text"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value.replace(/,/g, "")) || 0)}
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-955 outline-none focus:border-blue-600 font-mono"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6 space-y-6">
            <div className="flex justify-between items-center select-none border-b border-slate-100 pb-3">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">White Labeling</h4>
              <button
                type="button"
                onClick={() => setWhiteLabelEnabled(!whiteLabelEnabled)}
                className={`w-9 h-5 rounded-full p-0.5 transition-all duration-300 cursor-pointer ${
                  whiteLabelEnabled ? "bg-[#0f2e5c] flex justify-end" : "bg-slate-200 flex justify-start"
                }`}
              >
                <span className="w-4 h-4 bg-white rounded-full shadow-md" />
              </button>
            </div>
            <p className="text-[10px] text-slate-455 font-semibold leading-relaxed">
              Allows sub-accounts and custom DIDs to configure whitelabel domains and custom styles globally.
            </p>
          </div>
        </div>

        {/* Right: Margins variables */}
        <div className="bg-[#0f2e5c] text-white rounded-3xl p-6 shadow-xl flex flex-col justify-between min-h-[220px] relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.01)_1px,_transparent_1px)] bg-[size:10px_10px] pointer-events-none" />
          
          <div className="space-y-2 z-10 text-left">
            <span className="text-[9px] text-blue-300 font-extrabold uppercase tracking-widest block">VENDOR FEES</span>
            <h4 className="text-base font-black text-white">Vendor Margins</h4>
            <p className="text-[10px] text-slate-200 leading-normal font-semibold">Configure default margins added to SIP trunks.</p>
          </div>

          <div className="my-6 z-10 text-left">
            <div className="flex justify-between items-baseline select-none">
              <span className="text-4xl font-extrabold font-mono tracking-tight">{vendorMargin}%</span>
              <span className="text-[10px] text-slate-300 font-bold uppercase">Default Baseline</span>
            </div>
            {/* Margin slider */}
            <input
              type="range"
              min="1"
              max="50"
              step="0.5"
              value={vendorMargin}
              onChange={(e) => setVendorMargin(parseFloat(e.target.value))}
              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white outline-none mt-4"
            />
          </div>
        </div>
      </div>

      {/* Variables selection grids */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-6 select-none relative">
        <div className="flex justify-between items-center select-none border-b border-slate-100 pb-3 mb-4">
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Platform Performance Variables</h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          
          {/* creativity temperature slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-left">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Model Temperature Baseline</label>
              <span className="text-[9.5px] font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                {modelTemp.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={modelTemp}
              onChange={(e) => setModelTemp(parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0f2e5c] outline-none"
            />
            <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase tracking-wider select-none">
              <span>Precise (0.1)</span>
              <span>Creative (0.9)</span>
            </div>
          </div>

          {/* stt buffer milliseconds input */}
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">STT Buffer Timeout (ms)</label>
            <div className="flex border border-slate-200 rounded-lg overflow-hidden focus-within:border-blue-600 bg-white">
              <input
                type="number"
                value={sttBuffer}
                onChange={(e) => setSttBuffer(parseInt(e.target.value) || 0)}
                className="w-full bg-transparent px-3 py-2 text-xs font-semibold text-slate-900 outline-none"
              />
              <span className="bg-slate-50 border-l border-slate-200 text-[10px] font-bold text-slate-450 px-3 py-2 flex items-center shrink-0">ms</span>
            </div>
          </div>

          {/* routing mode dropdown select */}
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] text-slate-505 font-bold uppercase tracking-wider block">Global Routing Mode</label>
            <select
              value={routingMode}
              onChange={(e) => setRoutingMode(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-none cursor-pointer"
            >
              <option value="Latency Optimized">Latency Optimized</option>
              <option value="Cost Efficiency">Cost Efficiency</option>
              <option value="Security Redundant">Security Redundant</option>
            </select>
          </div>

        </div>
      </div>

      {/* Audit Logs list */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs text-left">
        <div className="flex justify-between items-center select-none border-b border-slate-100 pb-4 mb-4">
          <div>
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Recent Audit Logs</h4>
            <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wide mt-1">Control global platform variables, security protocols, and audit trails.</p>
          </div>
          <button type="button" className="h-8 px-4 border border-slate-200 hover:bg-slate-50 text-[10px] font-bold text-slate-655 rounded-lg flex items-center space-x-1.5 cursor-pointer shadow-xs">
            <span>Export Logs</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-semibold text-slate-700">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] text-slate-455 font-bold uppercase tracking-wider select-none">
                <th className="p-3 pl-5">TIMESTAMP</th>
                <th className="p-3">ACTOR</th>
                <th className="p-3">ACTION</th>
                <th className="p-3">TARGET</th>
                <th className="p-3 pr-5 text-right">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {settingsData.audit_logs.map((log: { timestamp: string; actor: string; action: string; target: string; status: string }, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50/20 transition-colors">
                  <td className="p-3 pl-5 text-slate-500 font-mono">{log.timestamp}</td>
                  <td className="p-3 text-slate-900 font-extrabold flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-200 flex items-center justify-center shrink-0 border border-slate-350" />
                    <span>{log.actor}</span>
                  </td>
                  <td className="p-3 text-slate-900 font-extrabold">{log.action}</td>
                  <td className="p-3 text-slate-650">{log.target}</td>
                  <td className="p-3 pr-5 text-right">
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider select-none ${
                      log.status === "SUCCESS"
                        ? "text-emerald-700 bg-emerald-50 border border-emerald-100"
                        : "text-blue-700 bg-blue-50 border border-blue-100"
                    }`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating settings action bar */}
      <div className="flex justify-end items-center gap-4 pt-4 select-none">
        <button
          type="button"
          onClick={onDiscardChanges}
          className="h-10 px-6 border border-slate-250 bg-white hover:bg-slate-50 text-slate-600 font-extrabold text-xs rounded-xl cursor-pointer"
        >
          Discard Changes
        </button>
        <button
          type="button"
          onClick={onSaveSettings}
          disabled={savingSettings}
          className="h-10 px-6 bg-[#0f2e5c] hover:bg-slate-950 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer flex items-center justify-center space-x-2"
        >
          {savingSettings && <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />}
          <span>Save Global Changes</span>
        </button>
      </div>

    </div>
  );
}
