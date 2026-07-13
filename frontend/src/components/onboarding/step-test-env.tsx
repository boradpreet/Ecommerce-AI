"use client";

import React, { useState } from "react";
import { useOnboardingStore } from "src/store/useOnboardingStore";
import { Beaker, Key, ShieldCheck } from "lucide-react";

export const StepTestEnv: React.FC = () => {
  const { sandboxLatency, setBusinessDetails } = useOnboardingStore();
  const [apiKey] = useState("voqly_test_live_8afc219a12c8b090");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full space-y-6 text-slate-800 text-left animate-fade-in">
      
      {/* Title */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-slate-950 tracking-tight">Test Environment</h2>
        <p className="text-xs text-slate-500 font-medium">
          Instantiate Sandbox calling testing, inspect latency safety caps, and query sandbox API keys.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* API keys */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-900 flex items-center">
              <Key className="w-4 h-4 mr-2 text-blue-600" /> WebRTC Sandbox API Key
            </span>

            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
              Use this key to authorize outbound SIP triggers or directly initiate browser calling testing using the Voqly JS client.
            </p>
          </div>

          <div className="relative flex items-center">
            <input
              type="text"
              readOnly
              value={apiKey}
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700 outline-none pr-16 select-all font-mono"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="absolute right-2 h-7 px-2.5 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-all cursor-pointer"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        {/* Latency sliders */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
          <span className="text-xs font-bold text-slate-900 flex items-center">
            <Beaker className="w-4 h-4 mr-2 text-blue-600" /> Synthesizer Latency Control
          </span>

          <div className="space-y-4">
            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <span>Target Speech Delay</span>
              <span className="text-slate-900 font-bold">{sandboxLatency}ms</span>
            </div>
            <input
              type="range"
              min="150"
              max="900"
              step="50"
              value={sandboxLatency}
              onChange={(e) => setBusinessDetails({ sandboxLatency: parseInt(e.target.value) })}
              className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />

            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-[10px] text-emerald-800 font-semibold flex items-center">
              <ShieldCheck className="w-4 h-4 text-emerald-600 mr-2 shrink-0" />
              <span>Voice generation optimized for active streaming dialogue.</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
