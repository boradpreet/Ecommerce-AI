import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Search, ShieldAlert, Users, DollarSign, Activity, RefreshCw,
  X, Eye, CreditCard, PhoneCall, Building2, Calendar, Globe, Loader2,
  TrendingUp,
} from "lucide-react";
import { apiFetch } from "src/lib/api";
import { useAuthStore } from "src/store/authStore";
import { useSuperAdmin } from "src/context/SuperAdminContext";

interface Vendor {
  id: number;
  name: string;
  email?: string;
  status: string;
  active_agents: number;
  monthly_spend: number;
  platform_margin: number;
  plan?: string;
  plan_status?: string;
  renewal_date?: string;
  prepaid_balance?: number;
  call_minutes_limit?: number;
  created_at?: string;
}

interface VendorDetail {
  id: number;
  name: string;
  slug: string;
  email: string;
  owner_name: string;
  industry: string;
  website_url: string;
  company_size: string;
  status: string;
  created_at: string;
  plan: string;
  plan_tier: string;
  plan_status: string;
  renewal_date: string;
  prepaid_balance: number;
  concurrency_limit: number;
  call_minutes_limit: number;
  total_revenue: number;
  active_agents: number;
  agents: { id: number; name: string; voice_provider: string; lang: string; status: string; created_at: string }[];
  phone_numbers_count: number;
  phone_numbers: { id: number; phone_number: string; country: string; type: string; status: string; assigned_agent: string; monthly_cost: number }[];
  team_members: number;
  invoices: { id: number; invoice_number: string; amount: number; status: string; created_at: string; payment_gateway: string; pdf_url: string }[];
}

interface VendorsTabProps {
  vendorsList: Vendor[];
  onToggleSuspension: (vendor: Vendor) => void;
  onAddVendorClick: () => void;
}

// ─── Vendor Detail Modal ──────────────────────────────────────────────────

