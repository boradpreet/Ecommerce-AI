"use client";

import React from "react";
import { useVendorDetail } from "../context";
import { useAuthStore } from "src/store/authStore";
import { CreditCard, FileText, ArrowUpRight, ShieldCheck } from "lucide-react";

export default function VendorDetailBillingPage() {
  const { vendorDetail } = useVendorDetail();
  const token = useAuthStore((s) => s.token);

  if (!vendorDetail) return null;

  const handleDownloadInvoice = async (invoiceId: number) => {
    if (!token) return;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5011/api/v1";
      const res = await fetch(`${baseUrl}/superadmin/vendors/${vendorDetail.id}/invoices/${invoiceId}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch invoice");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice_INV-2026-${1000 + invoiceId}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  const invoices = vendorDetail.invoices || [];

  return (
    <div className="space-y-6">
      
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 select-none">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs flex items-center space-x-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-blue-100 flex items-center justify-center text-emerald-700">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Prepaid Deposit</p>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5">${vendorDetail.prepaid_balance.toFixed(2)} USD</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs flex items-center space-x-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Invoiced Amount</p>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5">${vendorDetail.total_revenue.toFixed(2)} USD</p>
          </div>
        </div>
      </div>

      {/* Invoice Registry Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs text-left">
          <div className="border-b border-slate-100 pb-3 mb-4 select-none flex justify-between items-center">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Invoice Registry Stream</span>
            </h4>
            <span className="text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
              {invoices.length} INVOICES
            </span>
          </div>

          {invoices.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <FileText className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-xs">No previous invoices found for this tenant</p>
            </div>
          ) : (
            <div className="overflow-x-auto select-none">
              <table className="w-full text-left border-collapse text-xs font-semibold text-slate-700">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <th className="p-3 pl-4">INVOICE NUMBER</th>
                    <th className="p-3">DATE</th>
                    <th className="p-3">AMOUNT</th>
                    <th className="p-3">GATEWAY</th>
                    <th className="p-3">STATUS</th>
                    <th className="p-3 pr-4 text-right">PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/40 transition">
                      <td className="p-3 pl-4 font-mono font-bold text-slate-900">{inv.invoice_number}</td>
                      <td className="p-3 text-slate-500">{inv.created_at}</td>
                      <td className="p-3 text-slate-900 font-extrabold">${inv.amount.toFixed(2)}</td>
                      <td className="p-3 text-slate-450 uppercase">{inv.payment_gateway}</td>
                      <td className="p-3">
                        <span className={`text-[8.5px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          inv.status === "paid"
                            ? "text-emerald-700 bg-emerald-50 border border-emerald-150"
                            : "text-amber-700 bg-amber-50 border border-amber-150"
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-3 pr-4 text-right">
                        <button
                          onClick={() => handleDownloadInvoice(inv.id)}
                          className="text-[9px] font-black text-blue-650 hover:text-blue-800 uppercase flex items-center justify-end gap-0.5 hover:underline cursor-pointer bg-transparent border-0 p-0"
                        >
                          <span>PDF</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Security & Ledger Panel */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs flex flex-col justify-between select-none text-left">
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest block border-b border-slate-100 pb-2.5">
              Ledger Health
            </h4>
            
            <div className="space-y-3.5">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Outstanding Payments</span>
                <span className="text-sm font-extrabold text-slate-800 mt-1 block">$0.00 USD</span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Account Standing</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-150 px-2 py-0.5 rounded-full w-max mt-1 block">
                  EXCELLENT
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-[10px] text-blue-700 font-semibold leading-relaxed mt-6 flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-blue-650 shrink-0 mt-0.5" />
            <span>
              All transactions are encrypted and audited through administrative billing controllers. Ledger cleared.
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
