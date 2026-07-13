import { AiProvider, RoutingRule, LiveHealth } from "src/types/ai";
import { apiFetch } from "src/lib/api";

export async function fetchAiProviders(token: string): Promise<AiProvider[]> {
  try {
    const res = await apiFetch<AiProvider[]>("/superadmin/ai-providers", "GET", undefined, token);
    return Array.isArray(res) ? res : [];
  } catch (err) {
    console.warn("fetchAiProviders offline/error:", err);
    return [];
  }
}

export async function fetchRoutingRules(token: string): Promise<RoutingRule[]> {
  try {
    const res = await apiFetch<RoutingRule[]>("/superadmin/routing-rules", "GET", undefined, token);
    return Array.isArray(res) ? res : [];
  } catch (err) {
    console.warn("fetchRoutingRules offline/error:", err);
    return [];
  }
}

export async function fetchLiveHealth(token: string): Promise<LiveHealth> {
  try {
    return await apiFetch<LiveHealth>("/superadmin/live-health", "GET", undefined, token);
  } catch (err) {
    console.warn("fetchLiveHealth offline/error:", err);
    return {
      total_tokens_24h: "0",
      peak_consumption: "0 t/sec",
      chart_data: []
    };
  }
}
