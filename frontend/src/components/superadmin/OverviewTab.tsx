import React from "react";
import Link from "next/link";
import {
  Users, Activity, BarChart3, Globe, Database, Cpu, Phone, RefreshCw, Sliders, Layers,
  Bot, Target, Contact, Clock, PhoneCall, TrendingUp, Server, Settings, BookOpen, ArrowUpRight,
  Smile, Meh, Frown, Wallet
} from "lucide-react";
import { useSuperAdmin } from "src/context/SuperAdminContext";
import { ExpiringSubscription } from "src/types/system";

const SERVICE_ICON: Record<string, React.ElementType> = {
  database: Database, api: Server, llm: Cpu, telephony: Phone, webhook: Globe,
  // legacy ids (kept so old payloads still render an icon)
  postgres: Database, redis: Cpu, twilio: Phone, kafka: RefreshCw, gemini: Sliders, s3: Layers,
};

const QUICK_ACCESS = [
  { href: "/superadmin/vendors", label: "Vendors", desc: "Tenant registry", icon: Users, color: "text-blue-600 bg-blue-50" },
  { href: "/superadmin/revenue", label: "Revenue", desc: "MRR & billing", icon: BarChart3, color: "text-emerald-600 bg-emerald-50" },
  { href: "/superadmin/vendor-costing", label: "Vendor Costing", desc: "Usage & cost", icon: Wallet, color: "text-rose-600 bg-rose-50" },
  { href: "/superadmin/agent-catalog", label: "Agent Catalog", desc: "Industries & prompts", icon: BookOpen, color: "text-violet-600 bg-violet-50" },
  { href: "/superadmin/system-health", label: "System Health", desc: "Live telemetry", icon: Activity, color: "text-amber-600 bg-amber-50" },
  { href: "/superadmin/settings", label: "Settings", desc: "Platform config", icon: Settings, color: "text-slate-600 bg-slate-100" },
];

interface OverviewTabProps {
  metrics: {
    total_tenants: number;
    total_agents?: number;
    total_tenants_growth: string;
    total_tenants_sub: string;
    live_calls: number;
    live_calls_progress: number;
    revenue_mtd: number;
    revenue_mtd_growth: string;
    revenue_mtd_sub: string;
    system_uptime: number;
    system_uptime_sub?: string;
  } | null;
  mrrChart: Array<{ month: string; value: number }>;
  infraData: {
    services: Array<{ id: string; name: string; status: string; uptime: string; latency: string }>;
  } | null;
}

