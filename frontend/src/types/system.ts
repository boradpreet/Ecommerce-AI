export interface AdminMetrics {
  total_tenants: number;
  total_agents: number;
  total_tenants_growth: string;
  total_tenants_sub: string;
  live_calls: number;
  live_calls_progress: number;
  revenue_mtd: number;
  revenue_mtd_growth: string;
  revenue_mtd_sub: string;
  system_uptime: number;
  system_uptime_sub?: string;
}

export interface AlertItem {
  id: number;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  actor: string;
}

export interface InfraService {
  id: string;
  name: string;
  status: string;
  uptime: string;
  latency: string;
  detail?: string;
}

export interface IncidentTimelineItem {
  time: string;
  text: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  error_trace: string;
  status: string;
  detected: string;
  severity?: string;
  timeline: IncidentTimelineItem[];
  updates: string[];
}

export interface InfraData {
  services: InfraService[];
  system_logs: string[];
  incident: Incident;
}

export interface PlatformAnalytics {
  totals: {
    agents: number;
    campaigns: number;
    leads: number;
    calls: number;
    minutes: number;
    completed_calls: number;
    connect_rate: number;
  };
  outcomes: Array<{ status: string; count: number }>;
  sentiment: { POSITIVE: number; NEUTRAL: number; NEGATIVE: number };
  calls_trend: Array<{ day: string; date: string; calls: number }>;
  top_vendors: Array<{ id: number; name: string; calls: number; minutes: number; agents: number }>;
}

export interface ExpiringSubscription {
  sub_id: number;
  vendor_id: number;
  vendor_name: string;
  owner_email: string;
  plan_tier: string;
  renewal_date: string;
  days_left: number;
}
