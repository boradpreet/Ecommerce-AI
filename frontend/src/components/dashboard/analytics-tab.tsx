"use client";

import React, { useState, useEffect } from "react";
import { Globe, FileUp, Plus, Loader2, X } from "lucide-react";
import { useAuthStore } from "src/store/authStore";
import { apiFetch } from "src/lib/api";

interface AnalyticsKpis {
  total_calls: number;
  total_minutes: string;
  avg_duration: string;
  containment_rate: number;
  avg_sentiment: number;
}

interface HeatmapRow {
  day: string;
  slots: number[];
}

interface AnalyticsOutcomes {
  resolved: number;
  transferred: number;
  abandoned: number;
}

interface VoiceAgent {
  name: string;
  tier: string;
  status: string;
  success_rate: number;
  handling_time: string;
  total_calls: number;
}

interface FunnelStep {
  step: string;
  percent: number;
}

interface TrendPoint {
  hour: number;
  successful: number;
  transferred: number;
}

interface AnalyticsComparison {
  calls_prev: number;
  calls_change: number;
  minutes_change: number;
  containment_change: number;
}

interface AnalyticsData {
  kpis?: AnalyticsKpis;
  heatmap?: HeatmapRow[];
  outcomes?: AnalyticsOutcomes;
  voice_agents?: VoiceAgent[];
  funnel?: FunnelStep[];
  trend?: TrendPoint[];
  comparison?: AnalyticsComparison;
}

