"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "src/store/authStore";
import { useRouter } from "next/navigation";
import { PhoneNumbersTab } from "src/components/dashboard/phone-numbers-tab";
import { apiFetch } from "src/lib/api";
import { Loader2 } from "lucide-react";

interface PhoneNumber {
  id: number;
  phone_number: string;
  country: string;
  type: string;
  assigned_agent: string;
  calls_today: number;
  monthly_cost: number;
  status: string;
  provision_type?: string;
  direction?: string;
  destination_region?: string;
  termination_uri?: string;
  cps_limit?: number;
  sip_username?: string;
  sip_password?: string;
  nickname?: string;
}

const MOCK_PHONE_NUMBERS: PhoneNumber[] = [
  {
    id: 1,
    phone_number: "+1 (555) 012-3456",
    country: "USA",
    type: "LOCAL",
    assigned_agent: "Support Agent A",
    calls_today: 342,
    monthly_cost: 2.00,
    status: "Active",
    provision_type: "Twilio SIP",
    direction: "OUTBOUND",
    destination_region: "USA",
    termination_uri: "",
    cps_limit: 2,
    sip_username: "",
    sip_password: "",
    nickname: "",
  },
  {
    id: 2,
    phone_number: "+1 (800) 456-7890",
    country: "USA",
    type: "TOLL-FREE",
    assigned_agent: "V-Sales Lead",
    calls_today: 1021,
    monthly_cost: 15.00,
    status: "Active",
    provision_type: "Twilio SIP",
    direction: "INBOUND",
    destination_region: "USA",
    termination_uri: "",
    cps_limit: 2,
    sip_username: "",
    sip_password: "",
    nickname: "",
  },
  {
    id: 3,
    phone_number: "+44 20 7946 0958",
    country: "United Kingdom",
    type: "LOCAL",
    assigned_agent: "Unassigned",
    calls_today: 0,
    monthly_cost: 4.50,
    status: "Pending",
    provision_type: "Twilio SIP",
    direction: "OUTBOUND",
    destination_region: "United Kingdom",
    termination_uri: "",
    cps_limit: 2,
    sip_username: "",
    sip_password: "",
    nickname: "",
  },
];

export default function DashboardPhoneNumbersPage() {
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const router = useRouter();
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchPhoneNumbers = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    try {
      const data = await apiFetch<PhoneNumber[]>("/dashboard/phone-numbers", "GET", undefined, token);
      setPhoneNumbers(Array.isArray(data) ? data : MOCK_PHONE_NUMBERS);
    } catch {
      // Backend offline — use mock data
      setPhoneNumbers(MOCK_PHONE_NUMBERS);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!token) {
      router.replace("/");
      return;
    }
    fetchPhoneNumbers();
  }, [hasHydrated, router, token, fetchPhoneNumbers]);

  if (!hasHydrated || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Loading phone resources…
      </div>
    );
  }

  return (
    <>
      {/* Global toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-[9999] flex items-center space-x-2.5 px-5 py-3 rounded-xl shadow-xl text-xs font-bold text-white transition-all ${
            toast.type === "success" ? "bg-slate-900" : "bg-red-600"
          }`}
        >
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] shrink-0 ${
              toast.type === "success" ? "bg-emerald-500" : "bg-red-400"
            }`}
          >
            {toast.type === "success" ? "✓" : "✕"}
          </span>
          <span>{toast.msg}</span>
        </div>
      )}

      {loading ? (
        <div className="min-h-[60vh] flex items-center justify-center text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mr-3" />
          Loading phone numbers...
        </div>
      ) : (
        <PhoneNumbersTab
          phoneNumbers={phoneNumbers}
          token={token}
          fetchAllData={fetchPhoneNumbers}
          triggerSuccess={(msg) => showToast(msg, "success")}
          triggerError={(msg) => showToast(msg, "error")}
        />
      )}
    </>
  );
}
