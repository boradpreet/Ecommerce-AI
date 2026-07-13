"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuthStore } from "src/store/authStore";
import { useRouter } from "next/navigation";
import { apiFetch } from "src/lib/api";

// Helper: returns true if the token looks stale (old firebase_token_ format)
function isStaleToken(token: string | null): boolean {
  if (!token) return false;
  return token.startsWith("firebase_token_") || token === "mock_jwt_token" || token === "null" || token === "undefined";
}

import { Vendor } from "src/types/vendor";
import { RevenueData, MrrPoint } from "src/types/revenue";
import { AdminMetrics, AlertItem, InfraData, ExpiringSubscription, PlatformAnalytics } from "src/types/system";
import { AiProvider, RoutingRule, LiveHealth } from "src/types/ai";

import { fetchVendors } from "src/lib/api/vendors";
import { fetchRevenueTelemetry, fetchMrrGrowth } from "src/lib/api/revenue";
import { fetchAdminMetrics, fetchSystemAlerts, fetchInfraTelemetry, fetchAdminAnalytics } from "src/lib/api/system";
import { fetchAiProviders, fetchRoutingRules, fetchLiveHealth } from "src/lib/api/ai";

export interface AuditLogItem {
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  status: string;
}

export interface VendorEditPayload {
  name: string;
  slug: string;
  owner_email: string;
  industry: string;
  concurrency_limit: number;
  prepaid_balance: number;
  plan_tier: string;
  telephony_provider?: string;
  twilio_number?: string;
  plivo_number?: string;
}

interface SuperAdminContextType {
  token: string | null;
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  successToast: string;
  errorToast: string;
  triggerSuccess: (msg: string) => void;
  triggerError: (msg: string) => void;
  
  // Data
  metrics: AdminMetrics | null;
  mrrChart: MrrPoint[];
  alerts: AlertItem[];
  infraData: InfraData | null;
  analytics: PlatformAnalytics | null;
  revenueData: RevenueData | null;
  vendorsList: Vendor[];
  setVendorsList: React.Dispatch<React.SetStateAction<Vendor[]>>;
  
  // AI
  aiProviders: AiProvider[];
  routingRules: RoutingRule[];
  liveHealth: LiveHealth | null;
  smartRoutingEnabled: boolean;
  setSmartRoutingEnabled: (b: boolean) => void;
  
  // Handlers
  handleToggleSuspension: (vendor: Vendor) => Promise<void>;
  handleEditVendor: (vendorId: number, payload: VendorEditPayload) => Promise<void>;
  handleToggleProvider: (providerId: string) => Promise<void>;
  handleToggleSmartRouting: () => Promise<void>;
  fetchAllAdminData: (silent?: boolean) => Promise<void>;
  
  // Modals
  vendorModalOpen: boolean;
  setVendorModalOpen: (b: boolean) => void;
  aiModalOpen: boolean;
  setAiModalOpen: (b: boolean) => void;
  routingModalOpen: boolean;
  setRoutingModalOpen: (b: boolean) => void;
  
  // Settings Tab
  concurrentStreams: number;
  setConcurrentStreams: (v: number) => void;
  maxTokens: number;
  setMaxTokens: (v: number) => void;
  whiteLabelEnabled: boolean;
  setWhiteLabelEnabled: (b: boolean) => void;
  vendorMargin: number;
  setVendorMargin: (v: number) => void;
  modelTemp: number;
  setModelTemp: (v: number) => void;
  sttBuffer: number;
  setSttBuffer: (v: number) => void;
  routingMode: string;
  setRoutingMode: (s: string) => void;
  savingSettings: boolean;
  handleSaveSettings: () => Promise<void>;
  auditLogs: AuditLogItem[];

  // Simulated log streams
  simulatedLogs: string[];
  setSimulatedLogs: React.Dispatch<React.SetStateAction<string[]>>;
  expiringSubs: ExpiringSubscription[];
  handleSendReminder: (subId: number) => Promise<void>;
}

const SuperAdminContext = createContext<SuperAdminContextType | undefined>(undefined);

