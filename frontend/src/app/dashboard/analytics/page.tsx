"use client";

import React, { useEffect } from "react";
import { useAuthStore } from "src/store/authStore";
import { useRouter } from "next/navigation";
import { AnalyticsTab } from "src/components/dashboard/analytics-tab";

export default function DashboardAnalyticsPage() {
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const router = useRouter();

  useEffect(() => {
    if (!hasHydrated) return;
    if (!token) {
      router.replace("/");
    }
  }, [hasHydrated, router, token]);

  if (!hasHydrated || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Loading analytics…
      </div>
    );
  }

  return <AnalyticsTab />;
}
