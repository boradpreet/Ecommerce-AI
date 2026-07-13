"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "src/store/authStore";
import { apiFetch } from "src/lib/api";
import { VendorDetail } from "src/types/vendor";
import { useSuperAdmin } from "src/context/SuperAdminContext";
import { VendorDetailContext } from "./context";
import {
  Eye, CreditCard, Loader2, AlertCircle, TrendingUp, Settings, Bot, Target, Contact, PhoneCall
} from "lucide-react";
import Link from "next/link";

export default function VendorDetailLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const token = useAuthStore((s) => s.token);
  const { handleToggleSuspension, vendorsList } = useSuperAdmin();

  const rawVendorId = params.vendorId as string;
  const numericId = rawVendorId?.startsWith("vendor_")
    ? parseInt(rawVendorId.split("_")[1])
    : parseInt(rawVendorId);

  const [vendorDetail, setVendorDetail] = useState<VendorDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Find dynamic vendor metadata in parents list if uvicorn is offline or to seed fallback values
  const basicVendor = useMemo(() => vendorsList.find((v) => v.id === numericId) || {
    id: numericId || 101,
    name: "Enterprise Partner",
    status: "ACTIVE",
    active_agents: 4,
    monthly_spend: 1850.0,
    platform_margin: 12.5,
    plan: "Growth",
    prepaid_balance: 340.5,
    created_at: "Oct 24, 2025"
  }, [vendorsList, numericId]);

  const fetchDetail = useCallback(async () => {
    if (!token || !numericId) return;
    setLoading(true);
    try {
      const data = await apiFetch<VendorDetail>(`/superadmin/vendors/${numericId}`, "GET", undefined, token);
      if (data) {
        setVendorDetail(data);
      } else {
        throw new Error("Empty vendor payload");
      }
    } catch (err) {
      console.error("fetchDetail failed:", err);
      setVendorDetail(null);
    } finally {
      setLoading(false);
    }
  }, [numericId, token]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleLocalToggleSuspension = async () => {
    const basicVendorObj = {
      id: basicVendor.id,
      name: basicVendor.name,
      email: basicVendor.email,
      status: basicVendor.status,
      active_agents: basicVendor.active_agents,
      monthly_spend: basicVendor.monthly_spend,
      platform_margin: basicVendor.platform_margin,
      plan: basicVendor.plan,
      prepaid_balance: basicVendor.prepaid_balance,
      created_at: basicVendor.created_at
    };
    await handleToggleSuspension(basicVendorObj);
    // Refresh to propagate status
    setVendorDetail((prev) => {
      if (!prev) return null;
      const nextStatus = prev.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
      return { ...prev, status: nextStatus };
    });
  };

  const updateDetailFields = (updates: Partial<VendorDetail>) => {
    setVendorDetail((prev) => (prev ? { ...prev, ...updates } : null));
  };

  // Identify active tab segment
  const getTabActive = (href: string) => {
    const subRoute = pathname.substring(pathname.lastIndexOf("/") + 1);
    if (href === "") {
      return subRoute === rawVendorId;
    }
    return subRoute === href;
  };

  const menuItems = [
    { href: "", label: "Overview", icon: Eye },
    { href: "agents", label: "AI Agents", icon: Bot },
    { href: "campaigns", label: "Campaigns", icon: Target },
    { href: "leads", label: "Leads", icon: Contact },
    { href: "call-logs", label: "Call Logs", icon: PhoneCall },
    { href: "subscriptions", label: "Subscriptions", icon: TrendingUp },
    { href: "billing", label: "Billing", icon: CreditCard },
    { href: "settings", label: "Settings", icon: Settings },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-slate-400 select-none">
        <Loader2 className="w-6 h-6 animate-spin mr-3 text-[#0F2D67]" /> Loading vendor data...
      </div>
    );
  }

  if (!vendorDetail) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-3xl">
        <AlertCircle className="w-8 h-8 mx-auto text-red-500 mb-2" />
        <h3 className="text-sm font-bold text-slate-800">Vendor Not Found</h3>
        <button onClick={() => router.push("/superadmin/vendors")} className="text-xs text-blue-600 font-bold hover:underline mt-4 block mx-auto">
          Back to Registry
        </button>
      </div>
    );
  }

  return (
    <VendorDetailContext.Provider value={{ vendorDetail, loading, refreshDetail: fetchDetail, handleLocalToggleSuspension, updateDetailFields }}>
      <div className="space-y-6 animate-fade-in text-left">
        
        {/* Dynamic header panel */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-3xs overflow-hidden">
          <div className="px-6 py-6 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between bg-gradient-to-r from-slate-900 to-[#0F2D67] text-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center font-black text-white text-lg select-none">
                {vendorDetail.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-extrabold tracking-tight">{vendorDetail.name}</h2>
                <div className="flex items-center gap-2.5 mt-1 select-none">
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                    vendorDetail.status === "ACTIVE"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-red-500/20 text-red-300 border border-red-500/30"
                  }`}>
                    {vendorDetail.status}
                  </span>
                  <span className="text-[11px] text-slate-300 font-bold uppercase tracking-wider">{vendorDetail.plan} Plan</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2.5 mt-4 md:mt-0">
              <button
                onClick={handleLocalToggleSuspension}
                className={`h-9 px-4 text-xs font-bold uppercase rounded-xl border transition cursor-pointer select-none ${
                  vendorDetail.status === "SUSPENDED"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                    : "text-red-300 border-red-500/40 hover:bg-red-500/10"
                }`}
              >
                {vendorDetail.status === "SUSPENDED" ? "Unsuspend Tenant" : "Suspend Tenant"}
              </button>
              
              <Link
                href="/superadmin/vendors"
                className="h-9 px-4 text-xs font-bold bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl transition flex items-center justify-center text-white"
              >
                All Vendors
              </Link>
            </div>
          </div>

          {/* Persistent sub-routing tabs */}
          <div className="flex border-b border-slate-100 bg-slate-50/50 overflow-x-auto select-none">
            {menuItems.map((tab) => {
              const active = getTabActive(tab.href);
              const linkUrl = `/superadmin/vendors/${rawVendorId}${tab.href ? `/${tab.href}` : ""}`;
              const TabIcon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={linkUrl}
                  className={`px-5 py-3.5 text-xs font-bold uppercase tracking-wider transition border-b-2 flex items-center gap-2 shrink-0 ${
                    active
                      ? "border-blue-600 text-blue-700 bg-white"
                      : "border-transparent text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Dynamic child view render */}
        <div className="min-h-[30vh]">
          {children}
        </div>
      </div>
    </VendorDetailContext.Provider>
  );
}
