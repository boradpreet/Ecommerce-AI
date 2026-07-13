"use client";

import React from "react";
import { useSuperAdmin } from "src/context/SuperAdminContext";
import { Loader2, Database, Cpu, Phone, RefreshCw, Sliders, Layers } from "lucide-react";

export default function ServicesPage() {
  const { loading, infraData } = useSuperAdmin();

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-455 font-bold uppercase tracking-wider flex flex-col items-center justify-center select-none">
        <Loader2 className="w-8 h-8 animate-spin text-[#0f2e5c] mb-4" />
        <span>Gauging Microservices Statuses...</span>
      </div>
    );
  }

  const services = infraData?.services || [];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200/50">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Microservices Registry</h1>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Live telemetry regarding core backend processes, database queries, and edge bridges.
          </p>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 select-none text-left">
        {services.map((srv) => (
          <div key={srv.id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-3xs flex flex-col justify-between h-32 relative hover:scale-[1.01] transition-transform">
            <span className={`w-2.5 h-2.5 rounded-full absolute top-5 right-5 ${
              srv.status === "nominal" ? "bg-emerald-500" : srv.status === "warning" ? "bg-amber-500" : "bg-red-500 animate-pulse"
            }`} />
            
            <div className="space-y-0.5">
              {srv.id === "postgres" && <Database className="w-5 h-5 text-blue-655" />}
              {srv.id === "redis" && <Cpu className="w-5 h-5 text-[#e11d48]" />}
              {srv.id === "twilio" && <Phone className="w-5 h-5 text-amber-500 animate-pulse" />}
              {srv.id === "kafka" && <RefreshCw className="w-5 h-5 text-emerald-600" />}
              {srv.id === "gemini" && <Sliders className="w-5 h-5 text-purple-650" />}
              {srv.id === "s3" && <Layers className="w-5 h-5 text-slate-600" />}
              <h4 className="text-xs font-black text-slate-900 mt-2 block">{srv.name}</h4>
            </div>
            
            <div className="leading-tight mt-2 flex justify-between items-end border-t border-slate-100 pt-2.5">
              <span className="text-[10px] font-black text-slate-800">{srv.uptime}</span>
              <p className="text-[9px] text-slate-400 font-bold font-mono">{srv.latency} Latency</p>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
