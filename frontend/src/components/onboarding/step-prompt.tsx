"use client";

import React, { useState } from "react";
import { useOnboardingStore } from "src/store/useOnboardingStore";
import { Copy, History, Sparkles, FileCode, Check } from "lucide-react";

export const StepPrompt: React.FC = () => {
  const { agentSystemPrompt, setBusinessDetails } = useOnboardingStore();
  const [activeTab, setActiveTab] = useState("identity");
  const [copied, setCopied] = useState(false);
  const [isRefining, setIsRefining] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(agentSystemPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAiRefine = async () => {
    setIsRefining(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    // Auto refine slightly
    const refinedText = agentSystemPrompt.replace(
      "# PERSONALITY\nMaintain a warm",
      "# PERSONALITY\nMaintain a highly empathetic, professional"
    );
    
    setBusinessDetails({ agentSystemPrompt: refinedText });
    setIsRefining(false);
  };

  // Split lines to map to code editor line numbers
  const lines = agentSystemPrompt.split("\n");

  return (
    <div className="w-full space-y-6 text-slate-800 text-left animate-fade-in">
      
      {/* Title */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-slate-950 tracking-tight">Prompt Setup</h2>
        <p className="text-xs text-slate-500 font-medium">
          Define the core script and logical guardrails for your AI voice agent. Use template variables to personalize conversations in real-time.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-stretch">
        
        {/* Left Side: Prompt Structure and Variables */}
        <div className="w-full lg:w-80 space-y-5 shrink-0 flex flex-col justify-between">
          
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Prompt Structure</h4>
            
            {/* Structure items */}
            <div className="space-y-2">
              <div 
                onClick={() => setActiveTab("identity")}
                className={`p-3 rounded-lg border cursor-pointer select-none transition-all ${
                  activeTab === "identity" 
                    ? "bg-blue-50/50 border-blue-600 shadow-sm" 
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <h5 className="text-xs font-bold text-slate-900">Identity</h5>
                <p className="text-[9px] text-slate-400 font-bold mt-0.5">Who is the agent? Define their name, role, and company.</p>
              </div>

              <div 
                onClick={() => setActiveTab("personality")}
                className={`p-3 rounded-lg border cursor-pointer select-none transition-all ${
                  activeTab === "personality" 
                    ? "bg-blue-50/50 border-blue-600 shadow-sm" 
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <h5 className="text-xs font-bold text-slate-900">Personality</h5>
                <p className="text-[9px] text-slate-400 font-bold mt-0.5">Tone of voice, conversational guidelines, and audio speeds.</p>
              </div>

              <div 
                onClick={() => setActiveTab("capabilities")}
                className={`p-3 rounded-lg border cursor-pointer select-none transition-all ${
                  activeTab === "capabilities" 
                    ? "bg-blue-50/50 border-blue-600 shadow-sm" 
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <h5 className="text-xs font-bold text-slate-900">Capabilities</h5>
                <p className="text-[9px] text-slate-400 font-bold mt-0.5">Specific tasks, CRM hooks, and human fallback triggers.</p>
              </div>
            </div>
          </div>

          {/* Dynamic Variables badges */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dynamic Variables</h4>
            <div className="flex flex-wrap gap-1.5">
              {["{lead_name}", "{company}", "{agent_name}"].map((item) => (
                <button
                  key={item}
                  type="button"
                  className="text-[10px] font-bold px-2.5 py-1 rounded bg-blue-50 border border-blue-100 text-blue-650 hover:bg-blue-100 transition-colors shadow-2xs"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Right Side: Code Editor Visualizer panel */}
        <div className="flex-1 bg-[#1e293b] rounded-xl border border-slate-800 flex flex-col justify-between overflow-hidden shadow-2xl min-h-[460px] text-slate-200 font-mono">
          
          {/* Header Tab bar */}
          <div className="h-10 bg-[#0f172a] border-b border-slate-800 px-4 flex items-center justify-between z-10 shrink-0">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 select-none">
              <FileCode className="w-3.5 h-3.5 text-blue-400" />
              <span>voice_script.prompt</span>
            </div>

            <div className="flex items-center space-x-2 text-slate-400 text-xs">
              <button
                type="button"
                onClick={handleCopy}
                className="hover:text-white transition-colors cursor-pointer flex items-center space-x-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
              </button>
              <span className="text-slate-700">|</span>
              <button
                type="button"
                className="hover:text-white transition-colors flex items-center space-x-1"
              >
                <History className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">History</span>
              </button>
            </div>
          </div>

          {/* Main Editor Text block */}
          <div className="flex-1 flex flex-row items-stretch p-4 min-h-[280px]">
            {/* Line Numbers */}
            <div className="w-8 select-none text-slate-500 text-right pr-3 text-xs leading-6 border-r border-slate-800 select-none">
              {lines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>

            {/* Text Editor area */}
            <textarea
              className="flex-1 bg-transparent px-3 text-xs leading-6 text-slate-200 outline-none resize-none font-mono placeholder-slate-500 h-full w-full"
              value={agentSystemPrompt}
              onChange={(e) => setBusinessDetails({ agentSystemPrompt: e.target.value })}
            />
          </div>

          {/* Editor Footer Status bar */}
          <div className="h-9 bg-[#0f172a] border-t border-slate-800 px-4 flex items-center justify-between text-[10px] text-slate-500 select-none shrink-0 font-sans">
            <div>
              Ln {lines.length}, Col {lines[lines.length - 1]?.length || 0}  UTF-8
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-slate-400">Syntax: AI Prompt Markup</span>
            </div>
          </div>

          {/* AI script refiner button block at very bottom */}
          <div className="p-3 bg-[#0f172a]/50 border-t border-slate-800 flex justify-end shrink-0 font-sans z-10">
            <button
              type="button"
              onClick={handleAiRefine}
              disabled={isRefining}
              className="h-9 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all flex items-center justify-center space-x-1.5 active:scale-[0.98] cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>{isRefining ? "Refining prompt..." : "Use AI to refine script"}</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
