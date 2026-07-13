"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Plus, Loader2, X, Users, Clock, Play, Pause,
  MoreHorizontal, Calendar, Target, ChevronDown, CheckCircle2,
  Trash2, Download, Archive, RotateCcw
} from "lucide-react";
import { apiFetch } from "src/lib/api";
import { formatPhone } from "src/lib/format";
import { FilterMenu, FilterGroup } from "src/components/dashboard/filter-menu";
import { ConfirmModal } from "src/components/dashboard/confirm-modal";

interface Campaign {
  id: number;
  name: string;
  status: string;
  agent_name: string;
  agent_id: number;
  leads_count: number;
  source_list_name?: string | null;
  created_at: string;
  timezone?: string;
  active_days?: string;
  time_start?: string;
  time_end?: string;
  launch_date?: string;
  dnc_scrubbing?: boolean;
  max_attempts?: number;
  retry_delay_hours?: number;
  agent_prompt_override?: string | null;
  direction?: string;
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

/** Convert HTML <input type="time"> value (24h HH:MM) to backend format e.g. "09:00 AM" */
function formatTime24to12(time24: string): string {
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr || "00";
  if (Number.isNaN(h)) return "09:00 AM";
  const period = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h.toString().padStart(2, "0")}:${m} ${period}`;
}

function getCurrentTime24(): string {
  const now = new Date();
  // Start window 2 minutes ago so the dialer can call immediately (not wait for next minute)
  now.setMinutes(now.getMinutes() - 2);
  return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
}

interface CampaignsTabProps {
  campaigns: Campaign[];
  setCampaigns: React.Dispatch<React.SetStateAction<Campaign[]>>;
  agents: Agent[];
  phoneNumbers: PhoneNumber[];
  leads: LeadList[];
  token: string;
  fetchAllData: (silent?: boolean) => Promise<void>;
  triggerSuccess: (msg: string) => void;
  triggerError: (msg: string) => void;
}

export const CampaignsTab: React.FC<CampaignsTabProps> = ({
  campaigns,
  setCampaigns,
  agents,
  leads,
  phoneNumbers,
  token,
  fetchAllData,
  triggerSuccess,
  triggerError,
}) => {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [campFilters, setCampFilters] = useState<Record<string, string>>({ status: "all", direction: "all", agent: "all" });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Form state
  const [campaignName, setCampaignName] = useState("");
  const [campaignDate, setCampaignDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [campaignTime, setCampaignTime] = useState(getCurrentTime24);
  const [selectedAgentId, setSelectedAgentId] = useState<number | "">("");
  // Never auto-select a leads list — the user must choose one explicitly (avoids mistakes)
  const [callingListMode, setCallingListMode] = useState<string>("none");
  const [maxDurationMinutes, setMaxDurationMinutes] = useState(5);
  const [direction, setDirection] = useState<"OUTBOUND" | "INBOUND">("OUTBOUND");
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<string>("");

  // Archived campaigns (loaded on demand)
  const [showArchived, setShowArchived] = useState(false);
  const [archivedCampaigns, setArchivedCampaigns] = useState<Campaign[]>([]);
  const [loadingArchived, setLoadingArchived] = useState(false);

  // If the currently-selected list disappears (e.g. after a refetch), fall back to "none"
  useEffect(() => {
    if (callingListMode === "all" || callingListMode === "none") return;
    const stillExists = leads.some((l) => l.campaign_name === callingListMode);
    if (!stillExists) setCallingListMode("none");
  }, [leads, callingListMode]);

  const loadArchived = async () => {
    setLoadingArchived(true);
    try {
      const data = await apiFetch<Campaign[]>("/dashboard/campaigns?archived=true", "GET", undefined, token);
      setArchivedCampaigns(Array.isArray(data) ? data : []);
    } catch {
      setArchivedCampaigns([]);
    } finally {
      setLoadingArchived(false);
    }
  };

  const toggleArchivedView = () => {
    const next = !showArchived;
    setShowArchived(next);
    if (next) loadArchived();
  };

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".menu-trigger-btn") && !target.closest(".menu-dropdown-content")) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const resetForm = () => {
    setCampaignName("");
    const d = new Date();
    setCampaignDate(d.toISOString().split("T")[0]);
    setCampaignTime(getCurrentTime24());
    setSelectedAgentId("");
    setCallingListMode("none");
    setMaxDurationMinutes(5);
    setDirection("OUTBOUND");
    setSelectedPhoneNumber("");
  };

  const openModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    resetForm();
  };

  // Deep-link: "Talk to Agent → Create Campaign" opens with ?new=1&agent=<id>
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "1") {
      resetForm();
      const agentParam = params.get("agent");
      if (agentParam) setSelectedAgentId(Number(agentParam));
      setModalOpen(true);
      params.delete("new");
      params.delete("agent");
      const qs = params.toString();
      router.replace(`/dashboard/campaigns${qs ? `?${qs}` : ""}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateCampaign = async () => {
    if (!campaignName.trim()) {
      triggerError("Please enter a campaign name.");
      return;
    }
    if (!selectedAgentId) {
      triggerError("Please select a Voice Agent.");
      return;
    }
    const isInbound = direction === "INBOUND";
    if (isInbound) {
      if (!selectedPhoneNumber) {
        triggerError("Select the inbound number this campaign should answer on.");
        return;
      }
    } else if (selectedLeadsCount === 0) {
      triggerError("Please select a leads list with at least 1 lead.");
      return;
    }

    const timeStr = formatTime24to12(campaignTime);

    const userTimezone = typeof window !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "America/Los_Angeles";

    const payload = isInbound ? {
      name: campaignName.trim(),
      agent_id: Number(selectedAgentId),
      status: "active",
      direction: "INBOUND",
      phone_number: selectedPhoneNumber,
      agent_prompt_override: null,
    } : {
      name: campaignName.trim(),
      agent_id: Number(selectedAgentId),
      status: "active",
      direction: "OUTBOUND",
      launch_date: campaignDate,
      timezone: userTimezone,
      active_days: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
      time_start: timeStr,
      time_end: "11:59 PM",
      dnc_scrubbing: true,
      max_attempts: 3,
      retry_delay_hours: 2,
      agent_prompt_override: null,
      from_leads_list: callingListMode,
      max_duration_seconds: maxDurationMinutes * 60,
    };

    setSubmitting(true);
    try {
      const res = await apiFetch<{ status: string; campaign: Campaign; webhook?: { ok: boolean; message: string } | null }>(
        "/dashboard/campaigns",
        "POST",
        payload,
        token
      );

      if (res && res.campaign) {
        // Optimistically add to local list
        setCampaigns((prev) => [res.campaign, ...prev]);
        if (isInbound) {
          if (res.webhook && res.webhook.ok === false) {
            // Bound, but the provider webhook didn't register — the number won't
            // receive calls until its answer URL is set. Tell the vendor why.
            triggerError(`Inbound campaign saved, but the number couldn't be auto-connected: ${res.webhook.message}`);
          } else {
            triggerSuccess(`Inbound campaign "${campaignName}" is now answering ${selectedPhoneNumber}.`);
          }
        } else {
          triggerSuccess(`Campaign "${campaignName}" created with ${selectedLeadsCount} leads!`);
        }
      } else {
        // Fallback: add mock entry so UI updates even if backend is offline
        const mockCamp: Campaign = {
          id: Date.now(),
          name: campaignName.trim(),
          status: "ACTIVE",
          agent_name: agents.find((a) => a.id === Number(selectedAgentId))?.name || "Unknown",
          agent_id: Number(selectedAgentId),
          leads_count: selectedLeadsCount,
          created_at: new Date().toISOString(),
          timezone: userTimezone,
          time_start: timeStr,
          time_end: "05:00 PM",
        };
        setCampaigns((prev) => [mockCamp, ...prev]);
        triggerSuccess(`Campaign "${campaignName}" created (offline mode).`);
      }

      closeModal();
      fetchAllData(true);
    } catch {
      // Backend offline — still add locally
      const mockCamp: Campaign = {
        id: Date.now(),
        name: campaignName.trim(),
        status: "ACTIVE",
        agent_name: agents.find((a) => a.id === Number(selectedAgentId))?.name || "Unknown",
        agent_id: Number(selectedAgentId),
        leads_count: selectedLeadsCount,
        created_at: new Date().toISOString(),
        timezone: userTimezone,
        time_start: timeStr,
        time_end: "05:00 PM",
      };
      setCampaigns((prev) => [mockCamp, ...prev]);
      triggerSuccess(`Campaign "${campaignName}" saved locally.`);
      closeModal();
    } finally {
      setSubmitting(false);
    }
  };

