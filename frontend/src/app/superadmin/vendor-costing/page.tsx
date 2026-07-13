"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "src/store/authStore";
import { apiFetch } from "src/lib/api";
import {
  Loader2, Wallet, CalendarClock, Clock, PhoneCall, Cpu, Users, X, Search,
  Sparkles, Radio, FileText, ClipboardList, ArrowUpCircle, Calculator,
} from "lucide-react";
import { FilterMenu, FilterGroup } from "src/components/dashboard/filter-menu";

interface Breakdown { voice_ai: number; telephony_plivo: number; telephony_twilio: number; transcription: number; analysis: number; total: number; providers: string[]; }
interface VendorCost {
  id: number; name: string; providers: string[]; configured_provider: string; agents: number;
  usage: { minutes: number; calls: number; transcripts: number; tokens_est: number; minutes_month: number; calls_month: number; plivo_minutes: number; twilio_minutes: number };
  breakdown: Breakdown;
  cost_total: number; cost_month: number;
  credits: { allocated: number; used: number; remaining: number };
  limits: { call_minutes_limit: number; minutes_used: number; prepaid_balance: number };
}
interface CostingData {
  currency: string;
  rates: { voice_ai_per_min: number; telephony_plivo_per_min: number; telephony_twilio_per_min: number; transcription_per_min: number; ai_analysis_per_outcome: number };
  totals: { cost: number; cost_month: number; minutes: number; calls: number; tokens_est: number; vendors: number };
  vendors: VendorCost[];
}

