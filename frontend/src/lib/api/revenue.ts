import { RevenueData, MrrPoint } from "src/types/revenue";
import { apiFetch } from "src/lib/api";

export async function fetchRevenueTelemetry(token: string): Promise<RevenueData> {
  try {
    return await apiFetch<RevenueData>("/superadmin/revenue", "GET", undefined, token);
  } catch (err) {
    console.warn("fetchRevenueTelemetry offline/error:", err);
    return {
      mrr: 0,
      churn_rate: 0,
      avg_revenue: 0,
      outstanding_invoices: 0,
      outstanding_count: 0,
      total_vendors: 0,
      growth_chart: [],
      transactions: []
    };
  }
}

export async function fetchMrrGrowth(token: string): Promise<MrrPoint[]> {
  try {
    const res = await apiFetch<MrrPoint[]>("/superadmin/mrr-growth", "GET", undefined, token);
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
}
