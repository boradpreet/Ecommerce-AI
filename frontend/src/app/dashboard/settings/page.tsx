"use client";

import React, { useEffect, useState } from "react";
import { useAuthStore } from "src/store/authStore";
import { useRouter } from "next/navigation";
import { SettingsTab } from "src/components/dashboard/settings-tab";
import { apiFetch } from "src/lib/api";

interface OrgSettings {
  name?: string;
  timezone?: string;
  log_retention_days?: number;
  logo_url?: string | null;
}

export default function DashboardSettingsPage() {
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const router = useRouter();
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [settings, setSettings] = useState({
    businessName: "Voqly Enterprise",
    timezone: "Coordinated Universal Time (UTC)",
    retentionDays: 90,
    logoUrl: null as string | null,
  });

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (!hasHydrated) return;
    if (!token) {
      router.replace("/");
      return;
    }

    apiFetch<OrgSettings>("/dashboard/organization/settings", "GET", undefined, token)
      .then((data) => {
        if (data) {
          setSettings({
            businessName: data.name || "Voqly Enterprise",
            timezone: data.timezone || "Coordinated Universal Time (UTC)",
            retentionDays: data.log_retention_days || 90,
            logoUrl: data.logo_url ?? null,
          });
        }
      })
      .catch(() => {
        // Backend offline — keep defaults, settings tab has its own fallback
      });
  }, [hasHydrated, router, token]);

  if (!hasHydrated || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Loading settings…
      </div>
    );
  }

  return (
    <>
      {/* Global toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-[9999] flex items-center space-x-2.5 px-5 py-3 rounded-xl shadow-xl text-xs font-bold text-white transition-all ${
            toast.type === "success" ? "bg-slate-900" : "bg-red-600"
          }`}
        >
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] shrink-0 ${
              toast.type === "success" ? "bg-emerald-500" : "bg-red-400"
            }`}
          >
            {toast.type === "success" ? "✓" : "✕"}
          </span>
          <span>{toast.msg}</span>
        </div>
      )}

      <SettingsTab
        initialBusinessName={settings.businessName}
        initialTimezone={settings.timezone}
        initialRetentionDays={settings.retentionDays}
        initialLogoUrl={settings.logoUrl}
        token={token}
        fetchAllData={async () => undefined}
        triggerSuccess={(msg) => showToast(msg, "success")}
        triggerError={(msg) => showToast(msg, "error")}
        initialSettingsTab="general"
      />
    </>
  );
}
