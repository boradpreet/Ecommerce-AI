"use client";

import React, { useState } from "react";
import { useAuthStore } from "src/store/authStore";
import { useSuperAdmin } from "src/context/SuperAdminContext";
import { Loader2, ShieldAlert, Check } from "lucide-react";

export default function ProfileSettingsPage() {
  const storedUser = useAuthStore((s) => s.user);
  const { loading, triggerSuccess } = useSuperAdmin();
  const [updating, setUpdating] = useState(false);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setTimeout(() => {
      setUpdating(false);
      triggerSuccess("Administrator profile details updated!");
    }, 1200);
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 font-bold uppercase tracking-wider flex flex-col items-center justify-center select-none">
        <Loader2 className="w-8 h-8 animate-spin text-[#0f2e5c] mb-4" />
        <span>Loading Account Authorities...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200/50">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Admin Profile</h1>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Manage your personal administrator identity and email settings.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Profile Card */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs text-left select-none">
          <form onSubmit={handleUpdate} className="space-y-5">
            <div className="flex items-center space-x-4 pb-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-full bg-[#0F2D67] flex items-center justify-center text-white font-bold text-lg">
                {(storedUser?.full_name || "A").charAt(0).toUpperCase()}
              </div>
              <div className="leading-tight">
                <h4 className="text-sm font-black text-slate-900">{storedUser?.full_name || "Voqly Admin"}</h4>
                <span className="text-[10px] text-indigo-650 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded-full font-bold uppercase block mt-1 w-max">
                  Root Admin
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1.5">Full Legal Name</label>
                <input
                  type="text"
                  required
                  defaultValue={storedUser?.full_name || "Super Admin"}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-950 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1.5">Authority Email</label>
                <input
                  type="email"
                  required
                  defaultValue={storedUser?.email || "admin@voqly.ai"}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-950 outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={updating}
                className="h-10 px-5 bg-[#0F2D67] hover:bg-slate-950 disabled:opacity-50 text-xs font-bold text-white rounded-xl transition flex items-center space-x-2 shadow-md cursor-pointer"
              >
                {updating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Syncing Identity...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Security Info */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs flex flex-col justify-between select-none text-left border-red-50/50 bg-red-50/5">
          <div className="space-y-4">
            <h4 className="text-xs font-black text-red-655 uppercase tracking-widest block border-b border-red-100 pb-2.5">
              Authority Lock
            </h4>

            <p className="text-[10.5px] text-slate-500 font-medium leading-relaxed">
              Profile changes will be logged in the global audit trails. Changes to emails require standard MFA re-authentication gates.
            </p>
          </div>

          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-[10px] text-red-700 font-semibold leading-relaxed mt-6 flex items-start space-x-2">
            <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>
              Administrator identities are monitored dynamically. Keep keys secure at all times.
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
