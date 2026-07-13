"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FileUp, Info, Loader2, Shield, Coins, Bell, Users,
  Copy, RotateCw, Sliders, Building2,
  Check, Eye, EyeOff, Trash2, Plus, Download, CreditCard,
  Send, Mail, MessageCircle
} from "lucide-react";
import { apiFetch } from "src/lib/api";
import { ConfirmModal } from "src/components/dashboard/confirm-modal";

interface SettingsTabProps {
  initialBusinessName: string;
  initialTimezone: string;
  initialRetentionDays: number;
  initialLogoUrl: string | null;
  token: string;
  fetchAllData: (silent?: boolean) => Promise<void>;
  triggerSuccess: (msg: string) => void;
  triggerError: (msg: string) => void;
  initialSettingsTab?: string;
}

interface Invoice {
  id: number;
  invoice_number: string;
  amount: number | string;
  status: string;
  created_at: string;
  pdf_url: string;
}

interface TeamMember {
  id: number;
  name?: string;
  email: string;
  role: string;
  status: string;
}

interface OrganizationSettings {
  name?: string;
  timezone?: string;
  log_retention_days?: number;
  logo_url?: string | null;
  concurrency_limit?: number;
  webhook_url?: string;
  recording_enabled?: boolean;
  voicemail_detection?: boolean;
  api_key?: string;
  notifications_slack?: boolean;
  notifications_email?: boolean;
  notifications_low_balance?: boolean;
  notifications_weekly_report?: boolean;
  prepaid_balance?: number;
  company_details?: string;
  auto_send_details?: boolean;
  auto_send_threshold?: number;
}

interface TeamResponse {
  members?: TeamMember[];
}

interface BillingResponse {
  prepaid_balance?: number;
  plan_tier?: string;
  current_period_end?: string;
  invoices?: Invoice[];
}

interface RegenerateKeyResponse {
  api_key?: string;
}

interface InviteMemberResponse {
  member?: TeamMember;
}

