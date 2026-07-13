import React, { useState, useMemo } from "react";
import { Filter, ChevronDown } from "lucide-react";

interface Transaction {
  id: string;
  vendor: string;
  date: string;
  amount: number;
  status: string;
  plan?: string;
  renewal_date?: string;
  payment_method?: string;
}

interface RevenueTabProps {
  revenueData: {
    mrr: number;
    churn_rate: number;
    avg_revenue: number;
    outstanding_invoices: number;
    outstanding_count?: number;
    total_vendors?: number;
    growth_chart: Array<{ month: string; value: number }>;
    transactions: Transaction[];
  } | null;
}

export default function RevenueTab({ revenueData }: RevenueTabProps) {
  const [chartMode, setChartMode] = useState<"yearly" | "monthly">("yearly");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PAID" | "UNPAID" | "PENDING">("ALL");
  const [showAll, setShowAll] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const filteredTx = useMemo(() => {
    if (!revenueData) return [];
    const base = revenueData.transactions.filter((t) =>
      statusFilter === "ALL" || t.status === statusFilter
    );
    return showAll ? base : base.slice(0, 10);
  }, [revenueData, statusFilter, showAll]);

  if (!revenueData) {
    return (
      <div className="py-24 text-center text-slate-400">
        <p className="text-sm font-semibold">No revenue data available.</p>
        <p className="text-xs mt-1">Revenue data appears here when vendors subscribe to plans.</p>
      </div>
    );
  }

  const maxChartVal = Math.max(...(revenueData.growth_chart.map((d) => d.value) || [1]), 1);

  return (
    <div className="space-y-6 animate-fade-in text-left select-none">

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs h-24 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">MRR</span>
          <span className="text-2xl font-black text-slate-950 font-mono">
            {revenueData.mrr === 0 ? "$0" : `$${revenueData.mrr.toLocaleString()}`}
          </span>
          <span className="text-[9px] text-blue-700 font-bold uppercase tracking-wider">Monthly Recurring Revenue</span>
        </div>
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs h-24 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Churn Rate</span>
          <span className="text-2xl font-black text-slate-950 font-mono">{revenueData.churn_rate}%</span>
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Net churn in last 30 days</span>
        </div>
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs h-24 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Avg. Revenue / Vendor</span>
          <span className="text-2xl font-black text-slate-950 font-mono">
            ${revenueData.avg_revenue.toLocaleString()}
          </span>
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
            Across {revenueData.total_vendors || 0} active vendors
          </span>
        </div>
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs h-24 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Outstanding Invoices</span>
          <span className="text-2xl font-black text-slate-950 font-mono">
            ${revenueData.outstanding_invoices.toLocaleString()}
          </span>
          <span className={`text-[9px] font-bold uppercase tracking-wider ${revenueData.outstanding_count ? "text-amber-600" : "text-emerald-600"}`}>
            {revenueData.outstanding_count
              ? `${revenueData.outstanding_count} items awaiting payment`
              : "All invoices paid"}
          </span>
        </div>
      </div>

      {/* Revenue Growth Chart */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Revenue Growth</h4>
            <p className="text-sm font-bold text-slate-800 mt-0.5">Real-time overview of financial performance and billing lifecycle.</p>
          </div>
          <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-0.5 text-[10px] font-bold">
            <button
              onClick={() => setChartMode("yearly")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${chartMode === "yearly" ? "bg-[#0f2e5c] text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              Yearly
            </button>
            <button
              onClick={() => setChartMode("monthly")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${chartMode === "monthly" ? "bg-[#0f2e5c] text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              Monthly
            </button>
          </div>
        </div>

        {revenueData.growth_chart.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <p className="text-sm font-semibold">No revenue data yet</p>
              <p className="text-xs mt-1">Revenue chart populates as vendors make payments</p>
            </div>
          </div>
        ) : (
          <div className="relative h-52 border-b border-slate-100">
            {/* SVG line chart */}
            <svg className="w-full h-full" viewBox="0 0 600 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="revGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#0f2e5c" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#0f2e5c" stopOpacity="0" />
                </linearGradient>
              </defs>
              {(() => {
                const pts = revenueData.growth_chart;
                const n = pts.length;
                if (n < 2) return null;
                const xs = pts.map((_, i) => 30 + (i / (n - 1)) * 540);
                const ys = pts.map((p) => 180 - (p.value / maxChartVal) * 160);
                const pathD = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x},${ys[i]}`).join(" ");
                const fillD = pathD + ` L ${xs[n - 1]},190 L ${xs[0]},190 Z`;
                return (
                  <>
                    <path d={fillD} fill="url(#revGrad)" />
                    <path d={pathD} stroke="#0f2e5c" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    {xs.map((x, i) => (
                      <circle key={i} cx={x} cy={ys[i]} r="3.5" fill="#0f2e5c" />
                    ))}
                  </>
                );
              })()}
            </svg>
            {/* X labels */}
            <div className="absolute bottom-0 inset-x-0 flex justify-between px-6 pb-1">
              {revenueData.growth_chart.map((d) => (
                <span key={d.month} className="text-[9px] text-slate-400 font-bold uppercase">{d.month}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Recent Transactions</h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mt-0.5">
              Transaction log across all voice operation vendors.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {/* Filter dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setFilterOpen(!filterOpen)}
                className="h-8 px-3 border border-slate-200 hover:bg-slate-50 text-[10px] font-bold text-slate-600 rounded-lg cursor-pointer flex items-center space-x-1.5 transition"
              >
                <Filter className="w-3 h-3" />
                <span>Filter</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {filterOpen && (
                <div className="absolute right-0 top-9 z-20 bg-white border border-slate-200 rounded-xl shadow-xl py-1 w-36 text-xs font-semibold">
                  {(["ALL", "PAID", "UNPAID", "PENDING"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => { setStatusFilter(s); setFilterOpen(false); setShowAll(false); }}
                      className={`w-full px-4 py-2 text-left hover:bg-slate-50 transition ${statusFilter === s ? "text-blue-600 font-bold" : "text-slate-700"}`}
                    >
                      {s === "ALL" ? "All Statuses" : s.charAt(0) + s.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* View All */}
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="h-8 px-3 border border-slate-200 hover:bg-slate-50 text-[10px] font-bold text-slate-600 rounded-lg cursor-pointer transition"
            >
              {showAll ? "Show Less" : "View All"}
            </button>
          </div>
        </div>

        {filteredTx.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <p className="text-sm font-semibold">No transactions found.</p>
            <p className="text-xs mt-1">
              {revenueData.transactions.length === 0
                ? "Transactions appear here when vendors make payments."
                : "No transactions match the selected filter."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-semibold text-slate-700">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <th className="p-4 pl-5">Invoice ID</th>
                  <th className="p-4">Vendor</th>
                  <th className="p-4">Plan</th>
                  <th className="p-4">Payment Method</th>
                  <th className="p-4">Renewal Date</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4 pr-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTx.map((tr) => (
                  <tr key={tr.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="p-4 pl-5 text-blue-600 font-bold font-mono hover:underline cursor-pointer">
                      {tr.id}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[9px] font-bold text-blue-700 shrink-0">
                          {tr.vendor.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-bold text-slate-900">{tr.vendor}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                        {tr.plan || "Growth"}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 font-mono text-[11px]">
                      {tr.payment_method || "Card •••• 4242"}
                    </td>
                    <td className="p-4 text-slate-500 font-mono text-[11px]">
                      {tr.renewal_date || "—"}
                    </td>
                    <td className="p-4 text-slate-400 font-semibold">{tr.date}</td>
                    <td className="p-4 font-mono font-bold text-slate-900">${tr.amount.toLocaleString()}</td>
                    <td className="p-4 pr-5 text-right">
                      <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        tr.status === "PAID"
                          ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                          : tr.status === "PENDING"
                          ? "text-amber-700 bg-amber-50 border border-amber-200"
                          : "text-red-700 bg-red-50 border border-red-200"
                      }`}>
                        {tr.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-5 py-3 border-t border-slate-100 text-[11px] text-slate-400 font-semibold">
          Showing {filteredTx.length} of {revenueData.transactions.filter((t) => statusFilter === "ALL" || t.status === statusFilter).length} transactions
        </div>
      </div>

    </div>
  );
}
