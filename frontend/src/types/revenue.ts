export interface MrrPoint {
  month: string;
  value: number;
}

export interface Transaction {
  id: string;
  vendor: string;
  date: string;
  amount: number;
  status: string;
  plan?: string;
  renewal_date?: string;
  payment_method?: string;
}

export interface RevenueData {
  mrr: number;
  churn_rate: number;
  avg_revenue: number;
  outstanding_invoices: number;
  outstanding_count?: number;
  total_vendors?: number;
  growth_chart: MrrPoint[];
  transactions: Transaction[];
}
