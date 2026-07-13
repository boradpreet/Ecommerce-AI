"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  PhoneCall, Volume2, CheckCircle2, PlayCircle, Globe, Plus, Phone, TrendingUp,
  Users, Contact, BarChart3, Mic, CreditCard, Settings, ArrowUpRight, LayoutGrid
} from "lucide-react";

const QUICK_LINKS = [
  { href: "/dashboard/agents", label: "AI Agents", desc: "Voice agents", icon: Users, color: "text-violet-600 bg-violet-50" },
  { href: "/dashboard/leads", label: "Leads", desc: "Lists & imports", icon: Contact, color: "text-rose-600 bg-rose-50" },
  { href: "/dashboard/campaigns", label: "Campaigns", desc: "Create & run", icon: PlayCircle, color: "text-blue-600 bg-blue-50" },
  { href: "/dashboard/call-logs", label: "Call Logs", desc: "Calls & audio", icon: PhoneCall, color: "text-emerald-600 bg-emerald-50" },
  { href: "/dashboard/analytics", label: "Analytics", desc: "Performance", icon: BarChart3, color: "text-amber-600 bg-amber-50" },
  { href: "/dashboard/voice-library", label: "Voice Library", desc: "Browse voices", icon: Mic, color: "text-indigo-600 bg-indigo-50" },
  { href: "/dashboard/billing", label: "Billing", desc: "Plan & usage", icon: CreditCard, color: "text-cyan-600 bg-cyan-50" },
  { href: "/dashboard/settings", label: "Settings", desc: "Workspace config", icon: Settings, color: "text-slate-600 bg-slate-100" },
];

export interface LiveSession {
  id: string;
  agent_name: string;
  phone: string;
  intent: string;
  duration: string;
  progress_percent: number;
}

export interface DashboardMetrics {
  kpis: {
    total_calls: number;
    minutes_used: number;
    containment_rate: number;
    active_campaigns: number;
  };
  volume_trend: { day: string; calls: number }[];
  volume_trend_weekly?: { day: string; calls: number }[];
  outcomes: {
    successful: number;
    in_progress: number;
    failed: number;
  };
  live_sessions: LiveSession[];
}

interface DashboardTabProps {
  metrics: DashboardMetrics | null;
  userName: string;
  setSelectedCallSim: (session: LiveSession | null) => void;
  setActiveTab: (tab: string) => void;
}

/* ─── Animated counter hook ──────────────────────────────── */
function useCountUp(target: number, duration = 1200, start = true) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setValue(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
      else setValue(target);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return value;
}

/* ─── Animated bar component ──────────────────────────────── */
function AnimatedBar({
  percentHeight,
  active,
  delay,
  calls,
  day,
}: {
  percentHeight: number;
  active: boolean;
  delay: number;
  calls: number;
  day: string;
}) {
  const [height, setHeight] = useState(0);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setHeight(percentHeight), delay);
    return () => clearTimeout(timer);
  }, [percentHeight, delay]);

  return (
    <div
      className="relative cursor-pointer select-none"
      style={{
        width: "100%",
        height: `${height}%`,
        transition: "height 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
        borderRadius: "6px 6px 0 0",
        background: hovered
          ? active
            ? "#0f2040"
            : "#cbd5e1"
          : active
          ? "#0b1931"
          : "#e2e8f0",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Shimmer highlight at top */}
      {active && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            borderRadius: "6px 6px 0 0",
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
            animation: "shimmer 2s infinite",
          }}
        />
      )}
      {/* Tooltip */}
      {hovered && (
        <div
          style={{
            position: "absolute",
            top: "-32px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#0b1931",
            color: "white",
            fontSize: "10px",
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: "6px",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          {calls.toLocaleString()} call{calls === 1 ? "" : "s"} · {day}
        </div>
      )}
    </div>
  );
}

