"use client";

import React, { useMemo, useState } from "react";
import { FileUp, Trash2, ChevronUp, ChevronDown, ChevronsUpDown, Send, MailCheck } from "lucide-react";
import { formatPhone } from "src/lib/format";
import { FilterMenu, FilterGroup } from "src/components/dashboard/filter-menu";

interface CallLog {
  id: number;
  lead_name: string;
  lead_phone: string;
  agent_name: string;
  agent_id: number;
  campaign_id?: number | null;
  campaign_name?: string | null;
  status: string;
  direction?: string;
  duration: string;
  duration_seconds?: number;
  sentiment: string;
  interest_score?: number;
  recording_url?: string;
  created_at?: string;
  lead_email?: string;
  wants_details?: boolean;
  details_sent?: boolean;
  details_sent_to?: string | null;
}

interface CallLogsTabProps {
  callLogs: CallLog[];
  handleViewTranscript: (call: CallLog) => void;
  handleRemoveAllCallLogs: () => void;
  handleDeleteCall: (call: CallLog) => void;
}

type SortKey = "lead_name" | "campaign_name" | "status" | "duration" | "interest" | "date";
type SortDir = "asc" | "desc";

export const CallLogsTab: React.FC<CallLogsTabProps> = ({
  callLogs,
  handleViewTranscript,
  handleRemoveAllCallLogs,
  handleDeleteCall,
}) => {
  const [filters, setFilters] = useState<Record<string, string>>({ status: "all", direction: "all", sentiment: "all", campaign: "all", agent: "all" });
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const uniq = (arr: (string | null | undefined)[]) => Array.from(new Set(arr.filter(Boolean) as string[])).sort();

  const filterGroups: FilterGroup[] = useMemo(() => {
    const opt = (vals: string[]) => [{ value: "all", label: "All" }, ...vals.map((v) => ({ value: v, label: v }))];
    return [
      { key: "status", label: "Status", options: opt(uniq(callLogs.map((c) => c.status))) },
      { key: "direction", label: "Direction", options: [{ value: "all", label: "All" }, { value: "OUTBOUND", label: "Outbound" }, { value: "INBOUND", label: "Inbound" }] },
      { key: "sentiment", label: "Sentiment", options: opt(uniq(callLogs.map((c) => c.sentiment))) },
      { key: "campaign", label: "Campaign", options: opt(uniq(callLogs.map((c) => c.campaign_name))) },
      { key: "agent", label: "Agent", options: opt(uniq(callLogs.map((c) => c.agent_name))) },
    ];
  }, [callLogs]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "date" || key === "duration" || key === "interest" ? "desc" : "asc");
    }
  };

  const visibleLogs = useMemo(() => {
    const filtered = callLogs.filter(
      (c) =>
        (filters.status === "all" || c.status === filters.status) &&
        (filters.direction === "all" || (c.direction || "OUTBOUND").toUpperCase() === filters.direction) &&
        (filters.sentiment === "all" || c.sentiment === filters.sentiment) &&
        (filters.campaign === "all" || (c.campaign_name || "") === filters.campaign) &&
        (filters.agent === "all" || c.agent_name === filters.agent)
    );
    const dir = sortDir === "asc" ? 1 : -1;
    const val = (c: CallLog): string | number => {
      switch (sortKey) {
        case "lead_name": return (c.lead_name || "").toLowerCase();
        case "campaign_name": return (c.campaign_name || "").toLowerCase();
        case "status": return (c.status || "").toLowerCase();
        case "duration": return c.duration_seconds ?? 0;
        case "interest": return c.interest_score ?? 0;
        case "date": return c.created_at ? new Date(c.created_at).getTime() : 0;
      }
    };
    return [...filtered].sort((a, b) => {
      const av = val(a);
      const bv = val(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [callLogs, filters, sortKey, sortDir]);

  const handleExportLogs = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Voqly AI Call Logs Report\n";
    csvContent += `Generated On,${new Date().toLocaleString()}\n\n`;
    csvContent += "CONTACT NAME,PHONE NUMBER,CAMPAIGN,CONNECTED AGENT,STATUS,DURATION,SENTIMENT,INTEREST SCORE,DATE\n";
    visibleLogs.forEach((call) => {
      csvContent += `"${call.lead_name}","${formatPhone(call.lead_phone)}","${call.campaign_name ?? ""}","${call.agent_name}","${call.status}","${call.duration}","${call.sentiment}","${call.interest_score ?? 0}%","${call.created_at ? new Date(call.created_at).toLocaleString() : ""}"\n`;
    });

    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `voqly_call_logs_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const SortHeader: React.FC<{ label: string; sk: SortKey; className?: string }> = ({ label, sk, className }) => (
    <th className={`p-4 ${className || ""}`}>
      <button
        onClick={() => toggleSort(sk)}
        className="inline-flex items-center gap-1 hover:text-slate-700 transition-colors cursor-pointer uppercase tracking-wider"
      >
        <span>{label}</span>
        {sortKey === sk ? (
          sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronsUpDown className="w-3 h-3 text-slate-300" />
        )}
      </button>
    </th>
  );

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-950 tracking-tight">Call Logs</h2>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            View active voice pipelines, call recordings, and sentiment analysis logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {callLogs.length > 0 && (
            <button
              onClick={handleRemoveAllCallLogs}
              title="Archive all logs (restorable for 30 days)"
              className="h-9 px-4 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg flex items-center text-xs font-bold text-red-700 shadow-xs cursor-pointer transition-all"
            >
              <Trash2 className="w-4 h-4 text-red-500 mr-2" />
              <span>Remove All Logs</span>
            </button>
          )}

          <button
            onClick={handleExportLogs}
            className="h-9 px-4 bg-white border border-slate-250 rounded-lg flex items-center text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50/50 cursor-pointer"
          >
            <FileUp className="w-4 h-4 text-slate-400 mr-2" />
            <span>Export Logs</span>
          </button>
        </div>
      </div>

      {/* Call Logs Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-6 py-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Calling Records Database
          </span>
          <div className="flex items-center gap-2">
            <FilterMenu
              groups={filterGroups}
              value={filters}
              onChange={(k, v) => setFilters((prev) => ({ ...prev, [k]: v }))}
              onClear={() => setFilters({ status: "all", direction: "all", sentiment: "all", campaign: "all", agent: "all" })}
            />
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600" title="Dialer is connected and ready to place calls">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-semibold text-slate-700">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] text-slate-455 font-bold uppercase tracking-wider">
                <SortHeader label="Contact" sk="lead_name" className="pl-6" />
                <SortHeader label="Campaign" sk="campaign_name" />
                <SortHeader label="Status" sk="status" />
                <SortHeader label="Duration" sk="duration" />
                <SortHeader label="Sentiment / Interest" sk="interest" />
                <SortHeader label="Date" sk="date" />
                <th className="p-4 pr-6 text-right w-48">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    {callLogs.length === 0
                      ? "No calls dialed yet in this workspace. Try launching a campaign!"
                      : "No calls match the current filters."}
                  </td>
                </tr>
              ) : (
                visibleLogs.map((call) => (
                  <tr key={call.id} className="hover:bg-slate-50/40 transition-all">
                    <td className="p-4 pl-6">
                      <div className="text-slate-950 font-extrabold">{call.lead_name}</div>
                      <div className="text-[9px] text-slate-400 font-mono mt-0.5">{formatPhone(call.lead_phone)}</div>
                    </td>
                    <td className="p-4 text-slate-700 font-bold">{call.campaign_name || <span className="text-slate-300">—</span>}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${call.status === "COMPLETED"
                            ? "text-emerald-700 bg-emerald-50 border border-emerald-100"
                            : call.status === "FAILED" || call.status === "DNC"
                              ? "text-red-700 bg-red-50 border border-red-100"
                              : "text-blue-700 bg-blue-50 border border-blue-100"
                          }`}>
                          {call.status}
                        </span>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          (call.direction || "OUTBOUND").toUpperCase() === "INBOUND"
                            ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                            : "text-slate-500 bg-slate-50 border border-slate-200"
                        }`} title={`${(call.direction || "OUTBOUND")} call`}>
                          {(call.direction || "OUTBOUND").toUpperCase() === "INBOUND" ? "IN" : "OUT"}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-slate-650">{call.duration}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider ${call.sentiment === "POSITIVE"
                            ? "text-emerald-700 bg-emerald-50 border border-emerald-100"
                            : call.sentiment === "NEGATIVE"
                              ? "text-red-700 bg-red-50 border border-red-100"
                              : "text-slate-500 bg-slate-50 border border-slate-200"
                          }`}>
                          {call.sentiment}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider ${(call.interest_score ?? 0) >= 70
                            ? "text-indigo-700 bg-indigo-50 border border-indigo-100"
                            : (call.interest_score ?? 0) >= 30
                              ? "text-amber-700 bg-amber-50 border border-amber-100"
                              : "text-rose-700 bg-rose-50 border border-rose-100"
                          }`}>
                          {call.interest_score ?? 0}%
                        </span>
                      </div>
                      {call.details_sent ? (
                        <span
                          className="mt-1.5 inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded text-emerald-700 bg-emerald-50 border border-emerald-100"
                          title={call.details_sent_to ? `Details sent — ${call.details_sent_to}` : "Company details sent to the caller"}
                        >
                          <MailCheck className="w-3 h-3" /> Details sent
                        </span>
                      ) : call.wants_details ? (
                        <span
                          className="mt-1.5 inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded text-amber-700 bg-amber-50 border border-amber-100"
                          title="Caller asked for details, but they were not sent (check WhatsApp/email/company-details config)"
                        >
                          <Send className="w-3 h-3" /> Details requested
                        </span>
                      ) : null}
                    </td>
                    <td className="p-4 text-slate-500 whitespace-nowrap">
                      {call.created_at ? new Date(call.created_at).toLocaleDateString() : "—"}
                      {call.created_at && (
                        <span className="block text-[9px] text-slate-400">
                          {new Date(call.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </td>
                    <td className="p-4 pr-6 text-right flex items-center justify-end gap-2.5">
                      <button
                        onClick={() => handleViewTranscript(call)}
                        className="h-7 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                      >
                        View Transcript
                      </button>
                      <button
                        onClick={() => handleDeleteCall(call)}
                        title="Delete this call log (archived, restorable for 30 days)"
                        aria-label="Delete call log"
                        className="h-7 w-7 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg transition-all cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
