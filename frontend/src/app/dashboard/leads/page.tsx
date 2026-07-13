"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "src/store/authStore";
import { useRouter } from "next/navigation";
import { LeadsTab } from "src/components/dashboard/leads-tab";
import { apiFetch } from "src/lib/api";
import { Loader2 } from "lucide-react";

interface LeadList {
  id: number;
  campaign_name: string;
  total_leads: number;
  pending_leads: number;
  called_leads: number;
  dnc_leads: number;
  last_called: string;
  created_at: string;
}

export default function DashboardLeadsPage() {
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const router = useRouter();
  const [leads, setLeads] = useState<LeadList[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    try {
      const data = await apiFetch("/dashboard/leads", "GET", undefined, token);
      setLeads(Array.isArray(data) ? data : []);
    } catch {
      // Backend offline — show empty state
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!token) {
      router.replace("/");
      return;
    }

    fetchLeads();
  }, [hasHydrated, router, token, fetchLeads]);

  if (!hasHydrated || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">Loading leads…</div>
    );
  }

  return (
    <>
      {loading ? (
        <div className="min-h-[60vh] flex items-center justify-center text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mr-3" /> Loading leads...
        </div>
      ) : (
        <LeadsTab
          leads={leads}
          token={token}
          fetchAllData={fetchLeads}
          triggerSuccess={() => undefined}
          triggerError={() => undefined}
        />
      )}
    </>
  );
}