function VendorDetailModal({
  vendorId,
  onClose,
  onToggleSuspension,
  vendorBasic,
}: {
  vendorId: number;
  onClose: () => void;
  onToggleSuspension: (vendor: Vendor) => void;
  vendorBasic: Vendor;
}) {
  const token = useAuthStore((s) => s.token);
  const [detail, setDetail] = useState<VendorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<"overview" | "agents" | "phones" | "invoices">("overview");
  const [minutesInput, setMinutesInput] = useState<number | "">("");
  const [savingMinutes, setSavingMinutes] = useState(false);
  const [minutesSaved, setMinutesSaved] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiFetch<VendorDetail>(`/superadmin/vendors/${vendorId}`, "GET", undefined, token);
      setDetail(data);
      setMinutesInput(data.call_minutes_limit ?? 100);
    } catch {
      // fallback to basic info
    } finally {
      setLoading(false);
    }
  }, [vendorId, token]);

  const saveMinutes = async () => {
    if (!token || minutesInput === "") return;
    setSavingMinutes(true);
    setMinutesSaved(false);
    try {
      await apiFetch(`/superadmin/vendors/${vendorId}/call-minutes`, "PUT", { call_minutes_limit: Number(minutesInput) }, token);
      setDetail((prev) => (prev ? { ...prev, call_minutes_limit: Number(minutesInput) } : prev));
      setMinutesSaved(true);
      setTimeout(() => setMinutesSaved(false), 2500);
    } catch {
      /* leave value as typed */
    } finally {
      setSavingMinutes(false);
    }
  };

  React.useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const d = detail;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden my-8" style={{ animation: "popIn .35s ease both" }}>
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-[#0f2e5c]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center font-black text-white text-lg">
              {vendorBasic.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">{vendorBasic.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${vendorBasic.status === "ACTIVE" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-red-500/20 text-red-300 border border-red-500/30"
                  }`}>
                  {vendorBasic.status}
                </span>
                <span className="text-[11px] text-slate-400">{d?.plan || vendorBasic.plan || "Growth"} Plan</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { onToggleSuspension(vendorBasic); onClose(); }}
              className={`h-8 px-3 text-[10px] font-bold uppercase rounded-lg border transition ${vendorBasic.status === "SUSPENDED"
                  ? "text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/10"
                  : "text-red-300 border-red-500/40 hover:bg-red-500/10"
                }`}
            >
              {vendorBasic.status === "SUSPENDED" ? "Unsuspend" : "Suspend"}
            </button>
            <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-white/10 transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-3" /> Loading vendor data…
          </div>
        ) : (
          <>
            {/* Section Tabs */}
            <div className="flex border-b border-slate-100 bg-slate-50/50">
              {(["overview", "agents", "phones", "invoices"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setActiveSection(s)}
                  className={`px-5 py-3 text-xs font-bold uppercase tracking-wider transition border-b-2 ${activeSection === s
                      ? "border-blue-600 text-blue-700 bg-white"
                      : "border-transparent text-slate-400 hover:text-slate-700"
                    }`}
                >
                  {s}
                  {s === "agents" && d && ` (${d.active_agents})`}
                  {s === "phones" && d && ` (${d.phone_numbers_count})`}
                  {s === "invoices" && d && ` (${d.invoices.length})`}
                </button>
              ))}
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {/* ── Overview ── */}
              {activeSection === "overview" && (
                <div className="space-y-5">
                  {/* Key metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { icon: DollarSign, label: "Total Revenue", value: `$${(d?.total_revenue ?? 0).toFixed(2)}`, color: "text-emerald-600", bg: "bg-emerald-50" },
                      { icon: Activity, label: "Balance", value: `$${(d?.prepaid_balance ?? vendorBasic.prepaid_balance ?? 0).toFixed(2)}`, color: "text-blue-600", bg: "bg-blue-50" },
                      { icon: Users, label: "Active Agents", value: String(d?.active_agents ?? vendorBasic.active_agents), color: "text-violet-600", bg: "bg-violet-50" },
                      { icon: PhoneCall, label: "Phone Numbers", value: String(d?.phone_numbers_count ?? 0), color: "text-amber-600", bg: "bg-amber-50" },
                    ].map((item) => (
                      <div key={item.label} className={`${item.bg} rounded-2xl p-4 border border-slate-100`}>
                        <item.icon className={`w-4 h-4 ${item.color} mb-2`} />
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{item.label}</p>
                        <p className="text-xl font-extrabold text-slate-900 mt-0.5">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { icon: Building2, label: "Industry", value: d?.industry || "—" },
                      { icon: Globe, label: "Website", value: d?.website_url || "—" },
                      { icon: Calendar, label: "Joined", value: d?.created_at || vendorBasic.created_at || "—" },
                      { icon: TrendingUp, label: "Plan", value: `${d?.plan || "Growth"} (${d?.plan_status || "Active"})` },
                      { icon: Calendar, label: "Renewal", value: d?.renewal_date || vendorBasic.renewal_date || "—" },
                      { icon: Users, label: "Team Members", value: String(d?.team_members ?? 0) },
                      { icon: Activity, label: "Concurrency Limit", value: `${d?.concurrency_limit ?? 10} concurrent` },
                      { icon: CreditCard, label: "Platform Margin", value: `${vendorBasic.platform_margin}%` },
                    ].map((item) => (
                      <div key={item.label} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <item.icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{item.label}</p>
                          <p className="text-xs font-bold text-slate-800 mt-0.5 break-all">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Admin: editable free call-minute allowance */}
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="min-w-[180px]">
                        <p className="text-[10px] text-blue-700 font-black uppercase tracking-wider">Free Call-Minute Allowance</p>
                        <p className="text-[11px] text-slate-500 font-semibold mt-0.5 max-w-sm">Campaigns stop and the vendor is prompted to contact us once these minutes are used.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          value={minutesInput}
                          onChange={(e) => setMinutesInput(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))}
                          className="w-28 h-9 px-3 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 outline-none focus:border-blue-500"
                        />
                        <span className="text-[11px] font-bold text-slate-500">min</span>
                        <button
                          onClick={saveMinutes}
                          disabled={savingMinutes || minutesInput === ""}
                          className="h-9 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                        >
                          {savingMinutes ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                          <span>{minutesSaved ? "Saved ✓" : "Save"}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {d?.email && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0">
                        {(d.owner_name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{d.owner_name || "Owner"}</p>
                        <p className="text-[11px] text-slate-500">{d.email}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Agents ── */}
              {activeSection === "agents" && (
                <div className="space-y-2">
                  {(!d?.agents || d.agents.length === 0) ? (
                    <div className="py-12 text-center text-slate-400">
                      <Users className="w-8 h-8 mx-auto mb-3 opacity-30" />
                      <p className="font-semibold text-sm">No agents created yet</p>
                    </div>
                  ) : d.agents.map((agent) => (
                    <div key={agent.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-white transition">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-violet-100 border border-violet-100 flex items-center justify-center text-violet-700 font-bold text-[10px]">
                          {agent.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{agent.name}</p>
                          <p className="text-[10px] text-slate-400">{agent.voice_provider} · {agent.lang}</p>
                        </div>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${agent.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}>
                        {agent.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Phone Numbers ── */}
              {activeSection === "phones" && (
                <div className="space-y-2">
                  {(!d?.phone_numbers || d.phone_numbers.length === 0) ? (
                    <div className="py-12 text-center text-slate-400">
                      <PhoneCall className="w-8 h-8 mx-auto mb-3 opacity-30" />
                      <p className="font-semibold text-sm">No phone numbers provisioned yet</p>
                    </div>
                  ) : d.phone_numbers.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div>
                        <p className="text-xs font-bold text-slate-900 font-mono">{p.phone_number}</p>
                        <p className="text-[10px] text-slate-400">{p.country} · {p.type} · {p.assigned_agent}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-700">${p.monthly_cost}/mo</p>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${p.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          }`}>{p.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Invoices ── */}
              {activeSection === "invoices" && (
                <div className="space-y-2">
                  {(!d?.invoices || d.invoices.length === 0) ? (
                    <div className="py-12 text-center text-slate-400">
                      <CreditCard className="w-8 h-8 mx-auto mb-3 opacity-30" />
                      <p className="font-semibold text-sm">No invoices yet</p>
                    </div>
                  ) : d.invoices.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div>
                        <p className="text-xs font-bold text-slate-900 font-mono">{inv.invoice_number}</p>
                        <p className="text-[10px] text-slate-400">{inv.created_at} · {inv.payment_gateway}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-extrabold text-slate-900">${inv.amount.toFixed(2)}</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${inv.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          }`}>
                          {inv.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main VendorsTab ────────────────────────────────────────────────────────

export default function VendorsTab({ vendorsList, onToggleSuspension, onAddVendorClick }: VendorsTabProps) {
  const router = useRouter();
  const { searchQuery, setSearchQuery } = useSuperAdmin();
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "SUSPENDED">("ALL");
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  // Derived real stats from actual vendor data
  const totalAgents = vendorsList.reduce((s, v) => s + (v.active_agents || 0), 0);
  const totalMonthlySpend = vendorsList.reduce((s, v) => s + (v.monthly_spend || 0), 0);
  const activeCount = vendorsList.filter((v) => v.status === "ACTIVE").length;

  const filtered = useMemo(() => {
    return vendorsList.filter((v) => {
      const matchStatus = statusFilter === "ALL" || v.status === statusFilter;
      const matchSearch =
        !searchQuery ||
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.email || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [vendorsList, statusFilter, searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in text-left select-none">
      <style>{`@keyframes popIn{0%{opacity:0;transform:scale(0.93);}70%{transform:scale(1.02);}100%{opacity:1;transform:scale(1);}}`}</style>

      {/* KPI Cards — real data */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between h-24">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Vendors</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <span className="text-2xl font-black text-slate-950 font-mono">{vendorsList.length}</span>
          <span className="text-[9px] text-blue-700 font-bold uppercase tracking-wider">{activeCount} Active</span>
        </div>
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between h-24">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Agents</span>
            <Activity className="w-4 h-4 text-violet-500" />
          </div>
          <span className="text-2xl font-black text-slate-950 font-mono">{totalAgents.toLocaleString()}</span>
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Across all tenants</span>
        </div>
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between h-24">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-2xl font-black text-slate-950 font-mono">
            ${totalMonthlySpend >= 1000000
              ? `${(totalMonthlySpend / 1000000).toFixed(1)}M`
              : totalMonthlySpend >= 1000
                ? `${(totalMonthlySpend / 1000).toFixed(1)}k`
                : totalMonthlySpend.toFixed(0)}
          </span>
          <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">Gross transaction value</span>
        </div>
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between h-24">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">System Health</span>
            <RefreshCw className="w-4 h-4 text-cyan-500" />
          </div>
          <span className="text-2xl font-black text-slate-950 font-mono">99.98%</span>
          <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">All channels optimal</span>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">

        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search vendors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-blue-500 transition"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "SUSPENDED")}
            className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </select>

          {/* Date filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
          >
            <option value="all">All Time</option>
            <option value="month">This Month</option>
            <option value="quarter">Last Quarter</option>
          </select>

          <div className="flex-1" />

          <button
            type="button"
            onClick={onAddVendorClick}
            className="h-9 px-4 bg-[#0f2e5c] hover:bg-slate-950 text-xs font-bold text-white rounded-xl transition flex items-center space-x-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Vendor</span>
          </button>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-400">
              {vendorsList.length === 0
                ? "No vendors yet. Vendors appear here when users register accounts."
                : "No vendors match your filters."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-semibold text-slate-700">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <th className="p-4 pl-5">Vendor Name</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Plan</th>
                  <th className="p-4">Renewal Date</th>
                  <th className="p-4">Active Agents</th>
                  <th className="p-4">Monthly Spend</th>
                  <th className="p-4">Margin</th>
                  <th className="p-4 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="p-4 pl-5">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs shrink-0">
                          {vendor.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-950">{vendor.name}</p>
                          {vendor.email && (
                            <p className="text-[10px] text-slate-400 font-normal mt-0.5">{vendor.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${vendor.status === "ACTIVE"
                          ? "text-blue-700 bg-blue-50 border border-blue-200"
                          : vendor.status === "SUSPENDED"
                            ? "text-red-700 bg-red-50 border border-red-200"
                            : "text-amber-700 bg-amber-50 border border-amber-200"
                        }`}>
                        {vendor.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-bold text-slate-800">{vendor.plan || "Growth"}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{vendor.plan_status || "Active"}</p>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 font-mono text-[11px]">
                      {vendor.renewal_date || "—"}
                    </td>
                    <td className="p-4 font-mono text-slate-900">{vendor.active_agents.toLocaleString()}</td>
                    <td className="p-4 font-mono text-slate-900">${vendor.monthly_spend.toLocaleString()}</td>
                    <td className="p-4 font-mono text-slate-500">{vendor.platform_margin}%</td>
                    <td className="p-4 pr-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* View Details */}
                        <button
                          type="button"
                          onClick={() => router.push(`/superadmin/vendors/vendor_${vendor.id}`)}
                          className="h-8 px-3 text-[10px] font-bold uppercase rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" /> Details
                        </button>
                        {/* Suspend / Unsuspend */}
                        <button
                          type="button"
                          onClick={() => onToggleSuspension(vendor)}
                          className={`h-8 px-3 text-[10px] font-bold uppercase rounded-lg border cursor-pointer transition ${vendor.status === "SUSPENDED"
                              ? "text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                              : "text-red-600 border-red-200 hover:bg-red-50"
                            }`}
                        >
                          {vendor.status === "SUSPENDED" ? "Unsuspend" : "Suspend"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-semibold">
          <span>Showing {filtered.length} of {vendorsList.length} vendors</span>
          {vendorsList.length === 0 && (
            <span className="text-amber-600 font-bold">
              Vendors appear here when users register accounts
            </span>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-sm">📊</span>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Platform Margin Prediction</h4>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Based on current ingestion rates, Platform Margin is expected to increase by{" "}
            <strong className="text-blue-600">1.2%</strong> next quarter due to optimized inference costs.
          </p>
        </div>
        <div className="bg-red-50/50 border border-red-100 rounded-2xl p-5 text-left">
          <div className="flex items-center space-x-2 mb-2">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            <h4 className="text-xs font-bold text-red-600 uppercase tracking-wider">Suspension Alerts</h4>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            {vendorsList.filter((v) => v.status === "SUSPENDED").length > 0
              ? `${vendorsList.filter((v) => v.status === "SUSPENDED").length} vendor(s) currently suspended. Review billing status.`
              : "No vendors are currently suspended. All accounts are in good standing."}
          </p>
        </div>
      </div>

      {/* Vendor Detail Modal */}
      {selectedVendor && (
        <VendorDetailModal
          vendorId={selectedVendor.id}
          vendorBasic={selectedVendor}
          onClose={() => setSelectedVendor(null)}
          onToggleSuspension={onToggleSuspension}
        />
      )}
    </div>
  );
}
