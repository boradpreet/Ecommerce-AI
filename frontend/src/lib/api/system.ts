import { AdminMetrics, AlertItem, InfraData, PlatformAnalytics } from "src/types/system";
import { apiFetch } from "src/lib/api";

export async function fetchAdminAnalytics(token: string): Promise<PlatformAnalytics | null> {
  try {
    return await apiFetch<PlatformAnalytics>("/superadmin/analytics", "GET", undefined, token);
  } catch (err) {
    console.warn("fetchAdminAnalytics offline/error:", err);
    return null;
  }
}

export async function fetchAdminMetrics(token: string): Promise<AdminMetrics> {
  try {
    return await apiFetch<AdminMetrics>("/superadmin/metrics", "GET", undefined, token);
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 401 || status === 403) throw err;
    console.warn("fetchAdminMetrics offline/error:", err);
    return {
      total_tenants: 0,
      total_agents: 0,
      total_tenants_growth: "+0%",
      total_tenants_sub: "0 active database tenants",
      live_calls: 0,
      live_calls_progress: 0,
      revenue_mtd: 0,
      revenue_mtd_growth: "+0%",
      revenue_mtd_sub: "MTD Invoiced Revenue",
      system_uptime: 100,
      system_uptime_sub: "Avg DB response: 0ms"
    };
  }
}

export async function fetchSystemAlerts(token: string): Promise<AlertItem[]> {
  try {
    const res = await apiFetch<AlertItem[]>("/superadmin/alerts", "GET", undefined, token);
    return Array.isArray(res) ? res : [];
  } catch (err) {
    console.warn("fetchSystemAlerts offline/error:", err);
    return [];
  }
}

export async function fetchInfraTelemetry(token: string): Promise<InfraData> {
  try {
    return await apiFetch<InfraData>("/superadmin/infra-health", "GET", undefined, token);
  } catch (err) {
    console.warn("fetchInfraTelemetry offline/error:", err);
    return {
      services: [],
      system_logs: [],
      incident: {
        id: "INC-NONE",
        title: "All Systems Operational",
        description: "No active incidents reported.",
        error_trace: "Nominal",
        status: "Resolved",
        detected: "N/A",
        timeline: [],
        updates: []
      }
    };
  }
}
