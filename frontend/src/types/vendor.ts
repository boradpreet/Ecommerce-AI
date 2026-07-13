export interface Vendor {
  id: number;
  name: string;
  email?: string;
  status: string;
  active_agents: number;
  monthly_spend: number;
  platform_margin: number;
  plan?: string;
  plan_status?: string;
  renewal_date?: string;
  prepaid_balance?: number;
  created_at?: string;
}

export interface VendorAgent {
  id: number;
  name: string;
  voice_provider: string;
  lang: string;
  status: string;
  created_at: string;
}

export interface VendorPhoneNumber {
  id: number;
  phone_number: string;
  country: string;
  type: string;
  status: string;
  assigned_agent: string;
  monthly_cost: number;
}

export interface VendorInvoice {
  id: number;
  invoice_number: string;
  amount: number;
  status: string;
  created_at: string;
  payment_gateway: string;
  pdf_url: string;
}

export interface VendorDetail {
  id: number;
  name: string;
  slug: string;
  email: string;
  owner_name: string;
  industry: string;
  website_url: string;
  company_size: string;
  status: string;
  created_at: string;
  plan: string;
  plan_tier: string;
  plan_status: string;
  renewal_date: string;
  prepaid_balance: number;
  concurrency_limit: number;
  total_revenue: number;
  active_agents: number;
  agents: VendorAgent[];
  phone_numbers_count: number;
  phone_numbers: VendorPhoneNumber[];
  team_members: number;
  invoices: VendorInvoice[];
  telephony_provider?: string;
  twilio_number?: string;
  plivo_number?: string;
}