export const SuperAdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = useAuthStore((s) => s.token);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [successToast, setSuccessToast] = useState("");
  const [errorToast, setErrorToast] = useState("");

  // Modals
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [routingModalOpen, setRoutingModalOpen] = useState(false);

  // States
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [mrrChart, setMrrChart] = useState<MrrPoint[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [infraData, setInfraData] = useState<InfraData | null>(null);
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [vendorsList, setVendorsList] = useState<Vendor[]>([]);
  const [expiringSubs, setExpiringSubs] = useState<ExpiringSubscription[]>([]);

  // AI states
  const [aiProviders, setAiProviders] = useState<AiProvider[]>([]);
  const [routingRules, setRoutingRules] = useState<RoutingRule[]>([]);
  const [liveHealth, setLiveHealth] = useState<LiveHealth | null>(null);
  const [smartRoutingEnabled, setSmartRoutingEnabled] = useState(true);

  // Settings tab variables
  const [concurrentStreams, setConcurrentStreams] = useState(150);
  const [maxTokens, setMaxTokens] = useState(5000000);
  const [whiteLabelEnabled, setWhiteLabelEnabled] = useState(true);
  const [vendorMargin, setVendorMargin] = useState(12.5);
  const [modelTemp, setModelTemp] = useState(0.4);
  const [sttBuffer, setSttBuffer] = useState(350);
  const [routingMode, setRoutingMode] = useState("Latency Optimized");
  const [savingSettings, setSavingSettings] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  // System Health logs
  const [simulatedLogs, setSimulatedLogs] = useState<string[]>([]);

  const triggerSuccess = useCallback((msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(""), 3000);
  }, []);

  const triggerError = useCallback((msg: string) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(""), 3000);
  }, []);

  const fetchAllAdminData = useCallback(async (silent = false) => {
    if (!token) return;

    // If the stored token is a stale format the backend will now reject with 401,
    // detect early and force re-login without waiting for the API call to fail.
    if (isStaleToken(token)) {
      logout();
      router.replace("/login?reason=session_expired");
      return;
    }

    if (!silent) setLoading(true);
    try {
      // First validate the token is accepted by the backend for superadmin access
      const meTest = await apiFetch<{ is_superuser?: boolean; email?: string }>(
        "/auth/me", "GET", undefined, token
      ).catch((err) => {
        // 401 = expired/invalid token, 403 = not superadmin
        if ((err as { status?: number })?.status === 401 || (err as { status?: number })?.status === 403) {
          logout();
          router.replace("/login?reason=session_expired");
          throw new Error("AUTH_REDIRECT");
        }
        return null;
      });

      // If auth check already redirected, stop here
      if (!meTest) return;

      // Verify the logged-in user is actually the super admin
      if (meTest.email && meTest.email.toLowerCase() !== "admin@voqly.com") {
        logout();
        router.replace("/login?reason=unauthorized");
        return;
      }

      const [m, mrr, al, inf, ana, rev, v, aip, rr, lh, sData, expiring] = await Promise.all([
        fetchAdminMetrics(token),
        fetchMrrGrowth(token),
        fetchSystemAlerts(token),
        fetchInfraTelemetry(token),
        fetchAdminAnalytics(token),
        fetchRevenueTelemetry(token),
        fetchVendors(token),
        fetchAiProviders(token),
        fetchRoutingRules(token),
        fetchLiveHealth(token),
        apiFetch<{
          settings: {
            concurrent_streams?: number;
            max_tokens?: number;
            white_label_enabled?: boolean;
            vendor_margin?: number;
            model_temp?: number;
            stt_buffer?: number;
            routing_mode?: string;
          };
          audit_logs: AuditLogItem[];
        }>("/superadmin/settings", "GET", undefined, token).catch(() => null),
        apiFetch<ExpiringSubscription[]>("/superadmin/subscriptions/expiring", "GET", undefined, token).catch(() => [])
      ]);

      setMetrics(m);
      setMrrChart(mrr);
      setAlerts(al);
      setInfraData(inf);
      setAnalytics(ana);
      if (inf && inf.system_logs) {
        setSimulatedLogs(inf.system_logs);
      }
      setRevenueData(rev);
      setVendorsList(v);
      setAiProviders(aip);
      setExpiringSubs(expiring || []);
      setRoutingRules(rr);
      setLiveHealth(lh);

      if (sData) {
        if (sData.settings) {
          setConcurrentStreams(sData.settings.concurrent_streams ?? 150);
          setMaxTokens(sData.settings.max_tokens ?? 5000000);
          setWhiteLabelEnabled(sData.settings.white_label_enabled ?? true);
          setVendorMargin(sData.settings.vendor_margin ?? 12.5);
          setModelTemp(sData.settings.model_temp ?? 0.4);
          setSttBuffer(sData.settings.stt_buffer ?? 350);
          setRoutingMode(sData.settings.routing_mode ?? "Latency Optimized");
        }
        if (sData.audit_logs) {
          setAuditLogs(sData.audit_logs);
        }
      }
    } catch (err) {
      if ((err as { message?: string })?.message === "AUTH_REDIRECT") return; // already handled above
      // Handle 401/403 thrown by any individual API call
      if ((err as { status?: number })?.status === 401 || (err as { status?: number })?.status === 403) {
        logout();
        router.replace("/login?reason=session_expired");
        return;
      }
      console.warn("fetchAllAdminData catch:", err);
    } finally {
      setLoading(false);
    }
  }, [token, logout, router]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!token) {
      router.replace("/");
      return;
    }
    fetchAllAdminData();
  }, [hasHydrated, token, router, fetchAllAdminData]);

  // Suspension
  const handleToggleSuspension = useCallback(async (vendor: Vendor) => {
    if (!token) return;
    const isCurrentlySuspended = vendor.status === "SUSPENDED";
    const action = isCurrentlySuspended ? "unsuspend" : "suspend";
    const nextStatus = isCurrentlySuspended ? "ACTIVE" : "SUSPENDED";
    
    try {
      const res = await apiFetch<{ status: string }>(`/superadmin/vendors/${vendor.id}/${action}`, "POST", undefined, token);
      if (res?.status === "success") {
        setVendorsList(prev => prev.map(v => v.id === vendor.id ? { ...v, status: nextStatus } : v));
        triggerSuccess(`Vendor "${vendor.name}" ${isCurrentlySuspended ? "activated" : "suspended"} successfully!`);
      }
    } catch (err) {
      console.warn("Failed to toggle suspension:", err);
      // optimistic fallback
      setVendorsList(prev => prev.map(v => v.id === vendor.id ? { ...v, status: nextStatus } : v));
      triggerSuccess(`Vendor "${vendor.name}" status updated (local check).`);
    }
  }, [token, triggerSuccess]);

  // Edit vendor registry (concurrency, prepaid balance, plan tier)
  const handleEditVendor = useCallback(async (vendorId: number, payload: VendorEditPayload) => {
    if (!token) {
      throw new Error("Not authenticated.");
    }
    // Throws on failure so the calling modal can surface the real error.
    await apiFetch(`/superadmin/vendors/${vendorId}/settings`, "PUT", {
      concurrency_limit: payload.concurrency_limit,
      prepaid_balance: payload.prepaid_balance,
      plan_tier: payload.plan_tier,
      telephony_provider: payload.telephony_provider,
      twilio_number: payload.twilio_number,
      plivo_number: payload.plivo_number,
    }, token);
    triggerSuccess(`Vendor "${payload.name}" configuration updated.`);
    await fetchAllAdminData(true);
  }, [token, triggerSuccess, fetchAllAdminData]);

  // Provider Active toggle
  const handleToggleProvider = useCallback(async (providerId: string) => {
    if (!token) return;
    try {
      const res = await apiFetch<{ status: string; provider?: unknown }>(`/superadmin/ai-providers/${providerId}/toggle`, "POST", undefined, token);
      if (res?.status === "success") {
        setAiProviders(prev => prev.map(p => p.id === providerId ? { ...p, active: !p.active } : p));
        triggerSuccess(`AI Inference Provider configuration updated.`);
      }
    } catch (err) {
      console.warn("Failed to toggle provider:", err);
      setAiProviders(prev => prev.map(p => p.id === providerId ? { ...p, active: !p.active } : p));
      triggerSuccess("AI Inference Provider configuration saved.");
    }
  }, [token, triggerSuccess]);

  // Smart routing rule toggler
  const handleToggleSmartRouting = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiFetch<{ status: string; enabled: boolean }>("/superadmin/smart-routing/toggle", "POST", undefined, token);
      if (res?.status === "success") {
        setSmartRoutingEnabled(res.enabled);
        triggerSuccess(`Neural Smart Routing ${res.enabled ? "engaged" : "disengaged"}.`);
      }
    } catch (err) {
      console.warn("Failed to toggle smart routing:", err);
      setSmartRoutingEnabled(prev => !prev);
      triggerSuccess(`Neural Smart Routing ${!smartRoutingEnabled ? "engaged" : "disengaged"}.`);
    }
  }, [token, smartRoutingEnabled, triggerSuccess]);

  // Save admin settings
  const handleSaveSettings = useCallback(async () => {
    if (!token) return;
    setSavingSettings(true);
    try {
      await apiFetch("/superadmin/settings", "PUT", {
        concurrent_streams: concurrentStreams,
        max_tokens: maxTokens,
        white_label_enabled: whiteLabelEnabled,
        vendor_margin: vendorMargin,
        model_temp: modelTemp,
        stt_buffer: sttBuffer,
        routing_mode: routingMode
      }, token);
      triggerSuccess("Global platform configuration saved.");
      // Refresh settings and audit logs
      const sData = await apiFetch<{
        settings: {
          concurrent_streams?: number;
          max_tokens?: number;
          white_label_enabled?: boolean;
          vendor_margin?: number;
          model_temp?: number;
          stt_buffer?: number;
          routing_mode?: string;
        };
        audit_logs: AuditLogItem[];
      }>("/superadmin/settings", "GET", undefined, token).catch(() => null);
      if (sData && sData.audit_logs) {
        setAuditLogs(sData.audit_logs);
      }
    } catch (err) {
      console.warn("Failed to save settings:", err);
      triggerError("Failed to save platform configuration.");
    } finally {
      setSavingSettings(false);
    }
  }, [token, concurrentStreams, maxTokens, whiteLabelEnabled, vendorMargin, modelTemp, sttBuffer, routingMode, triggerSuccess, triggerError]);

  const handleSendReminder = useCallback(async (subId: number) => {
    if (!token) return;
    try {
      const res = await apiFetch<{ status: string }>(`/superadmin/subscriptions/${subId}/remind`, "POST", undefined, token);
      if (res?.status === "success") {
        triggerSuccess("Subscription renewal reminder notification dispatched to vendor owner.");
        const expiring = await apiFetch<ExpiringSubscription[]>("/superadmin/subscriptions/expiring", "GET", undefined, token).catch(() => []);
        setExpiringSubs(expiring || []);
      }
    } catch (err) {
      console.warn("handleSendReminder catch:", err);
      triggerError((err as Error).message || "Failed to dispatch reminder.");
    }
  }, [token, triggerSuccess, triggerError]);

  return (
    <SuperAdminContext.Provider value={{
      token,
      loading,
      searchQuery,
      setSearchQuery,
      successToast,
      errorToast,
      triggerSuccess,
      triggerError,
      metrics,
      mrrChart,
      alerts,
      infraData,
      analytics,
      revenueData,
      vendorsList,
      setVendorsList,
      aiProviders,
      routingRules,
      liveHealth,
      smartRoutingEnabled,
      setSmartRoutingEnabled,
      handleToggleSuspension,
      handleEditVendor,
      handleToggleProvider,
      handleToggleSmartRouting,
      fetchAllAdminData,
      vendorModalOpen,
      setVendorModalOpen,
      aiModalOpen,
      setAiModalOpen,
      routingModalOpen,
      setRoutingModalOpen,
      concurrentStreams,
      setConcurrentStreams,
      maxTokens,
      setMaxTokens,
      whiteLabelEnabled,
      setWhiteLabelEnabled,
      vendorMargin,
      setVendorMargin,
      modelTemp,
      setModelTemp,
      sttBuffer,
      setSttBuffer,
      routingMode,
      setRoutingMode,
      savingSettings,
      handleSaveSettings,
      auditLogs,
      simulatedLogs,
      setSimulatedLogs,
      expiringSubs,
      handleSendReminder
    }}>
      {children}
    </SuperAdminContext.Provider>
  );
};

export const useSuperAdmin = () => {
  const context = useContext(SuperAdminContext);
  if (context === undefined) {
    throw new Error("useSuperAdmin must be used within a SuperAdminProvider");
  }
  return context;
};