interface RechargeResponse {
  prepaid_balance: number;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  initialBusinessName,
  initialTimezone,
  initialRetentionDays,
  initialLogoUrl,
  token,
  fetchAllData,
  triggerSuccess,
  triggerError,
  initialSettingsTab = "general",
}) => {
  const [activeSettingsTab, setActiveSettingsTab] = useState<string>(initialSettingsTab);

  useEffect(() => {
    if (initialSettingsTab) {
      setActiveSettingsTab(initialSettingsTab);
    }
  }, [initialSettingsTab]);
  
  // Business Profile States
  const [businessName, setBusinessName] = useState(initialBusinessName);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [retentionDays, setRetentionDays] = useState(initialRetentionDays);
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl);
  
  // General Settings States
  const [concurrencyLimit, setConcurrencyLimit] = useState<number>(10);
  const [webhookUrl, setWebhookUrl] = useState<string>("");
  const [recordingEnabled, setRecordingEnabled] = useState<boolean>(true);
  const [voicemailDetection, setVoicemailDetection] = useState<boolean>(true);
  
  // Notification States
  const [notifSlack, setNotifSlack] = useState<boolean>(false);
  const [notifEmail, setNotifEmail] = useState<boolean>(true);
  const [notifLowBalance, setNotifLowBalance] = useState<boolean>(true);
  const [notifWeeklyReport, setNotifWeeklyReport] = useState<boolean>(true);

  // Auto Follow-up (company details sent to caller on interest / request)
  const [companyDetails, setCompanyDetails] = useState<string>("");
  const [autoSendDetails, setAutoSendDetails] = useState<boolean>(true);
  const [autoSendThreshold, setAutoSendThreshold] = useState<number>(50);
  
  // Security API Key States
  const [apiKey, setApiKey] = useState<string>("vq_live_7a9c8d1b2e3f");
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [regeneratingKey, setRegeneratingKey] = useState<boolean>(false);
  const [allowedIps, setAllowedIps] = useState<string>("");
  const [ipLockEnabled, setIpLockEnabled] = useState<boolean>(false);
  const [hipaaCompliance, setHipaaCompliance] = useState<boolean>(false);
  
  // Billing States
  const [prepaidBalance, setPrepaidBalance] = useState<number>(250.00);
  const [planTier, setPlanTier] = useState<string>("growth");
  const [, setCurrentPeriodEnd] = useState<string>("June 27, 2026");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [recharging, setRecharging] = useState<boolean>(false);
  const [rechargeAmount, setRechargeAmount] = useState<number>(50);
  const [rechargeModalOpen, setRechargeModalOpen] = useState<boolean>(false);
  
  // Team States
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState<string>("");
  const [inviteRole, setInviteRole] = useState<string>("member");
  const [inviting, setInviting] = useState<boolean>(false);

  const [loadingAll, setLoadingAll] = useState<boolean>(true);
  const [settingsSaving, setSettingsSaving] = useState<boolean>(false);
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

  // Fetch full settings dataset — with offline fallback so page always renders
  const fetchSettingsData = useCallback(async () => {
    setLoadingAll(true);
    try {
      // 1. Fetch full org settings
      const settings = await apiFetch<OrganizationSettings>("/dashboard/organization/settings", "GET", undefined, token);
      if (settings) {
        setBusinessName(settings.name || initialBusinessName);
        setTimezone(settings.timezone || initialTimezone);
        setRetentionDays(settings.log_retention_days || initialRetentionDays);
        setLogoUrl(settings.logo_url || initialLogoUrl);
        setConcurrencyLimit(settings.concurrency_limit ?? 10);
        setWebhookUrl(settings.webhook_url || "");
        setRecordingEnabled(settings.recording_enabled ?? true);
        setVoicemailDetection(settings.voicemail_detection ?? true);
        setApiKey(settings.api_key || "vq_live_7a9c8d1b2e3f");
        setNotifSlack(settings.notifications_slack ?? false);
        setNotifEmail(settings.notifications_email ?? true);
        setNotifLowBalance(settings.notifications_low_balance ?? true);
        setNotifWeeklyReport(settings.notifications_weekly_report ?? true);
        setPrepaidBalance(settings.prepaid_balance ?? 250.00);
        setCompanyDetails(settings.company_details ?? "");
        setAutoSendDetails(settings.auto_send_details ?? true);
        setAutoSendThreshold(settings.auto_send_threshold ?? 50);
      }
    } catch {
      // Backend offline — use prop defaults already set in useState
      setBusinessName(initialBusinessName || "Voqly Enterprise");
      setTimezone(initialTimezone || "Coordinated Universal Time (UTC)");
      setRetentionDays(initialRetentionDays || 90);
    }

    try {
      // 2. Fetch team members
      const teamRes = await apiFetch<TeamResponse>("/dashboard/organization/team", "GET", undefined, token);
      if (teamRes && teamRes.members) {
        setTeamMembers(teamRes.members);
      }
    } catch {
      // Keep empty team list — not critical
    }

    try {
      // 3. Fetch billing details
      const billingRes = await apiFetch<BillingResponse>("/dashboard/organization/billing", "GET", undefined, token);
      if (billingRes) {
        setPrepaidBalance(billingRes.prepaid_balance ?? 250.00);
        setPlanTier(billingRes.plan_tier || "growth");
        setCurrentPeriodEnd(billingRes.current_period_end || "June 27, 2026");
        setInvoices(billingRes.invoices || []);
      }
    } catch {
      // Keep mock billing defaults
      setPrepaidBalance(250.00);
      setPlanTier("growth");
      setCurrentPeriodEnd("June 27, 2026");
      setInvoices([
        { id: 1, invoice_number: "INV-2026-1001", amount: 149.00, status: "paid", created_at: "May 01, 2026", pdf_url: "#" },
        { id: 2, invoice_number: "INV-2026-1002", amount: 250.00, status: "paid", created_at: "Apr 01, 2026", pdf_url: "#" },
      ]);
    }

    setLoadingAll(false);
  }, [token, initialBusinessName, initialTimezone, initialRetentionDays, initialLogoUrl]);

  useEffect(() => {
    if (token) {
      fetchSettingsData();
    }
  }, [token, fetchSettingsData]);

  // Action Save Handlers
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      const payload = {
        concurrency_limit: concurrencyLimit,
        webhook_url: webhookUrl || null,
        recording_enabled: recordingEnabled,
        voicemail_detection: voicemailDetection,
      };
      const res = await apiFetch("/dashboard/organization/general", "PUT", payload, token);
      // Persist the general data-retention preference (lives on the org settings endpoint).
      await apiFetch("/dashboard/organization/settings", "PUT", {
        name: businessName,
        timezone,
        log_retention_days: retentionDays,
        logo_url: logoUrl,
      }, token);
      if (res) {
        triggerSuccess("General preferences updated.");
      } else {
        triggerError("Failed to save general configurations.");
      }
    } catch {
      triggerError("Network error while saving general settings.");
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      const payload = {
        name: businessName,
        timezone: timezone,
        log_retention_days: retentionDays,
        logo_url: logoUrl
      };
      const res = await apiFetch("/dashboard/organization/settings", "PUT", payload, token);
      if (res) {
        triggerSuccess("Business identity and data policies updated.");
        fetchAllData(true); // sync sidebar brand name
      } else {
        triggerError("Failed to save profile changes.");
      }
    } catch {
      triggerError("Network error while updating organization settings.");
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleSaveFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      // update_org_settings requires name/timezone/retention — send them alongside the follow-up fields
      const payload = {
        name: businessName,
        timezone: timezone,
        log_retention_days: retentionDays,
        logo_url: logoUrl,
        company_details: companyDetails,
        auto_send_details: autoSendDetails,
        auto_send_threshold: autoSendThreshold,
      };
      const res = await apiFetch("/dashboard/organization/settings", "PUT", payload, token);
      if (res) {
        triggerSuccess("Auto follow-up settings saved.");
      } else {
        triggerError("Failed to save follow-up settings.");
      }
    } catch {
      triggerError("Network error while saving follow-up settings.");
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      const payload = {
        notifications_slack: notifSlack,
        notifications_email: notifEmail,
        notifications_low_balance: notifLowBalance,
        notifications_weekly_report: notifWeeklyReport,
      };
      const res = await apiFetch("/dashboard/organization/notifications", "PUT", payload, token);
      if (res) {
        triggerSuccess("Alert policies and routing saved.");
      } else {
        triggerError("Failed to save alert routing.");
      }
    } catch {
      triggerError("Network error while saving notifications configuration.");
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleRegenerateKey = () => {
    setConfirmModal({
      isOpen: true,
      title: "Regenerate API Key",
      message: "WARNING: Regenerating your live key will immediately invalidate your current active API integrations. Are you sure you wish to continue?",
      onConfirm: async () => {
        setRegeneratingKey(true);
        try {
          const res = await apiFetch<RegenerateKeyResponse>("/dashboard/organization/api-keys/regenerate", "POST", undefined, token);
          if (res && res.api_key) {
            setApiKey(res.api_key);
            triggerSuccess("New live API credential generated successfully.");
          } else {
            triggerError("Failed to regenerate credentials.");
          }
        } catch {
          triggerError("Network error while regenerating API credentials.");
        } finally {
          setRegeneratingKey(false);
        }
      }
    });
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const payload = {
        email: inviteEmail.trim(),
        role: inviteRole,
      };
      const res = await apiFetch<InviteMemberResponse>("/dashboard/organization/team/invite", "POST", payload, token);
      if (res && res.member) {
        setTeamMembers(prev => [...prev, res.member!]);
        setInviteEmail("");
        triggerSuccess(`Workspace invitation routed to ${payload.email}.`);
      } else {
        triggerError("Failed to invite collaborator. They may already belong to this workspace.");
      }
    } catch {
      triggerError("Error sending collaborator invitation.");
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = (memberId: number) => {
    setConfirmModal({
      isOpen: true,
      title: "Remove Collaborator",
      message: "Are you sure you want to remove this collaborator from your team?",
      onConfirm: async () => {
        try {
          const res = await apiFetch<unknown>(`/dashboard/organization/team/${memberId}`, "DELETE", undefined, token);
          if (res) {
            setTeamMembers(prev => prev.filter(m => m.id !== memberId));
            triggerSuccess("Team collaborator removed.");
          } else {
            triggerError("Failed to remove teammate.");
          }
        } catch {
          triggerError("Error deleting collaborator.");
        }
      }
    });
  };

  const handleRecharge = async () => {
    setRecharging(true);
    try {
      const payload = { amount: rechargeAmount };
      const res = await apiFetch<RechargeResponse>("/dashboard/organization/billing/recharge", "POST", payload, token);
      if (res) {
        setPrepaidBalance(res.prepaid_balance);
        triggerSuccess(`Prepaid balance topped up by $${rechargeAmount}.`);
        setRechargeModalOpen(false);
        // refresh invoices
        const billingRes = await apiFetch<BillingResponse>("/dashboard/organization/billing", "GET", undefined, token);
        if (billingRes && billingRes.invoices) {
          setInvoices(billingRes.invoices);
        }
      } else {
        triggerError("Billing transaction rejected by processor.");
      }
    } catch {
      triggerError("Connection failed to payment gateway.");
    } finally {
      setRecharging(false);
    }
  };

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    triggerSuccess("API key copied to clipboard.");
  };

  if (loadingAll) {
    return (
      <div className="h-96 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#0b1931]" />
        <p className="text-xs font-semibold text-slate-500">Loading your settings…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Title Header */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-slate-950 tracking-tight">Settings</h2>
        <p className="text-xs text-slate-500 font-semibold">Manage general preferences, business profile, auto follow-up, notifications, and billing.</p>
      </div>

      {/* Settings Double-column Layout */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left submenu navigation (1/4 width) */}
        <nav className="w-full lg:w-48 bg-transparent flex flex-row lg:flex-col gap-1 select-none flex-wrap">
          {[
            { id: "general", label: "General", icon: Sliders },
            { id: "profile", label: "Business Profile", icon: Building2 },
            { id: "followup", label: "Auto Follow-up", icon: Send },
            { id: "notifications", label: "Notifications", icon: Bell },
            { id: "billing", label: "Billing", icon: Coins },
          ].map((sub) => {
            const active = activeSettingsTab === sub.id;
            const Icon = sub.icon;
            return (
              <button
                key={sub.id}
                onClick={() => setActiveSettingsTab(sub.id)}
                className={`px-4 py-2.5 text-xs font-bold text-left rounded-lg transition-all cursor-pointer flex items-center space-x-2 w-full ${active
                  ? "bg-[#e8ebf2] text-slate-950 font-bold shadow-2xs"
                  : "text-slate-550 hover:bg-slate-100 hover:text-slate-900"
                  }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? "text-slate-950" : "text-slate-400"}`} />
                <span>{sub.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right active Settings Form (3/4 width) */}
        <div className="flex-1 w-full space-y-6">
          
          {/* GENERAL TELEPHONY SETTINGS TAB */}
          {activeSettingsTab === "general" && (
            <form onSubmit={handleSaveGeneral} className="space-y-6">
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-6">
                <div className="space-y-1 pb-4 border-b border-slate-100 select-none">
                  <h4 className="text-sm font-bold text-slate-950">General Preferences</h4>
                  <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                    Core workspace defaults — call capacity, recording policy and answering-machine handling for every campaign.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Concurrency channel slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] text-slate-550 font-extrabold uppercase tracking-wider">Concurrent Call Channels</label>
                      <span className="h-6 px-2.5 bg-blue-50 border border-blue-200 rounded-md flex items-center text-[11px] font-bold text-blue-700 select-none">
                        {concurrencyLimit} Channels
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold">Maximum concurrent calls allowed to trigger at once under this workspace profile.</p>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={concurrencyLimit}
                      onChange={(e) => setConcurrencyLimit(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-150 rounded-lg appearance-none cursor-pointer accent-[#0b1931]"
                    />
                  </div>

                  {/* Data retention (general workspace policy) */}
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-550 font-extrabold uppercase tracking-wider block">Call-log Data Retention</label>
                    <p className="text-[10px] text-slate-400 font-semibold">How long call logs, recordings and transcripts are kept before automatic cleanup.</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={7}
                        max={365}
                        value={retentionDays}
                        onChange={(e) => setRetentionDays(Math.max(7, Math.min(365, parseInt(e.target.value) || 90)))}
                        className="w-28 h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-950 outline-none focus:border-blue-600 transition-all shadow-2xs"
                      />
                      <span className="text-[11px] font-bold text-slate-500">days</span>
                    </div>
                  </div>

                  {/* Call switches */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {/* Switch 1: Auto recording */}
                    <div className="p-4 border border-slate-150 rounded-xl flex items-start space-x-3 bg-slate-50/50 hover:bg-slate-50 transition-all select-none">
                      <input
                        type="checkbox"
                        id="recording_enabled"
                        checked={recordingEnabled}
                        onChange={(e) => setRecordingEnabled(e.target.checked)}
                        className="w-4 h-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5 cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <label htmlFor="recording_enabled" className="text-xs font-bold text-slate-800 cursor-pointer">Automatic Call Recording</label>
                        <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">Save raw dual-channel call audios. Essential for quality audits.</p>
                      </div>
                    </div>

                    {/* Switch 2: AMD (answering machine detection) */}
                    <div className="p-4 border border-slate-150 rounded-xl flex items-start space-x-3 bg-slate-50/50 hover:bg-slate-50 transition-all select-none">
                      <input
                        type="checkbox"
                        id="voicemail_detection"
                        checked={voicemailDetection}
                        onChange={(e) => setVoicemailDetection(e.target.checked)}
                        className="w-4 h-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5 cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <label htmlFor="voicemail_detection" className="text-xs font-bold text-slate-800 cursor-pointer">Answering Machine AMD</label>
                        <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">Detect voicemail sounds to instantly drop call and trigger secondary SMS.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  type="submit"
                  disabled={settingsSaving}
                  className="h-10 px-5 text-xs font-bold text-white bg-[#0b1931] hover:bg-slate-950 disabled:opacity-50 rounded-lg transition-all flex items-center space-x-2 cursor-pointer shadow-sm"
                >
                  {settingsSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* BUSINESS PROFILE TAB */}
          {activeSettingsTab === "profile" && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-6">
                <div className="space-y-1 pb-4 border-b border-slate-100 select-none">
                  <h4 className="text-sm font-bold text-slate-950">Business Profile</h4>
                  <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                    Manage your organization&apos;s public identity, dashboard timezone, and record compliance.
                  </p>
                </div>

                {/* Organization Logo container */}
                <div className="flex items-center space-x-5 select-none">
                  <div className="w-16 h-16 rounded-xl bg-slate-50 border border-dashed border-slate-350 flex flex-col items-center justify-center text-slate-400">
                    <FileUp className="w-5 h-5 mb-0.5 text-slate-450" />
                  </div>
                  <div className="space-y-2 text-left">
                    <h5 className="text-[10px] font-bold text-slate-550 uppercase">Organization Branding Logo</h5>
                    <p className="text-[9px] text-slate-450 font-semibold leading-relaxed max-w-[280px]">
                      SVG, PNG, or JPG. Max 2MB. Recommended 400×400px.
                    </p>
                    <div className="flex space-x-3 text-[10px] font-bold pt-0.5">
                      <button type="button" className="h-7 px-3 bg-white border border-slate-250 hover:bg-slate-50 rounded-lg text-slate-700 cursor-pointer">
                        Upload new
                      </button>
                      <button type="button" className="h-7 px-3 text-red-655 hover:bg-red-50 rounded-lg cursor-pointer">
                        Remove
                      </button>
                    </div>
                  </div>
                </div>

                {/* Form Input fields */}
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-slate-500 font-extrabold block mb-1.5 uppercase tracking-wider">Business Name</label>
                    <input
                      type="text"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-950 outline-none focus:border-blue-600 transition-all shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 font-extrabold block mb-1.5 uppercase tracking-wider">Primary timezone</label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-blue-600 transition-all cursor-pointer"
                    >
                      <option value="Coordinated Universal Time (UTC)">Coordinated Universal Time (UTC)</option>
                      <option value="Eastern Standard Time (EST)">Eastern Standard Time (EST)</option>
                      <option value="Pacific Standard Time (PST)">Pacific Standard Time (PST)</option>
                      <option value="Greenwich Mean Time (GMT)">Greenwich Mean Time (GMT)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Data Retention & Compliance card */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-6">
                <div className="space-y-1 pb-4 border-b border-slate-100 select-none">
                  <h4 className="text-sm font-bold text-slate-950">Data Retention & Archiving Policy</h4>
                  <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                    Configure how long voice recordings and logs are stored.
                  </p>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] text-slate-500 font-extrabold block mb-1 uppercase tracking-wider">Log Retention Period</label>
                  <div className="flex gap-4">
                    <select
                      value={retentionDays}
                      onChange={(e) => setRetentionDays(parseInt(e.target.value))}
                      className="w-48 h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-blue-600 cursor-pointer"
                    >
                      <option value="30">30 Days</option>
                      <option value="60">60 Days</option>
                      <option value="90">90 Days</option>
                      <option value="180">180 Days</option>
                      <option value="365">365 Days</option>
                    </select>
                    <div className="h-10 px-4 bg-slate-100 border border-slate-200 rounded-lg flex items-center text-[10px] font-bold text-slate-700 select-none">
                      Standard Enterprise Plan Policy
                    </div>
                  </div>

                  {/* Alert block */}
                  <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl flex items-start space-x-3 text-[10px] text-amber-800 font-semibold shadow-2xs leading-relaxed select-none">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      Note: Changing retention policies will apply to all future recordings. Existing logs older than the new period will be archived immediately.
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  type="submit"
                  disabled={settingsSaving}
                  className="h-10 px-5 text-xs font-bold text-white bg-[#0b1931] hover:bg-slate-950 disabled:opacity-50 rounded-lg transition-all flex items-center space-x-2 cursor-pointer shadow-sm"
                >
                  {settingsSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* AUTO FOLLOW-UP TAB */}
          {activeSettingsTab === "followup" && (
            <form onSubmit={handleSaveFollowup} className="space-y-6">
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-6">
                <div className="space-y-1 pb-4 border-b border-slate-100 select-none">
                  <h4 className="text-sm font-bold text-slate-950">Auto Follow-up on Interest</h4>
                  <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                    After a call, if the caller shows interest (at or above your threshold) <span className="font-bold">or</span> asks for details, these Company Details are automatically sent to their WhatsApp and email.
                  </p>
                </div>

                {/* Master toggle */}
                <div className="p-4 border border-slate-150 rounded-xl flex items-start space-x-3 bg-slate-50/50 select-none">
                  <input
                    type="checkbox"
                    id="auto_send_details"
                    checked={autoSendDetails}
                    onChange={(e) => setAutoSendDetails(e.target.checked)}
                    className="w-4 h-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5 cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <label htmlFor="auto_send_details" className="text-xs font-bold text-slate-800 cursor-pointer">Enable automatic follow-up</label>
                    <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">When off, details are never sent automatically (you can still send them manually from Call Logs).</p>
                  </div>
                </div>

                {/* Interest threshold slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-slate-550 font-extrabold uppercase tracking-wider">Interest Threshold</label>
                    <span className="h-6 px-2.5 bg-emerald-50 border border-emerald-200 rounded-md flex items-center text-[11px] font-bold text-emerald-700 select-none">
                      {autoSendThreshold}% and above
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold">A call whose measured interest reaches this level auto-triggers the follow-up. (Asking for details always triggers it, regardless of this value.)</p>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={autoSendThreshold}
                    onChange={(e) => setAutoSendThreshold(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-150 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                </div>

                {/* Company details textarea */}
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-550 font-extrabold uppercase tracking-wider block">Company Details to Send</label>
                  <p className="text-[10px] text-slate-400 font-semibold">The brochure / company information that gets delivered. Also given to the AI agent so it can reference it on the call. Plain text — one detail per line works best.</p>
                  <textarea
                    value={companyDetails}
                    onChange={(e) => setCompanyDetails(e.target.value)}
                    rows={9}
                    placeholder={"e.g.\nAcme Solar — rooftop solar installations\nStarter package: ₹1,20,000 (3kW), 5-year warranty\nFree site survey within 48 hours\nFinancing available (0% for 6 months)\nCall us: +91 98765 43210\nWebsite: https://acmesolar.example"}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-950 outline-none focus:border-blue-600 transition-all shadow-2xs placeholder-slate-400 leading-relaxed resize-y"
                  />
                </div>

                {/* Channel config hint */}
                <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-[10px] text-slate-600 font-semibold leading-relaxed space-y-1.5">
                    <p className="flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> <span><span className="font-bold">WhatsApp</span> goes to the caller&apos;s phone number (needs a WhatsApp sender configured on the server).</span></p>
                    <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-blue-600" /> <span><span className="font-bold">Email</span> is sent when the lead has an email on file (add it in the Leads tab), via the server&apos;s SMTP / Gmail setup.</span></p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  type="submit"
                  disabled={settingsSaving}
                  className="h-10 px-5 text-xs font-bold text-white bg-[#0b1931] hover:bg-slate-950 disabled:opacity-50 rounded-lg transition-all flex items-center space-x-2 cursor-pointer shadow-sm"
                >
                  {settingsSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Follow-up Settings</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeSettingsTab === "notifications" && (
            <form onSubmit={handleSaveNotifications} className="space-y-6">
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-6">
                <div className="space-y-1 pb-4 border-b border-slate-100 select-none">
                  <h4 className="text-sm font-bold text-slate-950">Alert Protocols & Routing</h4>
                  <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                    Receive immediate updates regarding calling campaigns, low balances, and developer logs.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Slack Alert */}
                  <div className="flex items-center justify-between p-4 border border-slate-150 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-all select-none">
                    <div className="space-y-0.5 text-left pr-4">
                      <span className="text-xs font-bold text-slate-800">Slack Webhook Alerts</span>
                      <p className="text-[10px] text-slate-550 font-semibold">Post a notification message to your team channel when campaigns finish executing.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifSlack(!notifSlack)}
                      className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 shrink-0 ${notifSlack ? "bg-emerald-500" : "bg-slate-300"}`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${notifSlack ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                  </div>

                  {/* Email Alert */}
                  <div className="flex items-center justify-between p-4 border border-slate-150 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-all select-none">
                    <div className="space-y-0.5 text-left pr-4">
                      <span className="text-xs font-bold text-slate-800">Email Notifications</span>
                      <p className="text-[10px] text-slate-550 font-semibold">Send daily logs, campaigns summaries, and system diagnostic alerts to your inbox.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifEmail(!notifEmail)}
                      className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 shrink-0 ${notifEmail ? "bg-emerald-500" : "bg-slate-300"}`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${notifEmail ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                  </div>

                  {/* Low Balance Alert */}
                  <div className="flex items-center justify-between p-4 border border-slate-150 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-all select-none">
                    <div className="space-y-0.5 text-left pr-4">
                      <span className="text-xs font-bold text-slate-800">Low Balance Warnings</span>
                      <p className="text-[10px] text-slate-550 font-semibold">Warn workspace administrators immediately if prepaid minutes balance drops below $25.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifLowBalance(!notifLowBalance)}
                      className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 shrink-0 ${notifLowBalance ? "bg-emerald-500" : "bg-slate-300"}`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${notifLowBalance ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                  </div>

                  {/* Weekly summarize reports */}
                  <div className="flex items-center justify-between p-4 border border-slate-150 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-all select-none">
                    <div className="space-y-0.5 text-left pr-4">
                      <span className="text-xs font-bold text-slate-800">Weekly Executive Report</span>
                      <p className="text-[10px] text-slate-550 font-semibold">Send a complete overview of calls metrics, sentiment scores, and conversion ratios every Monday morning.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifWeeklyReport(!notifWeeklyReport)}
                      className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 shrink-0 ${notifWeeklyReport ? "bg-emerald-500" : "bg-slate-300"}`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${notifWeeklyReport ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  type="submit"
                  disabled={settingsSaving}
                  className="h-10 px-5 text-xs font-bold text-white bg-[#0b1931] hover:bg-slate-950 disabled:opacity-50 rounded-lg transition-all flex items-center space-x-2 cursor-pointer shadow-sm"
                >
                  {settingsSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Rules...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          )}
          {/* BILLING TAB */}
          {activeSettingsTab === "billing" && (
            <div className="space-y-6 text-left">
              {/* Top balance card & quick recharge */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-stretch justify-between gap-6">
                <div className="space-y-3 flex-1">
                  <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">Prepaid Minute Balance</h4>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-4xl font-extrabold text-slate-950 tracking-tight">${prepaidBalance.toFixed(2)}</span>
                    <span className="text-xs font-bold text-slate-450">USD credits</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                    Charges automatically scale down at $0.08 / minute of outbound voice calls. Automatically locks calling outbound if balance reaches $0.00.
                  </p>
                </div>

                <div className="flex flex-col justify-center items-stretch md:items-end gap-3 select-none">
                  <button
                    type="button"
                    onClick={() => setRechargeModalOpen(true)}
                    className="h-10 px-5 text-xs font-bold text-white bg-[#0b1931] hover:bg-slate-950 rounded-lg flex items-center justify-center space-x-2 cursor-pointer shadow-sm transition-all"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Top Up Balance</span>
                  </button>
                  
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                    <span className="text-[10px] text-slate-500 font-bold">Active plan tier: <span className="uppercase text-[#0b1931]">{planTier}</span></span>
                  </div>
                </div>
              </div>

              {/* Price Tier Calculators */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-6 select-none">
                <div className="space-y-1 pb-4 border-b border-slate-100">
                  <h4 className="text-sm font-bold text-slate-950">Calling Rate Matrix & Tiers</h4>
                  <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                    Explore prepaid calling benefits across plan configurations.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Tier 1 */}
                  <div className={`p-4 border rounded-xl space-y-3 relative ${planTier === "free" ? "border-blue-300 bg-blue-50/20" : "border-slate-150"}`}>
                    {planTier === "free" && (
                      <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-blue-100 border border-blue-200 rounded text-[8px] font-extrabold text-blue-700 uppercase">Current</span>
                    )}
                    <h5 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Free Starter</h5>
                    <div className="flex items-baseline space-x-0.5">
                      <span className="text-xl font-bold text-slate-950">$0</span>
                      <span className="text-[10px] text-slate-400">/ month</span>
                    </div>
                    <ul className="space-y-1.5 text-[10px] text-slate-550 font-semibold">
                      <li className="flex items-center space-x-1.5">
                        <Check className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>$0.15/minute calling rate</span>
                      </li>
                      <li className="flex items-center space-x-1.5">
                        <Check className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Up to 2 active agents</span>
                      </li>
                      <li className="flex items-center space-x-1.5">
                        <Check className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Max 2 concurrent channels</span>
                      </li>
                    </ul>
                  </div>

                  {/* Tier 2 */}
                  <div className={`p-4 border rounded-xl space-y-3 relative ${planTier === "growth" ? "border-blue-300 bg-blue-50/20" : "border-slate-150"}`}>
                    {planTier === "growth" && (
                      <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-blue-100 border border-blue-200 rounded text-[8px] font-extrabold text-blue-700 uppercase">Current</span>
                    )}
                    <h5 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Growth Pro</h5>
                    <div className="flex items-baseline space-x-0.5">
                      <span className="text-xl font-bold text-slate-950">$149</span>
                      <span className="text-[10px] text-slate-400">/ month</span>
                    </div>
                    <ul className="space-y-1.5 text-[10px] text-slate-550 font-semibold">
                      <li className="flex items-center space-x-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>$0.08/minute calling rate</span>
                      </li>
                      <li className="flex items-center space-x-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>Unlimited active agents</span>
                      </li>
                      <li className="flex items-center space-x-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>Up to 10 concurrent channels</span>
                      </li>
                    </ul>
                  </div>

                  {/* Tier 3 */}
                  <div className={`p-4 border rounded-xl space-y-3 relative ${planTier === "enterprise" ? "border-blue-300 bg-blue-50/20" : "border-slate-150"}`}>
                    {planTier === "enterprise" && (
                      <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-blue-100 border border-blue-200 rounded text-[8px] font-extrabold text-blue-700 uppercase">Current</span>
                    )}
                    <h5 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Enterprise Scale</h5>
                    <div className="flex items-baseline space-x-0.5">
                      <span className="text-xl font-bold text-slate-950">$499</span>
                      <span className="text-[10px] text-slate-400">/ month</span>
                    </div>
                    <ul className="space-y-1.5 text-[10px] text-slate-550 font-semibold">
                      <li className="flex items-center space-x-1.5">
                        <Check className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>$0.05/minute calling rate</span>
                      </li>
                      <li className="flex items-center space-x-1.5">
                        <Check className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Dedicated calling servers</span>
                      </li>
                      <li className="flex items-center space-x-1.5">
                        <Check className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Custom SIP trunk routing</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Invoice History logs */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-6">
                <div className="space-y-1 pb-4 border-b border-slate-100">
                  <h4 className="text-sm font-bold text-slate-950">Invoices & Statements History</h4>
                  <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                    View and export detailed invoices for balance topups and monthly plan fees.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  {invoices.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs font-bold">No historical invoices loaded under this profile.</div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 select-none text-[9px] text-slate-450 uppercase font-extrabold">
                          <th className="py-2.5 font-bold">Invoice ID</th>
                          <th className="py-2.5 font-bold">Billing Date</th>
                          <th className="py-2.5 font-bold">Amount</th>
                          <th className="py-2.5 font-bold">Status</th>
                          <th className="py-2.5 font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-[11px] font-semibold text-slate-700">
                        {invoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-50/40 transition-colors">
                            <td className="py-3 text-slate-900 font-bold">{inv.invoice_number}</td>
                            <td className="py-3 text-slate-550">{inv.created_at}</td>
                            <td className="py-3 text-slate-900 font-extrabold">${parseFloat(String(inv.amount)).toFixed(2)}</td>
                            <td className="py-3">
                              <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-150 rounded text-[9px] font-bold text-emerald-700 capitalize">
                                {inv.status}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <button
                                type="button"
                                onClick={() => triggerSuccess("Downloading invoice PDF copy...")}
                                className="inline-flex items-center space-x-1 text-[10px] font-extrabold text-blue-650 hover:text-blue-800 transition-colors cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>PDF Download</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* RECHARGE PREPAID BALANCE MICRO-MODAL DRAWER */}
              {rechargeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 select-none">
                  <div className="w-full max-w-md bg-white border border-slate-250 rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between max-h-[85vh] animate-scale-up text-left">
                    <div className="bg-slate-50 h-14 px-6 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CreditCard className="w-4 h-4 text-slate-600" />
                        <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Top Up Prepaid Credits</h4>
                      </div>
                      <button
                        onClick={() => setRechargeModalOpen(false)}
                        className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="p-6 space-y-5">
                      <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                        Specify top-up credits. Funds instantly apply to this workspace. Transaction handles securely via default corporate billing method.
                      </p>

                      <div className="grid grid-cols-4 gap-2 pt-1">
                        {[25, 50, 100, 250].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setRechargeAmount(amt)}
                            className={`h-10 rounded-lg border text-xs font-extrabold transition-all cursor-pointer ${rechargeAmount === amt
                              ? "bg-slate-950 text-white border-slate-950 shadow-xs"
                              : "bg-white text-slate-650 border-slate-200 hover:bg-slate-50"
                              }`}
                          >
                            ${amt}
                          </button>
                        ))}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-550 font-extrabold uppercase tracking-wider block">Or Custom USD Amount</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-450">$</span>
                          <input
                            type="number"
                            min="10"
                            max="5000"
                            value={rechargeAmount}
                            onChange={(e) => setRechargeAmount(parseFloat(e.target.value) || 0)}
                            className="w-full h-10 pl-7 pr-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-none focus:border-blue-600 shadow-2xs"
                          />
                        </div>
                        <span className="text-[9px] text-slate-450 font-semibold block">Minimum deposit is $10.00. Maximum deposit is $5,000.00.</span>
                      </div>
                    </div>

                    <div className="h-16 px-6 bg-slate-50 border-t border-slate-150 flex items-center justify-end space-x-3">
                      <button
                        onClick={() => setRechargeModalOpen(false)}
                        className="h-9 px-4 text-xs font-bold text-slate-600 bg-white border border-slate-250 hover:bg-slate-50 rounded-lg cursor-pointer transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleRecharge}
                        disabled={recharging || rechargeAmount <= 0}
                        className="h-9 px-4 text-xs font-bold text-white bg-slate-950 hover:bg-slate-900 rounded-lg flex items-center space-x-2 cursor-pointer shadow-sm transition-all disabled:opacity-50"
                      >
                        {recharging ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Processing...</span>
                          </>
                        ) : (
                          <span>Recharge Now</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