export default function VendorCostingPage() {
  const token = useAuthStore((s) => s.token);
  const [data, setData] = useState<CostingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<VendorCost | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({ provider: "all", usage: "all", credits: "all" });

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setData(await apiFetch<CostingData>("/superadmin/vendor-costing", "GET", undefined, token));
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const cur = data?.currency || "₹";
  const money = (n: number) => `${cur}${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const num = (n: number) => (n || 0).toLocaleString();

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-slate-400"><Loader2 className="w-6 h-6 animate-spin mr-3" /> Calculating vendor costs…</div>;
  }
  if (!data) {
    return <div className="py-24 text-center text-slate-400 text-sm">Could not load vendor costing.</div>;
  }

  const kpis = [
    { label: "Total Cost (all-time)", value: money(data.totals.cost), icon: Wallet, color: "text-emerald-600 bg-emerald-50" },
    { label: "This Month", value: money(data.totals.cost_month), icon: CalendarClock, color: "text-blue-600 bg-blue-50" },
    { label: "Total Minutes", value: num(data.totals.minutes), icon: Clock, color: "text-amber-600 bg-amber-50" },
    { label: "Total Calls", value: num(data.totals.calls), icon: PhoneCall, color: "text-violet-600 bg-violet-50" },
    { label: "Est. Tokens", value: num(data.totals.tokens_est), icon: Cpu, color: "text-rose-600 bg-rose-50" },
    { label: "Vendors", value: num(data.totals.vendors), icon: Users, color: "text-cyan-600 bg-cyan-50" },
  ];

  const rateItems = [
    { icon: Sparkles, label: "Voice AI (Gemini)", value: `${cur}${data.rates.voice_ai_per_min}/min`, color: "text-violet-600" },
    { icon: Radio, label: "Telephony · Plivo", value: `${cur}${data.rates.telephony_plivo_per_min}/min`, color: "text-blue-600" },
    { icon: Radio, label: "Telephony · Twilio", value: `${cur}${data.rates.telephony_twilio_per_min}/min`, color: "text-amber-600" },
    { icon: FileText, label: "Transcription", value: `${cur}${data.rates.transcription_per_min}/min`, color: "text-emerald-600" },
    { icon: ClipboardList, label: "AI Analysis", value: `${cur}${data.rates.ai_analysis_per_outcome}/outcome`, color: "text-rose-600" },
  ];

  // stacked bar segments — telephony split per carrier actually used (only non-zero shown)
  const segs = (b: Breakdown, u: VendorCost["usage"]) => [
    { key: "voice_ai", label: "Voice AI", amount: b.voice_ai, color: "bg-violet-500" },
    { key: "plivo", label: `Telephony · Plivo (${u.plivo_minutes}m)`, amount: b.telephony_plivo, color: "bg-blue-500" },
    { key: "twilio", label: `Telephony · Twilio (${u.twilio_minutes}m)`, amount: b.telephony_twilio, color: "bg-amber-500" },
    { key: "transcription", label: "Transcription", amount: b.transcription, color: "bg-emerald-500" },
    { key: "analysis", label: "AI Analysis", amount: b.analysis, color: "bg-rose-500" },
  ].filter((p) => p.amount > 0);

  const creditPctOf = (v: VendorCost) => (v.credits.allocated > 0 ? (v.credits.used / v.credits.allocated) * 100 : 0);
  const filterGroups: FilterGroup[] = [
    { key: "provider", label: "Telephony Provider", options: [{ value: "all", label: "All" }, { value: "plivo", label: "Plivo" }, { value: "twilio", label: "Twilio" }] },
    { key: "usage", label: "Activity", options: [{ value: "all", label: "All" }, { value: "active", label: "Active" }, { value: "idle", label: "Idle" }] },
    { key: "credits", label: "Credit Status", options: [{ value: "all", label: "All" }, { value: "healthy", label: "Healthy" }, { value: "warning", label: "Warning" }, { value: "over", label: "Over / Low" }] },
  ];
  const filteredVendors = data.vendors.filter((v) => {
    if (search && !v.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.provider !== "all" && !v.providers.includes(filters.provider)) return false;
    if (filters.usage === "active" && v.usage.calls === 0) return false;
    if (filters.usage === "idle" && v.usage.calls > 0) return false;
    if (filters.credits !== "all") {
      const p = creditPctOf(v);
      const over = p >= 90 || v.credits.remaining < 0;
      const warning = p >= 70 && p < 90;
      const healthy = p < 70 && v.credits.remaining >= 0;
      if (filters.credits === "over" && !over) return false;
      if (filters.credits === "warning" && !warning) return false;
      if (filters.credits === "healthy" && !healthy) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200/50">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Vendor Costing</h1>
        <p className="text-xs text-slate-500 font-medium">Per-vendor cost of the AI + telephony stack (Gemini, Plivo, Twilio, transcription, analysis), from real usage.</p>
      </div>

      {/* Summary totals */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 select-none">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${k.color}`}><k.icon className="w-4 h-4" /></div>
            <div className="min-w-0">
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider truncate">{k.label}</p>
              <p className="text-base font-extrabold text-slate-900 leading-tight font-mono truncate">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Rate card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-3xs">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Billing Rates</h4>
          <a
            href="/superadmin/cost-calculator"
            className="inline-flex items-center gap-1.5 text-[10px] font-black text-violet-600 hover:text-violet-800 uppercase tracking-wider transition"
          >
            <Calculator className="w-3.5 h-3.5" /> Modeled on the Cost Calculator
          </a>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {rateItems.map((r) => (
            <div key={r.label} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <r.icon className={`w-4 h-4 shrink-0 ${r.color}`} />
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-700 truncate">{r.label}</p>
                <p className="text-[11px] font-black text-slate-900 font-mono">{r.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendors by name…"
            className="w-full h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 transition"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap">{filteredVendors.length} of {data.vendors.length} vendors</span>
          <FilterMenu
            groups={filterGroups}
            value={filters}
            onChange={(k, val) => setFilters((p) => ({ ...p, [k]: val }))}
            onClear={() => setFilters({ provider: "all", usage: "all", credits: "all" })}
          />
        </div>
      </div>

      {/* Per-vendor cost cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {filteredVendors.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 text-sm">No vendors match your search or filters.</div>
        ) : filteredVendors.map((v) => {
          const parts = segs(v.breakdown, v.usage);
          const totalForBar = Math.max(v.breakdown.total, 0.0001);
          const creditPct = v.credits.allocated > 0 ? Math.min(100, Math.round((v.credits.used / v.credits.allocated) * 100)) : 0;
          return (
            <div key={v.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs flex flex-col gap-4">
              {/* header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-[#0F2D67] text-white font-black text-sm flex items-center justify-center shrink-0">{v.name.substring(0, 2).toUpperCase()}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-slate-900 truncate">{v.name || "Unnamed"}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{(v.providers.length ? v.providers : [v.configured_provider]).map((p) => p.toUpperCase()).join(" + ")} · {v.agents} agents</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-black text-slate-900 font-mono leading-none">{money(v.cost_total)}</p>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">{money(v.cost_month)} this month</p>
                </div>
              </div>

              {/* usage chips */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { l: "Minutes", v: num(v.usage.minutes) },
                  { l: "Calls", v: num(v.usage.calls) },
                  { l: "Analyses", v: num(v.usage.transcripts) },
                  { l: "Est. Tokens", v: num(v.usage.tokens_est) },
                ].map((u) => (
                  <div key={u.l} className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center">
                    <p className="text-sm font-extrabold text-slate-900 font-mono leading-none">{u.v}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">{u.l}</p>
                  </div>
                ))}
              </div>

              {/* cost breakdown stacked bar */}
              <div>
                {parts.length === 0 ? (
                  <p className="text-[11px] text-slate-400 font-semibold">No billable usage yet.</p>
                ) : (
                  <>
                    <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100">
                      {parts.map((p) => (
                        <div key={p.key} className={p.color} style={{ width: `${(p.amount / totalForBar) * 100}%` }} title={`${p.label}: ${money(p.amount)}`} />
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3">
                      {parts.map((p) => (
                        <div key={p.key} className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 min-w-0"><span className={`w-2 h-2 rounded-full shrink-0 ${p.color}`} /><span className="text-[10px] font-bold text-slate-600 truncate">{p.label}</span></span>
                          <span className="text-[10px] font-black text-slate-900 font-mono shrink-0">{money(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* credits + limits */}
              <div className="border-t border-slate-100 pt-3 space-y-2.5">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-slate-500 uppercase tracking-wider">Prepaid Credits</span>
                  <span className="font-mono text-slate-700">{money(v.credits.used)} used / {money(v.credits.allocated)}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full rounded-full ${creditPct >= 90 ? "bg-red-500" : creditPct >= 70 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${creditPct}%` }} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-bold">
                    Remaining <span className={`font-mono font-black ${v.credits.remaining < 0 ? "text-red-600" : "text-slate-800"}`}>{money(v.credits.remaining)}</span>
                    <span className="mx-2 text-slate-300">·</span>
                    Minutes limit <span className="font-mono font-black text-slate-800">{num(v.limits.minutes_used)}/{num(v.limits.call_minutes_limit)}</span>
                  </span>
                  <button
                    onClick={() => setEditing(v)}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#0b1931] hover:bg-slate-950 text-white text-[10px] font-black uppercase tracking-wider cursor-pointer transition shrink-0"
                  >
                    <ArrowUpCircle className="w-3.5 h-3.5" /> Increase Limit
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <IncreaseLimitModal
          vendor={editing}
          currency={cur}
          token={token}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function IncreaseLimitModal({ vendor, currency, token, onClose, onSaved }: {
  vendor: VendorCost; currency: string; token: string | null; onClose: () => void; onSaved: () => void;
}) {
  const [minutes, setMinutes] = useState(String(vendor.limits.call_minutes_limit));
  const [prepaid, setPrepaid] = useState(String(vendor.limits.prepaid_balance));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!token) return;
    setSaving(true); setError("");
    try {
      await apiFetch(`/superadmin/vendors/${vendor.id}/costing-limits`, "PUT", {
        call_minutes_limit: Math.max(0, Math.round(Number(minutes) || 0)),
        prepaid_balance: Math.max(0, Number(prepaid) || 0),
      }, token);
      onSaved();
    } catch {
      setError("Could not update limits. Please try again.");
      setSaving(false);
    }
  };

  const field = "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 outline-none focus:border-blue-500 transition";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2"><ArrowUpCircle className="w-4 h-4 text-blue-600" /> Increase Limit — {vendor.name}</h3>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-full text-slate-400 hover:bg-slate-200 transition"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <div className="p-2.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold border border-red-100">{error}</div>}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Call Minutes Limit</label>
            <input type="number" min="0" value={minutes} onChange={(e) => setMinutes(e.target.value)} className={field} />
            <p className="text-[10px] text-slate-400 font-medium mt-1">Currently used: {vendor.limits.minutes_used.toLocaleString()} min</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Prepaid Credit Balance ({currency})</label>
            <input type="number" min="0" step="0.01" value={prepaid} onChange={(e) => setPrepaid(e.target.value)} className={field} />
            <p className="text-[10px] text-slate-400 font-medium mt-1">Cost incurred so far: {currency}{vendor.credits.used.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer">Cancel</button>
            <button onClick={save} disabled={saving} className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition flex items-center gap-2 cursor-pointer disabled:opacity-60">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}{saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