export default function OverviewTab({
  metrics,
  mrrChart,
  infraData,
}: OverviewTabProps) {
  const { expiringSubs = [], handleSendReminder, analytics } = useSuperAdmin();
  if (!metrics) return null;

  const t = analytics?.totals;
  const opCards = [
    { label: "AI Agents", value: t?.agents ?? metrics.total_agents ?? 0, icon: Bot, color: "text-violet-600 bg-violet-50" },
    { label: "Campaigns", value: t?.campaigns ?? 0, icon: Target, color: "text-blue-600 bg-blue-50" },
    { label: "Total Calls", value: t?.calls ?? 0, icon: PhoneCall, color: "text-emerald-600 bg-emerald-50" },
    { label: "Talk Minutes", value: t?.minutes ?? 0, icon: Clock, color: "text-amber-600 bg-amber-50" },
    { label: "Leads", value: t?.leads ?? 0, icon: Contact, color: "text-rose-600 bg-rose-50" },
    { label: "Connect Rate", value: `${t?.connect_rate ?? 0}%`, icon: TrendingUp, color: "text-cyan-600 bg-cyan-50" },
  ];
  const sentiment = analytics?.sentiment ?? { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 };
  const sentimentTotal = sentiment.POSITIVE + sentiment.NEUTRAL + sentiment.NEGATIVE;
  const callsTrend = analytics?.calls_trend ?? [];
  const maxTrend = Math.max(...callsTrend.map((d) => d.calls), 1);
  const outcomes = analytics?.outcomes ?? [];
  const maxOutcome = Math.max(...outcomes.map((o) => o.count), 1);
  const topVendors = analytics?.top_vendors ?? [];
  const pct = (n: number) => (sentimentTotal ? Math.round((n / sentimentTotal) * 100) : 0);

  return (
    <div className="space-y-8 animate-fade-in text-left select-none">
      
      {/* Row of 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Tenants card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-3xs flex flex-col justify-between h-28 hover:scale-[1.01] transition-transform duration-200">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">TOTAL TENANTS</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0f2e5c]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-black text-slate-955 font-mono tracking-tight">
              {metrics.total_tenants.toLocaleString()}
            </span>
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">{metrics.total_tenants_growth}</span>
          </div>
          <span className="text-[9px] text-slate-450 font-bold tracking-wide mt-1 block select-none">
            {metrics.total_tenants_sub}
          </span>
        </div>

        {/* Live Calls card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-3xs flex flex-col justify-between h-28 hover:scale-[1.01] transition-transform duration-200">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">LIVE CALLS</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-left leading-none">
            <span className="text-2xl font-black text-slate-955 font-mono tracking-tight">{metrics.live_calls}</span>
            <span className="text-[10px] text-slate-500 font-bold ml-2">Active now</span>
          </div>
          {/* Live calls progress bar */}
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 relative overflow-hidden">
            <div className="bg-[#0f2e5c] h-full rounded-full transition-all duration-500" style={{ width: `${metrics.live_calls_progress}%` }} />
          </div>
        </div>

        {/* Revenue MTD card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-3xs flex flex-col justify-between h-28 hover:scale-[1.01] transition-transform duration-200">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">REVENUE MTD</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-black text-slate-955 font-mono tracking-tight">
              ${metrics.revenue_mtd.toLocaleString()}
            </span>
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">{metrics.revenue_mtd_growth}</span>
          </div>
          <span className="text-[9px] text-slate-450 font-bold tracking-wide mt-1 block select-none">
            {metrics.revenue_mtd_sub}
          </span>
        </div>

        {/* Uptime card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-3xs flex flex-col justify-between h-28 hover:scale-[1.01] transition-transform duration-200">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">SYSTEM UPTIME</span>
            <div className="w-7 h-7 rounded-lg bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-700">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-black text-slate-955 font-mono tracking-tight">{metrics.system_uptime}%</span>
          </div>
          <span className="text-[9px] text-slate-450 font-bold tracking-wide mt-1 block select-none">
            {metrics.system_uptime_sub}
          </span>
        </div>
      </div>

      {/* Operational analytics KPI row (platform-wide, real) */}
      <div>
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 select-none">Operational Analytics</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {opCards.map((c) => (
            <div key={c.label} className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-3xs flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${c.color}`}><c.icon className="w-4 h-4" /></div>
              <div className="min-w-0">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider truncate">{c.label}</p>
                <p className="text-lg font-extrabold text-slate-900 leading-tight font-mono">{typeof c.value === "number" ? c.value.toLocaleString() : c.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Access — jump to any admin section */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-3xs">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest block border-b border-slate-100 pb-2.5 mb-4">Quick Access</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {QUICK_ACCESS.map((q) => (
            <Link key={q.href} href={q.href} className="group flex items-center gap-3 p-3.5 rounded-2xl border border-slate-150 bg-slate-50/60 hover:bg-white hover:border-blue-200 hover:shadow-sm transition">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${q.color}`}><q.icon className="w-4 h-4" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-slate-800 truncate">{q.label}</p>
                <p className="text-[10px] text-slate-400 font-bold truncate">{q.desc}</p>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      {/* MRR Growth chart (full width) */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-3xs text-left select-none relative flex flex-col justify-between">
          <div className="flex justify-between items-center select-none mb-6">
            <div>
              <h4 className="text-xs font-black text-slate-455 uppercase tracking-widest block">MRR Growth Trend</h4>
              <span className="text-lg font-black text-slate-800 mt-0.5 block select-none">Monthly Recurring Revenue</span>
            </div>
            <div className="flex gap-1.5 select-none bg-slate-50 border border-slate-150 rounded-xl p-1">
              <span className="text-[9px] font-black text-slate-500 px-3 py-1 rounded-lg cursor-pointer hover:bg-white hover:text-slate-800 transition-all select-none">6 Months</span>
              <span className="text-[9px] font-black bg-[#0f2e5c] text-white px-3 py-1 rounded-lg shadow-2xs cursor-pointer select-none">1 Year</span>
            </div>
          </div>

          {/* Columns visual representation in custom CSS/SVG grid */}
          <div className="flex-1 min-h-[220px] flex items-end justify-between px-6 pb-2 border-b border-slate-100 relative mt-4 select-none animate-fade-in">
            {mrrChart.length === 0 ? (
              <div className="w-full flex flex-col items-center justify-center text-slate-300 py-16">
                <BarChart3 className="w-8 h-8 mb-2" />
                <span className="text-xs font-bold">No invoiced revenue recorded in this period yet.</span>
              </div>
            ) : (() => {
              const maxMrrVal = Math.max(...mrrChart.map(item => item.value), 1);
              return mrrChart.map((item, idx) => {
                const heightPct = (item.value / maxMrrVal) * 100;
                return (
                  <div key={idx} className="flex flex-col items-center group flex-1 max-w-[90px] cursor-pointer relative">
                    {/* Hover tooltip */}
                    <div className="absolute -top-10 scale-95 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all bg-slate-950 text-white text-[9px] font-bold px-2 py-1 rounded shadow-md z-20 font-mono">
                      ${item.value.toLocaleString()}
                    </div>
                    <div 
                      className="w-9 bg-[#e2e8f0] group-hover:bg-[#0f2e5c] rounded-t-lg transition-all duration-500 shadow-3xs" 
                      style={{ height: `${heightPct}%`, minHeight: "20px" }}
                    />
                    <span className="text-[10px] text-slate-455 font-bold uppercase tracking-wider mt-2.5">{item.month}</span>
                  </div>
                );
              });
            })()}
          </div>
        </div>

      {/* Calls trend + Top vendors */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* 14-day call volume */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-3xs text-left select-none flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h4 className="text-xs font-black text-slate-455 uppercase tracking-widest block">Call Volume</h4>
              <span className="text-lg font-black text-slate-800 mt-0.5 block">Last 14 days</span>
            </div>
            <span className="text-[10px] font-black text-slate-500 bg-slate-50 border border-slate-150 px-3 py-1 rounded-lg">{callsTrend.reduce((s, d) => s + d.calls, 0).toLocaleString()} calls</span>
          </div>
          <div className="flex-1 min-h-[200px] flex items-end justify-between gap-1 px-1 pb-2 border-b border-slate-100">
            {callsTrend.length === 0 ? (
              <div className="w-full flex flex-col items-center justify-center text-slate-300 py-16"><PhoneCall className="w-8 h-8 mb-2" /><span className="text-xs font-bold">No calls recorded yet.</span></div>
            ) : callsTrend.map((d, idx) => (
              <div key={idx} className="flex flex-col items-center group flex-1 cursor-pointer relative">
                <div className="absolute -top-9 scale-95 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all bg-slate-950 text-white text-[9px] font-bold px-2 py-1 rounded shadow-md z-20 font-mono whitespace-nowrap">{d.calls} · {d.day}</div>
                <div className="w-full max-w-[22px] bg-[#e2e8f0] group-hover:bg-[#0f2e5c] rounded-t-md transition-all duration-500" style={{ height: `${(d.calls / maxTrend) * 100}%`, minHeight: d.calls > 0 ? "8px" : "2px" }} />
                <span className="text-[8px] text-slate-400 font-bold mt-2 whitespace-nowrap">{d.day.split(" ")[0]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top vendors by activity */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-3xs text-left select-none flex flex-col">
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-3 mb-4">Most Active Vendors</h4>
          <div className="space-y-3 flex-1">
            {topVendors.length === 0 ? (
              <div className="py-10 text-center text-slate-300 text-xs font-bold">No call activity yet.</div>
            ) : topVendors.map((v, i) => (
              <Link key={v.id} href={`/superadmin/vendors/${v.id}`} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-150 transition">
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${i === 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-slate-800 truncate">{v.name}</p>
                  <p className="text-[9px] text-slate-400 font-bold">{v.agents} agents · {v.minutes} min</p>
                </div>
                <span className="text-xs font-black text-slate-900 font-mono shrink-0">{v.calls.toLocaleString()}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Call outcomes + Sentiment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Call outcome breakdown */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-3xs text-left select-none">
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-3 mb-4">Call Outcomes</h4>
          <div className="space-y-3">
            {outcomes.length === 0 ? (
              <div className="py-8 text-center text-slate-300 text-xs font-bold">No calls recorded yet.</div>
            ) : outcomes.slice(0, 6).map((o) => (
              <div key={o.status} className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider w-24 shrink-0 truncate">{o.status}</span>
                <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${o.status === "COMPLETED" ? "bg-emerald-500" : o.status === "FAILED" ? "bg-red-500" : "bg-[#0f2e5c]"}`} style={{ width: `${(o.count / maxOutcome) * 100}%` }} />
                </div>
                <span className="text-xs font-black text-slate-900 font-mono w-10 text-right shrink-0">{o.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sentiment breakdown */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-3xs text-left select-none">
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-3 mb-4">Call Sentiment</h4>
          {sentimentTotal === 0 ? (
            <div className="py-8 text-center text-slate-300 text-xs font-bold">No analyzed calls yet.</div>
          ) : (
            <div className="space-y-4">
              {([
                { key: "POSITIVE", label: "Positive", icon: Smile, val: sentiment.POSITIVE, bar: "bg-emerald-500", text: "text-emerald-600" },
                { key: "NEUTRAL", label: "Neutral", icon: Meh, val: sentiment.NEUTRAL, bar: "bg-slate-400", text: "text-slate-500" },
                { key: "NEGATIVE", label: "Negative", icon: Frown, val: sentiment.NEGATIVE, bar: "bg-red-500", text: "text-red-600" },
              ] as const).map((s) => (
                <div key={s.key} className="flex items-center gap-3">
                  <s.icon className={`w-4 h-4 shrink-0 ${s.text}`} />
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider w-16 shrink-0">{s.label}</span>
                  <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${pct(s.val)}%` }} />
                  </div>
                  <span className="text-xs font-black text-slate-900 font-mono w-16 text-right shrink-0">{s.val} · {pct(s.val)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Service Health Nodes panel */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-3xs text-left select-none relative">
        <h4 className="text-xs font-black text-slate-455 uppercase tracking-widest block mb-4">Service Health Infrastructure</h4>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {infraData?.services.map((srv: { id: string; name: string; status: string; uptime: string; latency: string }) => {
            const SrvIcon = SERVICE_ICON[srv.id] || Server;
            return (
              <div key={srv.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between shadow-3xs">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <SrvIcon className={`w-4 h-4 shrink-0 ${srv.status === "nominal" ? "text-blue-600" : srv.status === "warning" ? "text-amber-500" : "text-red-500"}`} />
                  <span className="text-xs font-black text-slate-900 truncate">{srv.name}</span>
                </div>
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  srv.status === "nominal" ? "bg-emerald-500" : srv.status === "warning" ? "bg-amber-500" : "bg-red-500 animate-pulse"
                }`} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Subscription Expirations Near-Expiry Panel */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs text-left select-none relative">
        <div className="flex justify-between items-center select-none border-b border-slate-100 pb-3 mb-4">
          <div>
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest block">⚠️ Subscription Renewals Expiring Soon</h4>
            <span className="text-base font-black text-slate-805 mt-0.5 block select-none">
              Identify and notify enterprise tenants whose subscription plans will expire within the next 7 days.
            </span>
          </div>
          <span className="bg-amber-50 border border-amber-200 text-amber-700 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            {expiringSubs.length} Near Expiry
          </span>
        </div>

        {expiringSubs.length === 0 ? (
          <div className="py-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200/50">
            <p className="font-bold text-xs">All active subscriptions are in good standing.</p>
            <p className="text-[10px] mt-0.5">No client contracts are expiring within the 7-day threshold.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {expiringSubs.map((sub: ExpiringSubscription) => (
              <div key={sub.sub_id} className="p-4 bg-amber-50/20 border border-amber-200/60 rounded-2xl flex flex-col justify-between space-y-4 hover:bg-amber-50/30 transition shadow-2xs">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-extrabold text-slate-900 truncate max-w-[70%]">{sub.vendor_name}</span>
                    <span className="text-[8px] font-black uppercase bg-amber-100/80 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">{sub.plan_tier}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 space-y-0.5 leading-relaxed font-semibold">
                    <p>Owner: <span className="text-slate-800 font-bold">{sub.owner_email}</span></p>
                    <p>Expires: <span className="text-slate-800 font-mono font-bold">{sub.renewal_date}</span></p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-amber-100/50 pt-3">
                  <span className="text-[10px] text-amber-705 font-black uppercase tracking-wider">{sub.days_left} Days Left</span>
                  <button
                    type="button"
                    onClick={() => handleSendReminder(sub.sub_id)}
                    className="h-7 px-3 bg-amber-600 hover:bg-amber-750 text-[9px] font-black text-white rounded-lg uppercase tracking-wider shadow-sm transition active:scale-[0.98] cursor-pointer"
                  >
                    Send Reminder
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