export const AnalyticsTab: React.FC = () => {
  const token = useAuthStore((state) => state.token);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);

  // Date selection states — default to the last 30 days so recent calls are shown.
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [tempStart, setTempStart] = useState("2026-05-01");
  const [tempEnd, setTempEnd] = useState("2026-05-31");

  useEffect(() => {
    const loadAnalytics = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (startDate) queryParams.set("start_date", startDate);
        if (endDate) queryParams.set("end_date", endDate);
        
        const res = await apiFetch<AnalyticsData>(`/dashboard/analytics?${queryParams.toString()}`, "GET", undefined, token);
        if (res) {
          setData(res);
        }
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, [token, startDate, endDate]);

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-slate-500 animate-pulse select-none">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600 mb-3" />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Loading analytics…</span>
      </div>
    );
  }

  const kpis = data?.kpis || {
    total_calls: 0,
    total_minutes: "0",
    avg_duration: "0m 0s",
    containment_rate: 0.0,
    avg_sentiment: 0.0
  };

  const heatmap = data?.heatmap || [
    { day: "Mon", slots: [0, 0, 0, 0, 0, 0, 0, 0] },
    { day: "Tue", slots: [0, 0, 0, 0, 0, 0, 0, 0] },
    { day: "Wed", slots: [0, 0, 0, 0, 0, 0, 0, 0] },
    { day: "Thu", slots: [0, 0, 0, 0, 0, 0, 0, 0] },
    { day: "Fri", slots: [0, 0, 0, 0, 0, 0, 0, 0] },
    { day: "Sat", slots: [0, 0, 0, 0, 0, 0, 0, 0] },
    { day: "Sun", slots: [0, 0, 0, 0, 0, 0, 0, 0] }
  ];

  const outcomes = data?.outcomes || {
    resolved: 0,
    transferred: 0,
    abandoned: 0
  };

  const voiceAgents: VoiceAgent[] = data?.voice_agents || [];
  const filteredVoiceAgents = voiceAgents;

  const funnel = data?.funnel || [
    { step: "INITIAL GREETING", percent: 0 },
    { step: "INTENT IDENTIFIED", percent: 0 },
    { step: "AI RESOLUTION (CONTAINMENT)", percent: 0 }
  ];

  // Live period-over-period comparison + hourly call-volume trend (from the backend)
  const comparison = data?.comparison || { calls_prev: 0, calls_change: 0, minutes_change: 0, containment_change: 0 };
  const trend: TrendPoint[] = data?.trend || [];
  const trendMax = Math.max(1, ...trend.flatMap((t) => [t.successful, t.transferred]));
  const trendX = (i: number) => (trend.length > 1 ? (i / (trend.length - 1)) * 500 : 0);
  const trendY = (v: number) => 100 - (v / trendMax) * 85;
  const succPath = trend.map((t, i) => `${i === 0 ? "M" : "L"} ${trendX(i).toFixed(1)} ${trendY(t.successful).toFixed(1)}`).join(" ");
  const succArea = trend.length ? `${succPath} L 500 100 L 0 100 Z` : "";
  const transPath = trend.map((t, i) => `${i === 0 ? "M" : "L"} ${trendX(i).toFixed(1)} ${trendY(t.transferred).toFixed(1)}`).join(" ");
  const changeCls = (n: number) => (n > 0 ? "text-emerald-600 bg-emerald-50" : n < 0 ? "text-red-600 bg-red-50" : "text-slate-500 bg-slate-100");
  const changeTxt = (n: number) => `${n > 0 ? "+" : ""}${n}%`;

  const handleExportData = () => {
    // Generate dynamically compiled CSV report based on active dashboard metrics
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Voqly AI Dialer Analytics Report\n";
    csvContent += `Generated On,${new Date().toLocaleDateString()}\n\n`;
    csvContent += "METRIC,VALUE\n";
    csvContent += `Total Calls,${kpis.total_calls}\n`;
    csvContent += `Total Minutes,${kpis.total_minutes}\n`;
    csvContent += `Containment Rate,${kpis.containment_rate}%\n`;
    csvContent += `Average Sentiment,${kpis.avg_sentiment}\n`;
    csvContent += `Resolved Outcome Percentage,${outcomes.resolved}%\n`;
    csvContent += `Transferred Outcome Percentage,${outcomes.transferred}%\n`;
    csvContent += `Abandoned Outcome Percentage,${outcomes.abandoned}%\n\n`;
    
    csvContent += "VOICE AGENT NAME,TIER/CAPABILITIES,SUCCESS RATE,AVG HANDLING TIME,TOTAL CALLS,STATUS\n";
    voiceAgents.forEach((agent: VoiceAgent) => {
      csvContent += `"${agent.name}","${agent.tier}",${agent.success_rate}%,"${agent.handling_time}",${agent.total_calls},"${agent.status}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `voqly_analytics_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Filter / Header Row */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-950 tracking-tight">Advanced Analytics</h2>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Granular conversation statistics and dialer metrics curves.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto select-none relative">
          {/* Date selection picker */}
          <div
            onClick={() => {
              setTempStart(startDate);
              setTempEnd(endDate);
              setDatePickerOpen(!datePickerOpen);
            }}
            className="h-9 px-3 flex-1 sm:flex-none min-w-0 bg-white border border-slate-250 rounded-lg flex items-center justify-center sm:justify-start text-xs font-bold text-slate-750 shadow-xs cursor-pointer hover:bg-slate-50/50"
          >
            <Globe className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <span className="truncate">
              {startDate && endDate
                ? `${new Date(startDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${new Date(endDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                : "Select Date Range"}
            </span>
          </div>

          {datePickerOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDatePickerOpen(false)} />
              <div className="absolute right-0 top-10 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-4 z-20 text-left space-y-3">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Custom Date Range</span>
                <div className="space-y-2">
                  <div>
                    <label className="text-[9px] text-slate-500 font-bold block mb-1">START DATE</label>
                    <input
                      type="date"
                      value={tempStart}
                      onChange={(e) => setTempStart(e.target.value)}
                      className="w-full h-8 px-2 bg-white border border-slate-200 rounded text-[10px] font-semibold text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-500 font-bold block mb-1">END DATE</label>
                    <input
                      type="date"
                      value={tempEnd}
                      onChange={(e) => setTempEnd(e.target.value)}
                      className="w-full h-8 px-2 bg-white border border-slate-200 rounded text-[10px] font-semibold text-slate-900 outline-none"
                    />
                  </div>
                </div>
                <button
                  onClick={() => {
                    setStartDate(tempStart);
                    setEndDate(tempEnd);
                    setDatePickerOpen(false);
                  }}
                  className="w-full h-8 bg-[#0b1931] hover:bg-slate-950 text-white text-[10px] font-bold rounded flex items-center justify-center cursor-pointer shadow-sm"
                >
                  Apply Range
                </button>
              </div>
            </>
          )}

          <button
            onClick={handleExportData}
            className="h-9 px-4 flex-1 sm:flex-none bg-[#0b1931] hover:bg-slate-950 text-xs font-bold text-white rounded-lg transition-all flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer whitespace-nowrap"
          >
            <FileUp className="w-4 h-4" />
            <span>Export Data</span>
          </button>
        </div>
      </div>

      {/* 4 KPI metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1 */}
        <div className="bg-white border border-slate-250 p-5 rounded-2xl shadow-xs">
          <span className="text-[10px] text-slate-455 font-bold uppercase tracking-wider block">Total Calls</span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-extrabold text-slate-950 font-mono">{kpis.total_calls.toLocaleString()}</span>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${changeCls(comparison.calls_change)}`}>{changeTxt(comparison.calls_change)}</span>
          </div>
          <span className="text-[9px] text-slate-400 font-semibold block mt-1">vs {comparison.calls_prev.toLocaleString()} last period</span>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-slate-250 p-5 rounded-2xl shadow-xs">
          <span className="text-[10px] text-slate-455 font-bold uppercase tracking-wider block">Total Minutes</span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-extrabold text-slate-950 font-mono">{kpis.total_minutes}</span>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${changeCls(comparison.minutes_change)}`}>{changeTxt(comparison.minutes_change)}</span>
          </div>
          <span className="text-[9px] text-slate-400 font-semibold block mt-1">Avg {kpis.avg_duration} per call</span>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-slate-250 p-5 rounded-2xl shadow-xs">
          <span className="text-[10px] text-slate-455 font-bold uppercase tracking-wider block">Containment Rate</span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-extrabold text-slate-950 font-mono">{kpis.containment_rate}%</span>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${changeCls(comparison.containment_change)}`}>{changeTxt(comparison.containment_change)}</span>
          </div>
          <span className="text-[9px] text-slate-400 font-semibold block mt-1">Target: &gt;80%</span>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-slate-250 p-5 rounded-2xl shadow-xs">
          <span className="text-[10px] text-slate-455 font-bold uppercase tracking-wider block">Avg Sentiment</span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-extrabold text-slate-950 font-mono">{kpis.avg_sentiment > 0 ? kpis.avg_sentiment.toFixed(2) : "0.00"}</span>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${kpis.avg_sentiment >= 4 ? "text-emerald-600 bg-emerald-50" : kpis.avg_sentiment >= 2.5 ? "text-amber-600 bg-amber-50" : kpis.avg_sentiment > 0 ? "text-red-600 bg-red-50" : "text-slate-500 bg-slate-100"}`}>{kpis.avg_sentiment >= 4 ? "Optimal" : kpis.avg_sentiment >= 2.5 ? "Fair" : kpis.avg_sentiment > 0 ? "Low" : "No data"}</span>
          </div>
          <span className="text-[9px] text-slate-400 font-semibold block mt-1">Out of 5.0 points</span>
        </div>
      </div>

      {/* Hourly aggregated call trend curve */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pb-4 border-b border-slate-100 mb-6 select-none">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Call Volume Trend</h4>
            <p className="text-[9px] text-slate-450 font-medium mt-0.5">Hourly aggregated call metrics over time</p>
          </div>

          <div className="flex items-center space-x-4 text-[10px] font-bold select-none shrink-0">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-900" />
              <span className="text-slate-550">Successful</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-300" />
              <span className="text-slate-550">Transferred</span>
            </div>
          </div>
        </div>

        <div className="relative h-44 flex items-end pl-10">
          {/* Y-axis labels (calls) */}
          <div className="absolute left-0 top-0 bottom-0 w-9 flex flex-col justify-between text-[9px] text-slate-400 font-mono text-right pr-1.5 select-none">
            <span>{trendMax}</span>
            <span>{Math.round(trendMax / 2)}</span>
            <span>0</span>
          </div>
          <svg className="w-full h-full" viewBox="0 0 500 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="anGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            {/* horizontal grid lines */}
            <line x1="0" y1="15" x2="500" y2="15" stroke="#f1f5f9" strokeWidth="1" />
            <line x1="0" y1="57.5" x2="500" y2="57.5" stroke="#f1f5f9" strokeWidth="1" />
            <line x1="0" y1="100" x2="500" y2="100" stroke="#e2e8f0" strokeWidth="1" />
            {trend.length > 0 ? (
              <>
                {succArea && <path d={succArea} fill="url(#anGrad)" />}
                <path d={succPath} fill="none" stroke="#0033cc" strokeWidth="2" />
                <path d={transPath} fill="none" stroke="#93c5fd" strokeWidth="1.5" strokeDasharray="3 3" />
                {trend.map((t, i) => (
                  <circle key={i} cx={trendX(i)} cy={trendY(t.successful)} r="1.6" fill="#0033cc">
                    <title>{`${t.successful} successful${t.transferred ? ` · ${t.transferred} transferred` : ""}`}</title>
                  </circle>
                ))}
              </>
            ) : (
              <line x1="0" y1="99" x2="500" y2="99" stroke="#e2e8f0" strokeWidth="2" />
            )}
          </svg>
          {/* Hours markers */}
          <div className="absolute bottom-[-22px] left-10 right-0 flex justify-between px-2 text-[9px] text-slate-400 font-mono font-bold select-none">
            <span>00:00</span>
            <span>04:00</span>
            <span>08:00</span>
            <span>12:00</span>
            <span>16:00</span>
            <span>20:00</span>
            <span>23:59</span>
          </div>
        </div>
      </div>

      {/* Split Donut Outcomes & Peak Traffic Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
        {/* Outcome split (2/5 cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 p-6 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="pb-4 border-b border-slate-100 mb-4 text-left">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Outcome Distribution</h4>
          </div>

          <div className="relative flex justify-center items-center py-2">
            <svg className="w-28 h-28 transform -rotate-90">
              <circle cx="56" cy="56" r="44" className="stroke-slate-100" strokeWidth="10" fill="transparent" />
              <circle cx="56" cy="56" r="44" className="stroke-blue-750" strokeWidth="10" fill="transparent" strokeDasharray="276" strokeDashoffset={276 - (276 * outcomes.resolved / 100)} />
              <circle cx="56" cy="56" r="44" className="stroke-indigo-400" strokeWidth="10" fill="transparent" strokeDasharray="276" strokeDashoffset={276 - (276 * (outcomes.resolved + outcomes.transferred) / 100)} />
              <circle cx="56" cy="56" r="44" className="stroke-blue-200" strokeWidth="10" fill="transparent" strokeDasharray="276" strokeDashoffset={276 - (276 * (outcomes.resolved + outcomes.transferred + outcomes.abandoned) / 100)} />
            </svg>
            <div className="absolute inset-0 flex flex-col justify-center items-center">
              <span className="text-lg font-extrabold text-slate-950">{outcomes.resolved}%</span>
              <span className="text-[8px] font-bold text-slate-400">RESOLVED</span>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 text-[10px] font-bold text-slate-500">
            <div className="flex justify-between">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-750" />
                <span>Resolved</span>
              </div>
              <span className="text-slate-900 font-mono">{outcomes.resolved}%</span>
            </div>
            <div className="flex justify-between">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                <span>Transferred</span>
              </div>
              <span className="text-slate-900 font-mono">{outcomes.transferred}%</span>
            </div>
            <div className="flex justify-between">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-200" />
                <span>Abandoned</span>
              </div>
              <span className="text-slate-900 font-mono">{outcomes.abandoned}%</span>
            </div>
          </div>
        </div>

        {/* Peak Traffic Heatmap grid (3/5 cols) */}
        <div className="lg:col-span-3 bg-white border border-slate-200/90 p-6 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4 select-none">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Peak Traffic Heatmap</h4>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">ACTIVE SESSIONS</span>
          </div>

          {/* Heatmap Grid */}
          <div className="space-y-2 select-none">
            {heatmap.map((row: HeatmapRow, idx: number) => (
              <div key={idx} className="flex items-center space-x-2 text-[9px] font-bold">
                <span className="w-8 text-slate-455 text-left">{row.day}</span>
                <div className="flex-1 grid grid-cols-8 gap-1.5">
                  {row.slots.map((val: number, i: number) => {
                    const bgStyle =
                      val >= 9 ? "bg-[#091e42]" :
                        val >= 7 ? "bg-[#1c3f75]" :
                          val >= 4 ? "bg-[#4571ad]" :
                            val >= 2 ? "bg-[#9bc2e6]" : "bg-[#f1f5f9]";
                    return (
                      <div
                        key={i}
                        className={`h-5 rounded-sm transition-all hover:scale-105 border border-slate-100 ${bgStyle}`}
                        title={`Intensity ${val}/10`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Heatmap Legend */}
          <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold mt-4 pt-3 border-t border-slate-50 select-none">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 bg-[#f1f5f9] border border-slate-200 rounded-sm" />
              <span>Low</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 bg-[#091e42] rounded-sm" />
              <span>Critical</span>
            </div>
            <span className="italic font-normal">Dynamic hourly peaks parsed from vendor dial history</span>
          </div>
        </div>
      </div>

      {/* Top Performing Voice Agents Progress list */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden text-left">
        <div className="h-12 px-6 border-b border-slate-100 flex items-center justify-between select-none">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Top Performing Voice Agents</h4>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider select-none">
            Active Directory
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left border-collapse select-none">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] text-slate-455 font-bold uppercase tracking-wider">
                <th className="p-4 pl-6">AGENT NAME</th>
                <th className="p-4">SUCCESS RATE</th>
                <th className="p-4">AVG HANDLING TIME</th>
                <th className="p-4">TOTAL CALLS</th>
                <th className="p-4 pr-6 text-right">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredVoiceAgents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 font-bold">
                    No active voice agents registered under this organization workspace yet.
                  </td>
                </tr>
              ) : (
                filteredVoiceAgents.map((agent: VoiceAgent, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-all">
                    <td className="p-4 pl-6">
                      <div className="text-slate-900 font-extrabold">{agent.name}</div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{agent.tier}</div>
                    </td>
                    <td className="p-4 min-w-[140px]">
                      <div className="flex items-center space-x-3.5">
                        <span className="font-mono text-slate-800 w-10">{agent.success_rate}%</span>
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${agent.success_rate >= 80 ? "bg-emerald-500" : "bg-amber-500"}`}
                            style={{ width: `${agent.success_rate}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-650 font-mono">{agent.handling_time}</td>
                    <td className="p-4 text-slate-900 font-mono">{agent.total_calls.toLocaleString()}</td>
                    <td className="p-4 pr-6 text-right">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${agent.status === "ACTIVE"
                        ? "text-emerald-700 bg-emerald-50 border border-emerald-100"
                        : "text-slate-500 bg-slate-50 border border-slate-200"
                        }`}>
                        {agent.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dark navy Call Lifecycle Funnel Container */}
      <div className="bg-[#091e42] border border-blue-950 text-white rounded-2xl p-6 shadow-md select-none text-left relative overflow-hidden">
        <div className="absolute top-[-30%] right-[-10%] w-96 h-96 bg-blue-700/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="pb-4 border-b border-white/10 mb-6 flex justify-between items-start">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Call Lifecycle Funnel</h4>
            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed max-w-xl">
              Our AI handles 100% of incoming volume. The funnel below illustrates the efficiency of automated containment versus human hand-off.
            </p>
          </div>
          <span className="w-8 shrink-0 text-white" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left: Progress Bars */}
          <div className="space-y-5">
            {funnel.map((fun: FunnelStep, idx: number) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-bold tracking-wider">
                  <span className="flex items-center text-slate-200">
                    <span className="w-5 h-5 bg-white/10 rounded-full flex items-center justify-center font-bold text-[9px] mr-2 text-white">{idx + 1}</span>
                    {fun.step}
                  </span>
                  <span className="font-mono text-white text-xs">{fun.percent}%</span>
                </div>

                {/* Bar track */}
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full" style={{ width: `${fun.percent}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Right: Funnel Graphic representation */}
          <div className="flex justify-center items-center">
            <div className="relative w-72 h-44 flex flex-col justify-between items-center py-2 select-none">
              <svg className="w-full h-full" viewBox="0 0 200 120">
                <polygon points="10,5 190,5 160,35 40,35" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
                <polygon points="45,40 155,40 130,70 70,70" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
                <polygon points="75,75 125,75 110,105 90,105" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
