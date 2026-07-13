"use client";

import React from "react";
import { useSuperAdmin } from "src/context/SuperAdminContext";
import VendorsTab from "src/components/superadmin/VendorsTab";
import { Loader2 } from "lucide-react";

export default function SuperAdminVendorsPage() {
  const {
    loading,
    vendorsList,
    handleToggleSuspension,
    setVendorModalOpen,
  } = useSuperAdmin();

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 font-bold uppercase tracking-wider flex flex-col items-center justify-center select-none">
        <Loader2 className="w-8 h-8 animate-spin text-[#0f2e5c] mb-4" />
        <span>Syncing Vendors Registry...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200/50">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Vendors Management</h1>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Monitor and manage enterprise voice AI deployments across the network.
          </p>
        </div>
      </div>
      <VendorsTab
        vendorsList={vendorsList}
        onToggleSuspension={handleToggleSuspension}
        onAddVendorClick={() => setVendorModalOpen(true)}
      />
    </div>
  );
}
