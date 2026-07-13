export interface AiProvider {
  id: string;
  name: string;
  models: string;
  latency: number;
  uptime: number;
  cost_per_1k: number;
  active: boolean;
  icon: string;
}

export interface RoutingRule {
  id: number;
  use_case: string;
  primary_model: string;
  fallback_model: string;
  status: string;
}

export interface LiveHealth {
  total_tokens_24h: string;
  peak_consumption: string;
  chart_data: { label: string; value: number }[];
}