/* ─── Animated donut segment ─────────────────────────────── */
function DonutSegment({
  cx, cy, r, strokeColor, strokeWidth,
  dasharray, targetOffset, delay,
}: {
  cx: number; cy: number; r: number; strokeColor: string;
  strokeWidth: number; dasharray: number;
  targetOffset: number; delay: number;
}) {
  const [offset, setOffset] = useState(dasharray); // start fully hidden
  useEffect(() => {
    const timer = setTimeout(() => setOffset(targetOffset), delay);
    return () => clearTimeout(timer);
  }, [targetOffset, delay]);

  return (
    <circle
      cx={cx} cy={cy} r={r}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      fill="transparent"
      strokeDasharray={dasharray}
      strokeDashoffset={offset}
      strokeLinecap="round"
      style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)" }}
    />
  );
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  metrics,
  userName,
  setSelectedCallSim,
  setActiveTab,
}) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  // KPI animated counters
  const totalCalls   = useCountUp(metrics?.kpis?.total_calls   ?? 0, 1400, mounted);
  const minutesUsed  = useCountUp(metrics?.kpis?.minutes_used  ?? 0, 1600, mounted);
  const activeCamps  = useCountUp(metrics?.kpis?.active_campaigns ?? 0, 900,  mounted);
  const containment  = metrics?.kpis?.containment_rate ?? 0;

  const [chartView, setChartView] = useState<"daily" | "weekly">("daily");
  const volumeData = (chartView === "weekly" ? metrics?.volume_trend_weekly : metrics?.volume_trend) ?? [];
  const maxCalls = Math.max(...volumeData.map((d) => d.calls), 1);

  // Donut chart maths (circumference = 2π × 50 ≈ 314.16)
  const CIRC = 314.16;
  const successPct   = metrics?.outcomes?.successful  ?? 0;
  const inProgPct    = metrics?.outcomes?.in_progress ?? 0;
  const failedPct    = metrics?.outcomes?.failed      ?? 0;
  // dashoffset = CIRC - (pct/100)*CIRC
  const successOffset = CIRC * (1 - successPct / 100);
  const inProgOffset  = CIRC * (1 - inProgPct  / 100);

  return (
    <>
      {/* Inject keyframes once */}
      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          0%   { opacity: 0; transform: scale(0.85); }
          70%  { transform: scale(1.04); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.18); }
          50%       { box-shadow: 0 0 0 8px rgba(59,130,246,0); }
        }
      `}</style>

      <div className="space-y-6 text-left">

        {/* ── GREETING ROW ── */}
        <div
          className="flex flex-col sm:flex-row justify-between sm:items-center gap-4"
          style={{ animation: "fadeSlideUp 0.5s ease both" }}
        >
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-slate-950 tracking-tight">
              Good morning,{" "}
              <span className="bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">
                {userName ? userName.split(" ")[0] : "User"}
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Here&apos;s how your voice agents are performing today.
            </p>
          </div>
          <div className="flex items-center space-x-3.5 select-none">
            <div className="h-9 px-3 bg-white border border-slate-250 rounded-lg flex items-center text-xs font-bold text-slate-700 shadow-xs cursor-pointer hover:bg-slate-50/50 transition-all">
              <Globe className="w-4 h-4 text-slate-400 mr-2" />
              <span>{(() => { const end = new Date(); const start = new Date(); start.setDate(end.getDate() - 6); const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); return `${fmt(start)} – ${fmt(end)}, ${end.getFullYear()}`; })()}</span>
            </div>
            <button
              onClick={() => setActiveTab("campaigns")}
              className="h-9 px-4 bg-[#0b1931] hover:bg-slate-950 text-xs font-bold text-white rounded-lg transition-all flex items-center justify-center space-x-1.5 shadow-sm active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Campaign</span>
            </button>
          </div>
        </div>

        {/* ── KPI CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              label: "Total Calls",
              value: totalCalls.toLocaleString(),
              badge: "+12.4%",
              badgeColor: "text-emerald-600 bg-emerald-50",
              sub: "vs 11,104 last week",
              icon: PhoneCall,
              delay: "0s",
            },
            {
              label: "Minutes Used",
              value: minutesUsed.toLocaleString(),
              badge: "+8.2%",
              badgeColor: "text-emerald-600 bg-emerald-50",
              sub: "vs 38,914 last week",
              icon: Volume2,
              delay: "0.07s",
            },
            {
              label: "Containment Rate",
              value: `${containment}%`,
              badge: "-1.5%",
              badgeColor: "text-red-600 bg-red-50",
              sub: "vs 85.7% last week",
              icon: CheckCircle2,
              delay: "0.14s",
            },
            {
              label: "Active Campaigns",
              value: activeCamps.toString(),
              badge: "Steady",
              badgeColor: "text-slate-500 bg-slate-100",
              sub: "6 pending launch",
              icon: PlayCircle,
              delay: "0.21s",
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="bg-white border border-slate-250/95 p-5 rounded-2xl shadow-xs flex flex-col justify-between space-y-3.5 hover:shadow-md transition-shadow duration-300"
                style={{
                  animation: `popIn 0.5s ${card.delay} ease both`,
                }}
              >
                <div className="flex justify-between items-start">
                  <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">
                    {card.label}
                  </span>
                  <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center text-blue-750">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-extrabold text-slate-950 tracking-tight">
                      {card.value}
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${card.badgeColor}`}>
                      {card.badge}
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-semibold mt-1">{card.sub}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── QUICK ACCESS ── */}
        <div
          className="bg-white border border-slate-250/95 rounded-2xl p-6 shadow-xs"
          style={{ animation: "fadeSlideUp 0.55s 0.28s ease both" }}
        >
          <div className="flex items-center space-x-2 pb-4 border-b border-slate-100 mb-4 select-none">
            <LayoutGrid className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Quick Access</h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {QUICK_LINKS.map((q) => {
              const Icon = q.icon;
              return (
                <Link
                  key={q.href}
                  href={q.href}
                  className="group flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-blue-200 hover:shadow-sm transition-all"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${q.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 truncate">{q.label}</p>
                    <p className="text-[10px] text-slate-400 font-semibold truncate">{q.desc}</p>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── CHARTS ROW ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

          {/* ── BAR CHART ── */}
          <div
            className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col"
            style={{ animation: "fadeSlideUp 0.55s 0.15s ease both" }}
          >
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4 select-none">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Call Volume Trend
                </h4>
              </div>
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  onClick={() => setChartView("daily")}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${chartView === "daily" ? "text-slate-800 bg-white shadow-xs" : "text-slate-450 hover:text-slate-800"}`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setChartView("weekly")}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${chartView === "weekly" ? "text-slate-800 bg-white shadow-xs" : "text-slate-450 hover:text-slate-800"}`}
                >
                  Weekly
                </button>
              </div>
            </div>

            {/* Y-axis guide lines */}
            <div className="relative h-52 flex flex-col justify-between pr-4 pl-0">
              {/* Horizontal grid lines */}
              {[100, 75, 50, 25, 0].map((pct) => (
                <div
                  key={pct}
                  className="absolute w-full flex items-center"
                  style={{ bottom: `${pct}%` }}
                >
                  <span className="text-[9px] text-slate-400 font-mono w-8 shrink-0 text-right pr-2">
                    {Math.round((pct / 100) * maxCalls)}
                  </span>
                  <div className="flex-1 border-t border-slate-100 border-dashed" />
                </div>
              ))}

              {/* Bars */}
              <div className="absolute inset-0 left-8 flex items-end justify-between px-2 pb-0">
                {volumeData.map((item, idx) => {
                  const active = idx === volumeData.length - 1; // highlight today (rightmost)
                  const pctH = (item.calls / maxCalls) * 85;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end">
                      <AnimatedBar
                        percentHeight={pctH}
                        active={active}
                        delay={100 + idx * 80}
                        calls={item.calls}
                        day={item.day}
                      />
                      <span className="text-[10px] text-slate-450 font-bold mt-2.5 select-none">
                        {item.day}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── DONUT CHART ── */}
          <div
            className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col"
            style={{ animation: "fadeSlideUp 0.55s 0.25s ease both" }}
          >
            <div className="pb-4 border-b border-slate-100 mb-4">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Call Outcomes
              </h4>
            </div>

            <div className="relative flex justify-center items-center py-3 flex-1">
              <svg
                className="w-36 h-36 transform -rotate-90"
                viewBox="0 0 128 128"
              >
                {/* Track */}
                <circle cx="64" cy="64" r="50" stroke="#f1f5f9" strokeWidth="13" fill="transparent" />

                {/* Failed/Dropped — drawn first (bottom layer), full ring fades in */}
                <DonutSegment
                  cx={64} cy={64} r={50}
                  strokeColor="#f87171"
                  strokeWidth={13}
                  dasharray={CIRC}
                  targetOffset={CIRC * (1 - failedPct / 100)}
                  delay={200}
                />

                {/* In-progress — middle layer */}
                <DonutSegment
                  cx={64} cy={64} r={50}
                  strokeColor="#818cf8"
                  strokeWidth={13}
                  dasharray={CIRC}
                  targetOffset={inProgOffset}
                  delay={450}
                />

                {/* Successful — top layer */}
                <DonutSegment
                  cx={64} cy={64} r={50}
                  strokeColor="#2563eb"
                  strokeWidth={13}
                  dasharray={CIRC}
                  targetOffset={successOffset}
                  delay={700}
                />
              </svg>

              {/* Centre label */}
              <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none">
                <span
                  className="text-xl font-extrabold text-slate-950 font-mono"
                  style={{ animation: mounted ? "popIn 0.5s 0.9s ease both" : "none", opacity: mounted ? undefined : 0 }}
                >
                  {(metrics?.kpis?.total_calls ?? 0).toLocaleString()}
                </span>
                <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">
                  TOTAL
                </span>
              </div>
            </div>

            {/* Legend rows with animated fill bars */}
            <div className="space-y-3 pt-4 text-xs font-semibold select-none">
              {[
                { label: "Successful",    pct: successPct, color: "#2563eb", dot: "bg-blue-600"   },
                { label: "In Progress",   pct: inProgPct,  color: "#818cf8", dot: "bg-indigo-400" },
                { label: "Failed/Dropped",pct: failedPct,  color: "#f87171", dot: "bg-red-400"    },
              ].map(({ label, pct, color, dot }, i) => (
                <div key={label}>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${dot}`} />
                      <span className="text-slate-500">{label}</span>
                    </div>
                    <span className="text-slate-950 font-extrabold font-mono">{pct}%</span>
                  </div>
                  {/* Mini progress bar */}
                  <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: mounted ? `${pct}%` : "0%",
                        background: color,
                        transition: `width 1s ${0.5 + i * 0.15}s cubic-bezier(0.4, 0, 0.2, 1)`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── LIVE ACTIVITY ── */}
        <div
          className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden"
          style={{ animation: "fadeSlideUp 0.55s 0.35s ease both" }}
        >
          <div className="h-12 px-6 border-b border-slate-100 flex items-center justify-between select-none">
            <div className="flex items-center space-x-2.5">
              <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Live Activity
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                {(metrics?.live_sessions?.length ?? 0)} LIVE SESSIONS
              </span>
            </div>
            <button
              onClick={() => setActiveTab("call-logs")}
              className="text-[10px] font-bold text-blue-700 hover:underline cursor-pointer"
            >
              View All Active
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {(metrics?.live_sessions?.length ?? 0) === 0 && (
              <div className="px-6 py-12 flex flex-col items-center text-center text-slate-400">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-150 flex items-center justify-center mb-3">
                  <PhoneCall className="w-6 h-6 text-slate-300" />
                </div>
                <p className="font-semibold text-sm text-slate-500">No active calls right now</p>
                <p className="text-xs mt-1 text-slate-400">Live sessions will appear here once calls are initiated.</p>
              </div>
            )}
            {(metrics?.live_sessions || []).map((session, idx) => (
              <div
                key={session.id}
                onClick={() => setSelectedCallSim(session)}
                className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between space-y-3 md:space-y-0 hover:bg-slate-50/50 transition-all cursor-pointer group"
                style={{
                  animation: `fadeSlideUp 0.4s ${0.05 * idx}s ease both`,
                }}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 shrink-0 group-hover:scale-110 transition-transform">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <h5 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                      <span>Agent: {session.agent_name}</span>
                    </h5>
                    <p className="text-[10px] text-slate-450 mt-0.5">
                      Call ID: {session.id} · Inbound via {session.phone}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end space-x-10">
                  <div className="text-left md:text-right min-w-[150px]">
                    <span className="text-[9px] text-slate-450 font-bold uppercase tracking-wider block">
                      CURRENT INTENT
                    </span>
                    <span className="text-xs font-bold text-slate-900 block mt-0.5">
                      {session.intent}
                    </span>
                  </div>
                  <div className="text-left md:text-right">
                    <span className="text-[9px] text-slate-450 font-bold uppercase tracking-wider block">
                      DURATION
                    </span>
                    <span className="text-xs font-bold text-slate-900 font-mono block mt-0.5">
                      {session.duration}
                    </span>
                  </div>
                  {/* Animated progress bar */}
                  <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0 hidden sm:block">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{
                        width: mounted ? `${session.progress_percent}%` : "0%",
                        transition: `width 1.2s ${0.1 * idx}s ease`,
                        boxShadow: "0 0 6px rgba(16,185,129,0.5)",
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