  // Full per-call history CSV. Pass a campaign for a single one (campaign-wise),
  // or omit for the whole workspace.
  const downloadDetailedReport = async (campaignId?: number, campaignName?: string) => {
    if (!campaignId && campaigns.length === 0) {
      triggerError("No campaigns to report yet.");
      return;
    }
    setDownloadingReport(true);
    try {
      const qs = campaignId ? `?campaign_id=${campaignId}` : "";
      const data = await apiFetch<{
        organization: string;
        total_calls: number;
        calls: Array<{
          campaign_name: string; lead_name: string; lead_phone: string; agent_name: string;
          date: string; time: string; status: string; duration: string; sentiment: string; interest_score: number;
        }>;
      }>(`/dashboard/campaigns/report/detailed${qs}`, "GET", undefined, token);

      const rows = data.calls || [];
      if (rows.length === 0) {
        triggerError(campaignId ? "No calls for this campaign yet." : "No calls to report yet.");
        return;
      }

      const cell = (v: string | number) => {
        const str = String(v ?? "");
        return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
      };
      const header = ["Campaign", "Lead Name", "Phone", "Agent", "Date", "Time", "Status", "Call Duration", "Sentiment", "Interest %"];
      const lines = [header.map(cell).join(",")];
      rows.forEach((r) => {
        lines.push([
          r.campaign_name, r.lead_name, formatPhone(r.lead_phone), r.agent_name,
          r.date, r.time, r.status, r.duration, r.sentiment, `${r.interest_score}%`,
        ].map(cell).join(","));
      });

      const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safe = (campaignName || "all-campaigns").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      a.download = `campaign-report-${safe}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      triggerSuccess(campaignId ? `Report for "${campaignName}" downloaded.` : "Full campaign report downloaded.");
    } catch {
      triggerError("Failed to generate report.");
    } finally {
      setDownloadingReport(false);
    }
  };

  const statusColor = (status: string) => {
    const s = status.toUpperCase();
    if (s === "ACTIVE") return "text-emerald-700 bg-emerald-50 border-emerald-200";
    if (s === "PAUSED") return "text-amber-700 bg-amber-50 border-amber-200";
    if (s === "COMPLETED") return "text-blue-700 bg-blue-50 border-blue-200";
    if (s === "ARCHIVED") return "text-slate-600 bg-slate-100 border-slate-300";
    return "text-slate-500 bg-slate-50 border-slate-200";
  };

  const statusIcon = (status: string) => {
    const s = status.toUpperCase();
    if (s === "ACTIVE") return <Play className="w-2.5 h-2.5" />;
    if (s === "PAUSED") return <Pause className="w-2.5 h-2.5" />;
    if (s === "COMPLETED") return <CheckCircle2 className="w-2.5 h-2.5" />;
    if (s === "ARCHIVED") return <Archive className="w-2.5 h-2.5" />;
    return null;
  };

  // Calculate dynamic leads count for display
  let selectedLeadsCount = 0;
  if (callingListMode === "all") {
    selectedLeadsCount = leads.reduce((sum, l) => sum + (l.total_leads || 0), 0);
  } else if (callingListMode !== "none" && callingListMode !== "") {
    selectedLeadsCount = leads.find(l => l.campaign_name === callingListMode)?.total_leads || 0;
  }

  // Gate the Create button so an incomplete form can't fire a background error toast.
  // Inbound needs a number to answer on; outbound needs a leads list to dial.
  const isFormValid =
    campaignName.trim() !== "" &&
    selectedAgentId !== "" &&
    (direction === "INBOUND" ? selectedPhoneNumber.trim() !== "" : selectedLeadsCount > 0) &&
    maxDurationMinutes >= 1 &&
    maxDurationMinutes <= 60;

  const archiveCampaign = async (camp: Campaign) => {
    try {
      await apiFetch(`/dashboard/campaigns/${camp.id}/status`, "PUT", { status: "archived" }, token);
      setCampaigns((prev) => prev.filter((c) => c.id !== camp.id));
      triggerSuccess(`Campaign "${camp.name}" archived.`);
      fetchAllData(true);
      if (showArchived) loadArchived();
    } catch {
      triggerError("Failed to archive campaign.");
    }
    setOpenMenuId(null);
  };

  const restoreCampaign = async (camp: Campaign) => {
    try {
      await apiFetch(`/dashboard/campaigns/${camp.id}/status`, "PUT", { status: "paused" }, token);
      setArchivedCampaigns((prev) => prev.filter((c) => c.id !== camp.id));
      triggerSuccess(`Campaign "${camp.name}" restored.`);
      fetchAllData(true);
    } catch {
      triggerError("Failed to restore campaign.");
    }
  };

  const openCampaignCalls = (camp: Campaign) => {
    router.push(`/dashboard/call-logs?campaign=${camp.id}&name=${encodeURIComponent(camp.name)}`);
  };

  // Filters (status + agent) applied to the visible campaign list
  const uniqStr = (arr: (string | undefined | null)[]) => Array.from(new Set(arr.filter(Boolean) as string[])).sort();
  const campFilterGroups: FilterGroup[] = [
    { key: "status", label: "Status", options: [{ value: "all", label: "All" }, ...uniqStr(campaigns.map((c) => (c.status || "").toUpperCase())).map((v) => ({ value: v, label: v }))] },
    { key: "direction", label: "Direction", options: [{ value: "all", label: "All" }, { value: "OUTBOUND", label: "Outbound" }, { value: "INBOUND", label: "Inbound" }] },
    { key: "agent", label: "Agent", options: [{ value: "all", label: "All" }, ...uniqStr(campaigns.map((c) => c.agent_name)).map((v) => ({ value: v, label: v }))] },
  ];
  const visibleCampaigns = campaigns.filter((c) =>
    (campFilters.status === "all" || (c.status || "").toUpperCase() === campFilters.status) &&
    (campFilters.direction === "all" || (c.direction || "OUTBOUND").toUpperCase() === campFilters.direction) &&
    (campFilters.agent === "all" || c.agent_name === campFilters.agent)
  );

  return (
    <div className="space-y-6 text-left">
      <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-950 tracking-tight">Campaigns</h2>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Deploy outbound dialer schedules and monitor conversational conversions in real-time.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <FilterMenu
            groups={campFilterGroups}
            value={campFilters}
            onChange={(k, v) => setCampFilters((prev) => ({ ...prev, [k]: v }))}
            onClear={() => setCampFilters({ status: "all", direction: "all", agent: "all" })}
          />
          <button
            onClick={toggleArchivedView}
            title="View campaigns you've archived"
            className={`h-9 px-4 border text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 shadow-xs active:scale-[0.98] cursor-pointer flex-1 sm:flex-none ${showArchived ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-800" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}
          >
            <Archive className="w-4 h-4" />
            <span>{showArchived ? "Hide Archived" : "Show Archived"}</span>
          </button>
          <button
            onClick={() => downloadDetailedReport()}
            disabled={downloadingReport || campaigns.length === 0}
            title="Download a full report of every campaign — calls, talk minutes, leads and outcomes"
            className="h-9 px-4 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold text-slate-700 rounded-lg transition-all flex items-center justify-center space-x-1.5 shadow-xs active:scale-[0.98] cursor-pointer flex-1 sm:flex-none"
          >
            {downloadingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>Campaign Report</span>
          </button>
          <button
            onClick={openModal}
            className="h-9 px-4 bg-[#0b1931] hover:bg-slate-950 text-xs font-bold text-white rounded-lg transition-all flex items-center justify-center space-x-1.5 shadow-sm active:scale-[0.98] cursor-pointer flex-1 sm:flex-none"
          >
            <Plus className="w-4 h-4" />
            <span>New Campaign</span>
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Campaigns", value: campaigns.length, icon: Target, color: "text-blue-600 bg-blue-50" },
          { label: "Active", value: campaigns.filter(c => c.status.toUpperCase() === "ACTIVE").length, icon: Play, color: "text-emerald-600 bg-emerald-50" },
          { label: "Total Leads", value: campaigns.reduce((s, c) => s + (c.leads_count || 0), 0).toLocaleString(), icon: Users, color: "text-violet-600 bg-violet-50" },
          { label: "Scheduled", value: campaigns.filter(c => c.status.toUpperCase() === "DRAFT").length, icon: Calendar, color: "text-amber-600 bg-amber-50" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-center space-x-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${stat.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">{stat.label}</p>
                <p className="text-lg font-extrabold text-slate-950 leading-tight">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Campaigns Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-visible shadow-xs">
        <div className="h-14 px-4 sm:px-6 border-b border-slate-100 flex items-center justify-between select-none">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Your Campaigns
          </span>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider hidden sm:block">
            {campaigns.length} campaigns
          </span>
        </div>

        {/* Mobile card view */}
        <div className="sm:hidden divide-y divide-slate-100">
          {visibleCampaigns.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-bold text-sm">
              No campaigns yet. Create your first campaign above!
            </div>
          ) : (
            visibleCampaigns.map((camp) => (
              <div key={camp.id} onClick={() => openCampaignCalls(camp)} className="p-4 space-y-3 cursor-pointer hover:bg-slate-50/40 transition-colors active:bg-slate-100">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-extrabold text-slate-950">{camp.name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{camp.agent_name}</p>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border flex items-center space-x-1 ${statusColor(camp.status)}`}>
                    {statusIcon(camp.status)}
                    <span>{camp.status.toUpperCase()}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                  <span className="flex items-center space-x-1">
                    <Users className="w-3 h-3" />
                    <span>{camp.source_list_name ? `${camp.source_list_name} (${camp.leads_count})` : `${camp.leads_count} leads`}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{camp.launch_date ? `${new Date(camp.launch_date + "T00:00:00").toLocaleDateString()} · ` : ""}{camp.time_start || "09:00 AM"} – {camp.time_end || "05:00 PM"}</span>
                  </span>
                  <span>{new Date(camp.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop table view */}
        <div className="hidden sm:block overflow-x-auto min-h-[220px]">
          <table className="w-full text-left border-collapse text-xs font-semibold text-slate-700">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] text-slate-455 font-bold uppercase tracking-wider select-none">
                <th className="p-4 pl-6">Campaign Name</th>
                <th className="p-4">Status</th>
                <th className="p-4">Agent</th>
                <th className="p-4">Schedule</th>
                <th className="p-4">Leads</th>
                <th className="p-4">Created</th>
                <th className="p-4 w-12 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-400 font-bold select-none">
                    No campaigns yet. Create your first campaign above!
                  </td>
                </tr>
              ) : (
                visibleCampaigns.map((camp) => (
                  <tr key={camp.id} onClick={() => openCampaignCalls(camp)} title="View this campaign's call logs" className="hover:bg-slate-50/40 transition-all group cursor-pointer">
                    <td className="p-4 pl-6">
                      <p className="text-slate-950 font-extrabold group-hover:text-blue-700 transition-colors flex items-center gap-2">
                        {camp.name}
                        <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                          (camp.direction || "OUTBOUND").toUpperCase() === "INBOUND"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-50 text-slate-500 border-slate-200"
                        }`}>
                          {(camp.direction || "OUTBOUND").toUpperCase() === "INBOUND" ? "Inbound" : "Outbound"}
                        </span>
                      </p>
                    </td>
                    <td className="p-4">
                      <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full border flex items-center space-x-1 w-fit ${statusColor(camp.status)}`}>
                        {statusIcon(camp.status)}
                        <span>{camp.status.toUpperCase()}</span>
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-[9px] text-blue-700 uppercase shrink-0">
                          {(camp.agent_name || "UN").substring(0, 2)}
                        </div>
                        <span className="text-slate-900 font-bold truncate max-w-[120px]">{camp.agent_name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-550">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="whitespace-nowrap">
                          {(camp.direction || "OUTBOUND").toUpperCase() === "INBOUND"
                            ? "24/7 · Always on"
                            : `${camp.launch_date ? `${new Date(camp.launch_date + "T00:00:00").toLocaleDateString()} · ` : ""}${camp.time_start || "09:00 AM"} – ${camp.time_end || "05:00 PM"}`}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-slate-650">
                      <div className="flex items-center space-x-1">
                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{camp.source_list_name ? `${camp.source_list_name} (${camp.leads_count})` : camp.leads_count}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-400">{new Date(camp.created_at).toLocaleDateString()}</td>
                    <td className="p-4 relative text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === camp.id ? null : camp.id); }}
                        className="menu-trigger-btn p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer inline-flex items-center justify-center"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {openMenuId === camp.id && (
                        <div className="menu-dropdown-content absolute right-4 top-10 z-20 bg-white border border-slate-200 rounded-xl shadow-xl py-1 w-40 text-xs font-semibold text-left" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => { downloadDetailedReport(camp.id, camp.name); setOpenMenuId(null); }}
                            className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5 text-blue-500" /><span>Download Report</span>
                          </button>
                          {camp.status.toUpperCase() !== "ACTIVE" && (
                            <button
                              onClick={async () => {
                                try {
                                  await apiFetch(`/dashboard/campaigns/${camp.id}/status`, "PUT", { status: "active" }, token);
                                  setCampaigns(prev => prev.map(c => c.id === camp.id ? { ...c, status: "ACTIVE" } : c));
                                  triggerSuccess("Campaign activated!");
                                  fetchAllData(true);
                                } catch { triggerError("Failed to activate campaign."); }
                                setOpenMenuId(null);
                              }}
                              className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5 text-emerald-500" /><span>Activate</span>
                            </button>
                          )}
                          {camp.status.toUpperCase() === "ACTIVE" && (
                            <button
                              onClick={async () => {
                                try {
                                  await apiFetch(`/dashboard/campaigns/${camp.id}/status`, "PUT", { status: "paused" }, token);
                                  setCampaigns(prev => prev.map(c => c.id === camp.id ? { ...c, status: "PAUSED" } : c));
                                  triggerSuccess("Campaign paused.");
                                  fetchAllData(true);
                                } catch { triggerError("Failed to pause campaign."); }
                                setOpenMenuId(null);
                              }}
                              className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer"
                            >
                              <Pause className="w-3.5 h-3.5 text-amber-500" /><span>Pause</span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                title: "Archive Campaign",
                                message: `Archive campaign "${camp.name}"? It will be hidden from your active list but can be restored anytime from "Show Archived".`,
                                onConfirm: () => archiveCampaign(camp),
                              });
                              setOpenMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer"
                          >
                            <Archive className="w-3.5 h-3.5 text-slate-500" /><span>Archive</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Archived campaigns */}
      {showArchived && (
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
          <div className="h-14 px-4 sm:px-6 border-b border-slate-100 flex items-center justify-between select-none">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Archive className="w-3.5 h-3.5 text-slate-400" /> Archived Campaigns
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              {archivedCampaigns.length} archived
            </span>
          </div>
          {loadingArchived ? (
            <div className="p-8 text-center text-slate-400 font-bold text-sm">Loading archived campaigns…</div>
          ) : archivedCampaigns.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-semibold text-sm">No archived campaigns yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {archivedCampaigns.map((camp) => (
                <div key={camp.id} className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{camp.name}</p>
                    <p className="text-[11px] text-slate-400 font-medium truncate">
                      {camp.agent_name} · {camp.source_list_name ? `${camp.source_list_name} (${camp.leads_count})` : `${camp.leads_count} leads`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => restoreCampaign(camp)}
                      className="h-8 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-emerald-600" /><span>Restore</span>
                    </button>
                    <button
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: "Delete Permanently",
                          message: `Permanently delete "${camp.name}"? This cannot be undone.`,
                          onConfirm: async () => {
                            try {
                              await apiFetch(`/dashboard/campaigns/${camp.id}`, "DELETE", undefined, token);
                              setArchivedCampaigns((prev) => prev.filter((c) => c.id !== camp.id));
                              triggerSuccess(`Campaign "${camp.name}" deleted.`);
                            } catch { triggerError("Failed to delete campaign."); }
                          },
                        });
                      }}
                      className="h-8 px-3 bg-white border border-red-200 hover:bg-red-50 text-xs font-bold text-red-600 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /><span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      </div>

      {/* ── CREATE CAMPAIGN MODAL ── */}
      {modalOpen && mounted && typeof window !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-y-auto bg-black/45 backdrop-blur-sm p-4 flex justify-center items-start sm:items-center transition-all duration-300 select-none animate-fade-only"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl flex flex-col my-8 overflow-hidden relative border border-slate-100 border-t-4 border-blue-600 transform scale-100 animate-scale-in">

            {/* Modal header */}
            <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between shrink-0 bg-slate-50/50">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                  <span>Create Scheduled Campaign</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Deploy scheduled outbound calling routes custom isolated to your workspace prospects.
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors ml-4 shrink-0 border border-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-6 space-y-6 overflow-y-visible flex-1 bg-white">

              {/* Campaign Name */}
              <div className="space-y-2">
                <label className="flex items-center space-x-1.5 text-[10px] font-extrabold text-slate-900 uppercase tracking-wider">
                  <Target className="w-3.5 h-3.5 text-slate-400" />
                  <span>Campaign Name</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Q3 Customer Re-engagement Schedule"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200/95 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder-slate-400"
                />
              </div>

              {/* Direction: Outbound (dial) vs Inbound (answer) */}
              <div className="space-y-2">
                <label className="flex items-center space-x-1.5 text-[10px] font-extrabold text-slate-900 uppercase tracking-wider">
                  <span>Campaign Direction</span>
                  <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { v: "OUTBOUND", t: "Outbound", d: "Dial a leads list on a schedule" },
                    { v: "INBOUND", t: "Inbound", d: "Answer calls to a number" },
                  ] as const).map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setDirection(o.v)}
                      className={`text-left p-3 rounded-xl border transition cursor-pointer ${
                        direction === o.v ? "border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20" : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                      }`}
                    >
                      <p className="text-xs font-black text-slate-900">{o.t}</p>
                      <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{o.d}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Time (outbound only) */}
              {direction === "OUTBOUND" && (
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="flex items-center space-x-1.5 text-[10px] font-extrabold text-slate-900 uppercase tracking-wider">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Launch Date</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={campaignDate}
                      onChange={(e) => setCampaignDate(e.target.value)}
                      className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200/95 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center space-x-1.5 text-[10px] font-extrabold text-slate-900 uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Daily Window Time</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center h-11 border border-slate-200/95 rounded-xl overflow-hidden focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 bg-slate-50 transition-all">
                    <input
                      type="time"
                      value={campaignTime}
                      onChange={(e) => setCampaignTime(e.target.value)}
                      className="flex-1 h-full px-3.5 text-sm font-semibold text-slate-900 outline-none bg-transparent"
                    />
                    <span className="px-3.5 h-full flex items-center text-xs font-bold text-slate-500 border-l border-slate-200/60 bg-white">
                      {formatTime24to12(campaignTime)}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">Calls dial from this time until 11:59 PM in your timezone.</p>
                </div>
              </div>
              )}

              {/* Agent & Select Leads List */}
              <div className="grid grid-cols-2 gap-5">
                {/* Agent */}
                <div className="space-y-2">
                  <label className="flex items-center space-x-1.5 text-[10px] font-extrabold text-slate-900 uppercase tracking-wider">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Voice Agent</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedAgentId}
                      onChange={(e) => setSelectedAgentId(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full h-11 pl-3.5 pr-10 bg-slate-50 border border-slate-200/95 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition cursor-pointer appearance-none"
                    >
                      <option value="" disabled>Select an assistant</option>
                      {agents.map((ag) => (
                        <option key={ag.id} value={ag.id}>{ag.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold mt-1.5">
                    <span className="font-medium">{agents.length} available</span>
                    {selectedAgentId !== "" ? (
                      <span className="flex items-center space-x-1 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full font-bold px-2 py-0.5 text-[9px] uppercase tracking-wider">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>Selected ✓</span>
                      </span>
                    ) : agents.length > 0 ? (
                      <div className="flex items-center space-x-2">
                        <span className="text-blue-650 font-extrabold text-[9px] uppercase tracking-wide">Ready ✓</span>
                        <button
                          onClick={() => { closeModal(); router.push("/dashboard/agents"); }}
                          type="button"
                          className="flex items-center space-x-1 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-650 hover:text-slate-800 rounded px-2 py-0.5 cursor-pointer text-[9px] font-bold transition shadow-xs"
                        >
                          <Plus className="w-2.5 h-2.5" /><span>Create</span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Outbound: leads list — Inbound: number the agent answers on */}
                {direction === "OUTBOUND" ? (
                <div className="space-y-2">
                  <label className="flex items-center space-x-1.5 text-[10px] font-extrabold text-slate-900 uppercase tracking-wider">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Select Leads List</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={callingListMode}
                      onChange={(e) => setCallingListMode(e.target.value)}
                      className="w-full h-11 pl-3.5 pr-10 bg-slate-50 border border-slate-200/95 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition cursor-pointer appearance-none"
                    >
                      <option value="none">No leads selected</option>
                      {leads && leads.length > 0 && (
                        <option value="all">All Leads ({leads.reduce((sum, l) => sum + (l.total_leads || 0), 0)})</option>
                      )}
                      {leads.filter(l => l.campaign_name).map((l) => (
                        <option key={l.campaign_name} value={l.campaign_name}>
                          {l.campaign_name} ({l.total_leads})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold mt-1.5">
                    <span className="font-medium">
                      {selectedLeadsCount} leads selected
                    </span>
                  </div>
                </div>
                ) : (
                <div className="space-y-2">
                  <label className="flex items-center space-x-1.5 text-[10px] font-extrabold text-slate-900 uppercase tracking-wider">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Inbound Number</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={selectedPhoneNumber}
                    onChange={(e) => setSelectedPhoneNumber(e.target.value)}
                    list="inbound-number-options"
                    placeholder="+14155238886"
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200/95 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition font-mono placeholder-slate-400"
                  />
                  <datalist id="inbound-number-options">
                    {phoneNumbers.map((p) => (
                      <option key={p.id} value={p.phone_number} />
                    ))}
                  </datalist>
                  <p className="text-[10px] text-slate-400 font-medium mt-1.5">
                    {phoneNumbers.length > 0
                      ? "Pick an assigned number, or type the number this agent should answer on (E.164)."
                      : "Type the number this agent should answer on (E.164) — it must be a number in the platform's provider account."}
                  </p>
                </div>
                )}
              </div>

              {/* Max Call Duration */}
              <div className="space-y-2">
                <label className="flex items-center space-x-1.5 text-[10px] font-extrabold text-slate-900 uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Max Duration (Minutes)</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={maxDurationMinutes}
                  onChange={(e) => {
                    const v = Math.round(Number(e.target.value));
                    setMaxDurationMinutes(Number.isFinite(v) && v > 0 ? Math.min(60, v) : 1);
                  }}
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200/95 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                />
                <p className="text-[10px] text-slate-400 font-semibold mt-1.5">Between 1 and 60 minutes.</p>
              </div>

            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0 bg-slate-50">
              <p className={`text-[11px] font-semibold ${isFormValid ? "text-transparent" : "text-slate-400"}`}>
                {isFormValid ? "" : (direction === "INBOUND" ? "Add a name, agent and an inbound number to continue." : "Add a name, agent and a leads list to continue.")}
              </p>
              <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={closeModal}
                className="h-10 px-5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer shadow-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateCampaign}
                disabled={submitting || !isFormValid}
                title={isFormValid ? "Create campaign" : "Complete the required fields first"}
                className="h-10 px-6 bg-[#0b1931] hover:bg-slate-950 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center space-x-2 border border-[#0b1931] shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 duration-150"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Create Campaign</span>
                )}
              </button>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => {
          confirmModal.onConfirm();
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        isDestructive={true}
      />

    </div>
  );
};
