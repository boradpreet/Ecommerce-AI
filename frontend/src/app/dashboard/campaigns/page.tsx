"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "src/store/authStore";
import { useRouter } from "next/navigation";
import { CampaignsTab } from "src/components/dashboard/campaigns-tab";
import { apiFetch } from "src/lib/api";
import { Loader2 } from "lucide-react";

interface Campaign {
  id: number;
  name: string;
  status: string;
  agent_name: string;
  agent_id: number;
  leads_count: number;
  created_at: string;
  timezone?: string;
  active_days?: string;
  time_start?: string;
  time_end?: string;
  dnc_scrubbing?: boolean;
  max_attempts?: number;
  retry_delay_hours?: number;
  agent_prompt_override?: string | null;
}

interface Agent {
  id: number;
  name: string;
  voice_id: string;
  prompt_system?: string;
}

interface PhoneNumber {
  id: number;
  phone_number: string;
}

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

export default function DashboardCampaignsPage() {
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const router = useRouter();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [leads, setLeads] = useState<LeadList[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAllData = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    try {
      const [campaignsData, agentsData, phoneNumbersData, leadsData] = await Promise.all([
        apiFetch<Campaign[]>("/dashboard/campaigns", "GET", undefined, token),
        apiFetch<Agent[]>("/dashboard/agents", "GET", undefined, token),
        apiFetch<PhoneNumber[]>("/dashboard/phone-numbers", "GET", undefined, token),
        apiFetch<LeadList[]>("/dashboard/leads", "GET", undefined, token),
      ]);

      setCampaigns(Array.isArray(campaignsData) ? campaignsData : []);
      setAgents(Array.isArray(agentsData) ? agentsData : []);
      setPhoneNumbers(Array.isArray(phoneNumbersData) ? phoneNumbersData : []);
      setLeads(Array.isArray(leadsData) ? leadsData : []);
    } catch {
      setCampaigns([]);
      setAgents([]);
      setPhoneNumbers([]);
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
    fetchAllData();
  }, [hasHydrated, router, token, fetchAllData]);

  useEffect(() => {
    const syncSearch = () => {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const q = params.get("search") || "";
        setSearchQuery((prev) => (prev !== q ? q : prev));
      }
    };
    syncSearch();
    const interval = setInterval(syncSearch, 400);
    return () => clearInterval(interval);
  }, []);

  if (!hasHydrated || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Loading campaigns…
      </div>
    );
  }

  const filteredCampaigns = campaigns.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.agent_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      {loading ? (
        <div className="min-h-[60vh] flex items-center justify-center text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mr-3" />
          Loading campaigns…
        </div>
      ) : (
        <CampaignsTab
          campaigns={filteredCampaigns}
          setCampaigns={setCampaigns}
          agents={agents}
          phoneNumbers={phoneNumbers}
          leads={leads}
          token={token}
          fetchAllData={fetchAllData}
          triggerSuccess={(msg) => showToast(msg, "success")}
          triggerError={(msg) => showToast(msg, "error")}
        />
      )}
    </>
  );
}
