"use client";

import React, { useState, useMemo } from "react";
import { useSuperAdmin } from "src/context/SuperAdminContext";
import { Loader2, Search } from "lucide-react";

export default function TransactionsPage() {
  const { loading, revenueData, searchQuery, setSearchQuery } = useSuperAdmin();
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PAID" | "PENDING" | "OVERDUE">("ALL");

  const filteredTx = useMemo(() => {
    if (!revenueData) return [];
    let list = revenueData.transactions || [];
    
    // Status filter
    if (statusFilter !== "ALL") {
      list = list.filter((t) => t.status === statusFilter);
    }

    // Global Search Query filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) =>
        t.vendor.toLowerCase().includes(q) ||
        (t.id || "").toLowerCase().includes(q) ||
        (t.plan || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [revenueData, statusFilter, searchQuery]);

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 font-bold uppercase tracking-wider flex flex-col items-center justify-center select-none">
        <Loader2 className="w-8 h-8 animate-spin text-[#0f2e5c] mb-4" />
        <span>Synthesizing Transaction Logs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200/50">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Recent Transactions</h1>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Historical ledger stream of all subscription billing triggers across all vendors.
          </p>
        </div>
      </div>

      {/* Grid Table */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
        
        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-blue-500 transition"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "ALL" | "PAID" | "PENDING" | "OVERDUE")}
            className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-750 outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="PAID">Paid</option>
            <option value="PENDING">Pending</option>
            <option value="OVERDUE">Overdue</option>
          </select>
        </div>

        {/* Table Content */}
        {filteredTx.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <p className="text-sm font-semibold">No transactions found.</p>
            <p className="text-xs mt-1">Adjust filters or search queries.</p>
          </div>
        ) : (
          <div className="overflow-x-auto select-none">
            <table className="w-full text-left border-collapse text-xs font-semibold text-slate-700">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <th className="p-4 pl-5">Invoice ID</th>
                  <th className="p-4">Vendor</th>
                  <th className="p-4">Plan Tier</th>
                  <th className="p-4">Payment Method</th>
                  <th className="p-4">Renewal Cycle</th>
                  <th className="p-4">Execution Date</th>
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
                    <td className="p-4 font-bold text-slate-900">{tr.vendor}</td>
                    <td className="p-4">
                      <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full">
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

        <div className="px-5 py-3 border-t border-slate-100 text-[11px] text-slate-400 font-semibold text-left select-none">
          Showing {filteredTx.length} items of ledger stream.
        </div>
      </div>

    </div>
  );
}
