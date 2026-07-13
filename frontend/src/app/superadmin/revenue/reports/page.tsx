"use client";

import React, { useState } from "react";
import { useSuperAdmin } from "src/context/SuperAdminContext";
import { Loader2, Download, FileText, CheckCircle2, HelpCircle } from "lucide-react";

export default function ReportsPage() {
  const { loading, triggerSuccess } = useSuperAdmin();
  const [downloading, setDownloading] = useState(false);

  const handleDownload = (format: "csv" | "pdf") => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      triggerSuccess(`Financial Report exported as ${format.toUpperCase()} successfully!`);
    }, 1500);
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 font-bold uppercase tracking-wider flex flex-col items-center justify-center select-none">
        <Loader2 className="w-8 h-8 animate-spin text-[#0f2e5c] mb-4" />
        <span>Compiling Financial Audit Ledger...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200/50">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Audit Reports</h1>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Download financial statements, tax reports, and operational audits.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Main download list */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs text-left">
          <div className="border-b border-slate-100 pb-3 mb-6 select-none flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#0F2D67]" />
              <span>Available Financial Downloads</span>
            </h4>
          </div>

          <div className="space-y-4 select-none">
            {[
              { title: "Monthly Recurring Revenue Summary", desc: "Includes MRR, ARR, and average pricing per vendor.", date: "May 2026", size: "1.4 MB" },
              { title: "Consolidated Tax Statement", desc: "Includes VAT, local taxes, and processing gateway fees.", date: "Q1 2026", size: "3.2 MB" },
              { title: "Operational Infrastructure Ledger", desc: "Full breakdown of voice bridge connection times and server margins.", date: "FY 2025", size: "8.9 MB" },
            ].map((report, idx) => (
              <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between hover:bg-white hover:shadow-2xs transition">
                <div className="text-left space-y-1">
                  <h5 className="text-xs font-black text-slate-900">{report.title}</h5>
                  <p className="text-[10px] text-slate-450 font-semibold">{report.desc}</p>
                  <div className="flex items-center space-x-2 text-[9px] text-slate-400 font-bold font-mono pt-1">
                    <span>Date: {report.date}</span>
                    <span>•</span>
                    <span>Size: {report.size}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload("csv")}
                    disabled={downloading}
                    className="h-8 px-3 border border-slate-250 hover:bg-slate-50 text-[10px] font-bold text-slate-650 rounded-lg flex items-center space-x-1 cursor-pointer transition"
                  >
                    <Download className="w-3 h-3" />
                    <span>CSV</span>
                  </button>
                  <button
                    onClick={() => handleDownload("pdf")}
                    disabled={downloading}
                    className="h-8 px-3 bg-[#0F2D67] hover:bg-slate-950 text-[10px] font-bold text-white rounded-lg flex items-center space-x-1 cursor-pointer transition shadow-2xs"
                  >
                    <Download className="w-3 h-3 text-white" />
                    <span>PDF</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Status */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs flex flex-col justify-between select-none text-left">
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest block border-b border-slate-100 pb-2.5">
              Compliance Status
            </h4>

            <div className="space-y-3">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Platform Margins</span>
                <span className="text-sm font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-150 px-2 py-0.5 rounded-full">
                  12.5% FIXED
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Audit Status</span>
                <span className="text-sm font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-150 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> PASSED
                </span>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl text-[10.5px] text-blue-750 font-medium leading-relaxed mt-6 flex items-start space-x-2">
            <HelpCircle className="w-4 h-4 text-blue-650 shrink-0 mt-0.5" />
            <span>
              Platforms logs are verified against financial gateways. Ledger is updated at 00:00 GMT daily.
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
