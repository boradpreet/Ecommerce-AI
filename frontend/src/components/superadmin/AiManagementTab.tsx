import React from "react";
import { Bolt, Sparkles, Globe, Shield, Plus, MoreVertical, Cpu } from "lucide-react";

interface AiManagementTabProps {
  aiProviders: Array<{
    id: string;
    name: string;
    models: string;
    latency: number;
    uptime: number;
    cost_per_1k: number;
    active: boolean;
    icon: string;
  }>;
  routingRules: Array<{
    id: number;
    use_case: string;
    primary_model: string;
    fallback_model: string;
    status: string;
  }>;
  smartRoutingEnabled: boolean;
  liveHealthData: {
    total_tokens_24h: string;
    peak_consumption: string;
    chart_data: Array<{ label: string; value: number }>;
  } | null;
  onToggleProvider: (id: string) => void;
  onToggleSmartRouting: () => void;
  onConnectProviderClick: () => void;
  onEditRoutingRulesClick: () => void;
}

export default function AiManagementTab({
  aiProviders,
  routingRules,
  smartRoutingEnabled,
  liveHealthData,
  onToggleProvider,
  onToggleSmartRouting,
  onConnectProviderClick,
  onEditRoutingRulesClick,
}: AiManagementTabProps) {
  return (
    <div className="space-y-8 animate-fade-in text-left select-none">
      
      {/* Page header row */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-1 select-none">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">AI Provider Orchestration</h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">Manage global model performance, costs, and failover routing.</p>
        </div>
        
        <button
          type="button"
          onClick={onConnectProviderClick}
          className="h-10 px-5 bg-[#0f2e5c] hover:bg-slate-950 text-xs font-bold text-white rounded-xl transition-all flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>Connect Provider</span>
        </button>
      </div>

      {/* AI Providers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {aiProviders.map((provider) => {
          const isCustom = provider.id === "custom" || provider.name.toLowerCase().includes("custom");
          const active = provider.active;
          
          return (
            <div
              key={provider.id}
              className={`rounded-2xl p-6 shadow-3xs flex flex-col justify-between h-52 border transition-all duration-300 relative ${
                isCustom
                  ? "bg-[#0f2e5c] text-white border-transparent shadow-md shadow-[#0f2e5c]/10"
                  : "bg-white text-slate-800 border-slate-200 hover:scale-[1.01]"
              }`}
            >
              {/* Header: Icon and Toggle switch */}
              <div className="flex justify-between items-center">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isCustom
                    ? "bg-white/10 text-white"
                    : "bg-slate-50 border border-slate-100 text-slate-700"
                }`}>
                  {provider.icon === "bolt" && <Bolt className="w-4 h-4" />}
                  {provider.icon === "sparkles" && <Sparkles className="w-4 h-4" />}
                  {provider.icon === "globe" && <Globe className="w-4 h-4" />}
                  {provider.icon === "shield" && <Shield className="w-4 h-4" />}
                  {provider.icon !== "bolt" && provider.icon !== "sparkles" && provider.icon !== "globe" && provider.icon !== "shield" && <Cpu className="w-4 h-4" />}
                </div>
                
                {/* Switch slider */}
                <button
                  type="button"
                  onClick={() => onToggleProvider(provider.id)}
                  className={`w-9 h-5 rounded-full p-0.5 transition-all duration-300 cursor-pointer ${
                    active
                      ? isCustom ? "bg-white flex justify-end" : "bg-[#0f2e5c] flex justify-end"
                      : isCustom ? "bg-white/20 flex justify-start" : "bg-slate-200 flex justify-start"
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full shadow-md ${
                    isCustom ? active ? "bg-[#0f2e5c]" : "bg-white" : "bg-white"
                  }`} />
                </button>
              </div>

              {/* Title & models subtext */}
              <div className="mt-4 text-left leading-tight">
                <span className={`text-sm font-black tracking-wide block ${isCustom ? "text-white" : "text-slate-900"}`}>
                  {provider.name}
                </span>
                <span className={`text-[10px] font-bold block mt-1 ${isCustom ? "text-slate-300" : "text-slate-400"}`}>
                  {provider.models}
                </span>
              </div>

              {/* Operational Stats: Latency, Uptime, Cost */}
              <div className={`border-t pt-3 mt-4 space-y-2 text-xs font-semibold ${isCustom ? "border-white/10" : "border-slate-100"}`}>
                <div className="flex justify-between items-center select-none">
                  <span className="flex items-center space-x-1">
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${isCustom ? "text-slate-300" : "text-slate-400"}`}>Latency</span>
                  </span>
                  <span className={`font-mono text-[11px] font-black ${isCustom ? "text-white" : "text-blue-650"}`}>
                    {provider.latency}ms
                  </span>
                </div>
                
                <div className="flex justify-between items-center select-none">
                  <span className="flex items-center space-x-1">
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${isCustom ? "text-slate-300" : "text-slate-400"}`}>Uptime</span>
                  </span>
                  <span className={`font-mono text-[11px] font-black ${
                    provider.uptime >= 99.98 
                      ? isCustom ? "text-white" : "text-emerald-600" 
                      : "text-amber-500"
                  }`}>
                    {provider.uptime}%
                  </span>
                </div>

                <div className="flex justify-between items-center select-none">
                  <span className="flex items-center space-x-1">
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${isCustom ? "text-slate-300" : "text-slate-400"}`}>Cost/1k</span>
                  </span>
                  <span className={`font-mono text-[11px] font-black ${isCustom ? "text-slate-200" : "text-slate-900"}`}>
                    ${provider.cost_per_1k.toFixed(4)}
                  </span>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Mid row: Model Routing Rules and Live Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* Left Column: Model Routing Rules */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-3xs text-left relative flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center select-none mb-4">
              <h4 className="text-xs font-black text-slate-455 uppercase tracking-widest block">Model Routing Rules</h4>
              <button
                type="button"
                onClick={onEditRoutingRulesClick}
                className="text-[10px] font-black text-blue-655 hover:text-blue-800 hover:underline uppercase tracking-wider cursor-pointer"
              >
                Edit Global Rules
              </button>
            </div>

            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left border-collapse text-xs font-semibold text-slate-700">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] text-slate-455 font-bold uppercase tracking-wider select-none">
                    <th className="p-3 pl-5">USE CASE</th>
                    <th className="p-3">PRIMARY MODEL</th>
                    <th className="p-3">FALLBACK</th>
                    <th className="p-3">STATUS</th>
                    <th className="p-3 pr-5 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {routingRules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-slate-50/20 transition-colors">
                      <td className="p-3.5 pl-5 text-slate-950 font-black flex items-center space-x-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          rule.status === "OPTIMIZED" 
                            ? "bg-amber-500" 
                            : rule.status === "BALANCED" 
                              ? "bg-blue-500" 
                              : "bg-red-500"
                        }`} />
                        <span>{rule.use_case}</span>
                      </td>
                      <td className="p-3.5">
                        <span className="font-mono bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                          {rule.primary_model}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="font-mono bg-slate-100 border border-slate-200 text-slate-750 px-2 py-0.5 rounded text-[10px] font-semibold">
                          {rule.fallback_model}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className={`text-[8.5px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider select-none ${
                          rule.status === "OPTIMIZED"
                            ? "text-amber-800 bg-amber-50 border border-amber-200"
                            : rule.status === "BALANCED"
                              ? "text-blue-800 bg-blue-50 border border-blue-200"
                              : "text-slate-600 bg-slate-100 border border-slate-200"
                        }`}>
                          {rule.status}
                        </span>
                      </td>
                      <td className="p-3.5 pr-5 text-right text-slate-400 cursor-pointer hover:text-slate-800">
                        <MoreVertical className="w-4 h-4 ml-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Live Health Chart */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-3xs text-left select-none flex flex-col justify-between min-h-[290px]">
          <div className="flex justify-between items-center select-none border-b border-slate-100 pb-3 mb-2">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center space-x-2">
              <span>Live Health</span>
            </h4>
            <div className="flex items-center space-x-1.5 select-none">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
              <span className="text-[9px] font-black text-[#10b981] uppercase tracking-wider">LIVE</span>
            </div>
          </div>

          {/* 8 columns throughput token chart vertical representation */}
          <div className="flex-1 flex items-end justify-between px-3 pb-3 border-b border-slate-100 relative h-36 mt-4">
            {liveHealthData?.chart_data.map((item, idx) => {
              const heightPct = item.value;
              return (
                <div key={idx} className="flex flex-col items-center group w-7 cursor-pointer relative">
                  <div className="absolute -top-8 scale-95 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all bg-slate-900 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-md z-20 font-mono">
                    {item.value * 12}k
                  </div>
                  <div
                    className={`w-4 rounded-t transition-all duration-300 ${
                      idx === 3 || idx === 7 
                        ? "bg-[#0f2e5c]/40 hover:bg-[#0f2e5c]" 
                        : "bg-slate-300 hover:bg-[#0f2e5c]"
                    }`}
                    style={{ height: `${heightPct}%`, minHeight: "10px" }}
                  />
                </div>
              );
            })}
          </div>

          {/* Chart details */}
          <div className="pt-4 space-y-1">
            <div className="flex justify-between items-baseline select-none">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Total Tokens (24h)</span>
              <span className="text-sm font-black text-slate-950 font-mono">{liveHealthData?.total_tokens_24h || "12.4M"}</span>
            </div>
            
            {/* Tokens bandwidth progress bar indicator */}
            <div className="w-full bg-slate-100 h-1 rounded-full relative overflow-hidden my-2">
              <div className="bg-[#0f2e5c] h-full rounded-full transition-all duration-500 w-4/5" />
            </div>
            
            <p className="text-[9px] text-slate-400 italic block mt-1">
              Peak consumption at {liveHealthData?.peak_consumption || "09:30 AM EST"}
            </p>
          </div>
        </div>

      </div>

      {/* Bottom Card: Automated Optimization Engines */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-8 shadow-3xs text-center select-none relative flex flex-col items-center space-y-6">
        <div className="w-12 h-12 bg-slate-50 border border-slate-150 rounded-2xl flex items-center justify-center text-[#0f2e5c] shadow-3xs">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        
        <div className="max-w-xl space-y-2">
          <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Automated Optimization Engines</h4>
          <p className="text-xs text-slate-500 font-semibold leading-relaxed">
            Let Voqly&apos;s proprietary meta-router automatically switch providers based on real-time market spot-pricing and latency fluctuations.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center pt-2">
          <button
            type="button"
            onClick={onToggleSmartRouting}
            className={`h-11 px-8 rounded-xl font-extrabold text-xs transition-all shadow-md cursor-pointer ${
              smartRoutingEnabled
                ? "bg-[#0b1931] hover:bg-slate-950 text-white"
                : "bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 shadow-none"
            }`}
          >
            {smartRoutingEnabled ? "Disable Smart Routing" : "Enable Smart Routing"}
          </button>
          
          <button
            type="button"
            className="h-11 px-8 border border-slate-250 bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer"
          >
            View Simulation
          </button>
        </div>
      </div>

    </div>
  );
}
