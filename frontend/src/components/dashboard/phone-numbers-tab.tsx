"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus, Search, Loader2, X, Check, CreditCard, Globe,
  Lock, Shield, ArrowRight, HelpCircle, PhoneCall, Phone,
  User, ChevronDown, Sparkles, ArrowLeft, CheckCircle2
} from "lucide-react";
import { apiFetch } from "src/lib/api";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from "@stripe/react-stripe-js";

// Initialize Stripe with the publishable key from env
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);

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

interface PhoneNumbersTabProps {
  phoneNumbers: PhoneNumber[];
  token: string;
  fetchAllData: (silent?: boolean) => Promise<void>;
  triggerSuccess: (msg: string) => void;
  triggerError: (msg: string) => void;
}

const buyNumbersSeeds = [
  { number: "+1 (310) 904-2834", region: "Los Angeles, CA", country: "USA", type: "LOCAL", cost: 2.00 },
  { number: "+1 (415) 305-1827", region: "San Francisco, CA", country: "USA", type: "LOCAL", cost: 2.00 },
  { number: "+1 (212) 805-4921", region: "New York, NY", country: "USA", type: "LOCAL", cost: 2.00 },
  { number: "+1 (800) 923-4011", region: "Toll-Free (USA)", country: "USA", type: "TOLL-FREE", cost: 15.00 },
  { number: "+44 20 7946 0812", region: "London, UK", country: "United Kingdom", type: "LOCAL", cost: 4.50 },
  { number: "+91 22 4891-3400", region: "Mumbai, India", country: "India", type: "LOCAL", cost: 3.00 },
  { number: "+1 (617) 700-1200", region: "Boston, MA", country: "USA", type: "LOCAL", cost: 2.00 },
];

const countryFlag = (country: string) => {
  if (country === "USA") return "🇺🇸";
  if (country === "United Kingdom") return "🇬🇧";
  if (country === "India") return "🇮🇳";
  return "🌐";
};

// ── Stripe Card Form sub-component (must live inside <Elements>) ──────────────
interface StripePayFormProps {
  selectedNumber: typeof buyNumbersSeeds[0];
  token: string;
  onBack: () => void;
  onSuccess: (paymentIntentId: string, cardName: string) => void;
  onError: (msg: string) => void;
}

const StripePayForm: React.FC<StripePayFormProps> = ({
  selectedNumber, token, onBack, onSuccess, onError
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [cardName, setCardName] = useState("");
  const [processing, setProcessing] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    if (!cardName.trim()) { setCardError("Please enter the cardholder name."); return; }
    const cardEl = elements.getElement(CardElement);
    if (!cardEl) return;

    setProcessing(true);
    setCardError(null);

    try {
      // Step 1: Create PaymentIntent on backend
      const intentRes = await apiFetch<{ client_secret?: string; payment_intent_id: string; mode?: string }>("/dashboard/phone-numbers/create-payment-intent", "POST", {
        amount_cents: Math.round(selectedNumber.cost * 100),  // Convert $ to cents
        currency: "usd",
        phone_number: selectedNumber.number,
        region: selectedNumber.region
      }, token);

      if (!intentRes?.client_secret) {
        throw new Error("Failed to create payment intent. Please try again.");
      }

      const { client_secret, payment_intent_id, mode } = intentRes;

      // Step 2: Confirm card payment with Stripe.js
      if (mode === "test_mock") {
        // No real Stripe key configured — skip real card confirmation, just provision
        onSuccess(payment_intent_id, cardName);
        return;
      }

      const { error, paymentIntent } = await stripe.confirmCardPayment(client_secret, {
        payment_method: {
          card: cardEl,
          billing_details: { name: cardName }
        }
      });

      if (error) {
        setCardError(error.message || "Payment failed. Please check your card details.");
        return;
      }

      if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "processing") {
        onSuccess(paymentIntent.id, cardName);
      } else {
        setCardError("Payment not confirmed. Please try again.");
      }

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Payment failed. Please try again.";
      onError(message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Order Summary */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Order Summary</span>
          <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center space-x-1">
            <Shield className="w-3 h-3" /><span>Stripe Secured</span>
          </span>
        </div>
        <div className="flex justify-between items-center pt-1">
          <div>
            <span className="text-sm font-extrabold text-slate-950 font-mono block">{selectedNumber.number}</span>
            <span className="text-[9px] text-slate-400">{countryFlag(selectedNumber.country)} {selectedNumber.region} · {selectedNumber.type}</span>
          </div>
          <span className="text-base font-black text-slate-900">${selectedNumber.cost.toFixed(2)}<span className="text-[9px] text-slate-400 font-normal">/mo</span></span>
        </div>
      </div>

      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Payment Details</span>

      {/* Cardholder Name */}
      <div>
        <label className="text-[9px] text-slate-500 font-bold block mb-1">CARDHOLDER NAME</label>
        <input
          type="text"
          required
          value={cardName}
          onChange={(e) => setCardName(e.target.value)}
          placeholder="e.g. Yash Parmar"
          className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 outline-none focus:border-[#0b1931] shadow-sm"
        />
      </div>

      {/* Stripe CardElement — real secure card input */}
      <div>
        <label className="text-[9px] text-slate-500 font-bold block mb-1">CARD DETAILS</label>
        <div className="relative">
          <div className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm focus-within:border-[#0b1931] transition-colors">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: "13px",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    color: "#0f172a",
                    fontWeight: "600",
                    "::placeholder": { color: "#94a3b8" },
                    iconColor: "#64748b",
                  },
                  invalid: { color: "#ef4444", iconColor: "#ef4444" },
                },
                hidePostalCode: true,
              }}
            />
          </div>
          <div className="absolute right-3 top-2.5 flex items-center space-x-1">
            {/* Card brand icons */}
            <span className="text-[10px] text-slate-400 font-bold">VISA</span>
            <span className="text-slate-300">·</span>
            <span className="text-[10px] text-slate-400 font-bold">MC</span>
          </div>
        </div>
        {cardError && (
          <p className="text-[10px] text-red-500 font-semibold mt-1.5 flex items-center space-x-1">
            <span>⚠</span><span>{cardError}</span>
          </p>
        )}
      </div>

      {/* Test card hint */}
      <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
        <p className="text-[9px] text-blue-700 font-bold uppercase tracking-wider">Test Mode</p>
        <p className="text-[9px] text-blue-600 font-semibold mt-0.5">
          Use test card: <span className="font-mono">4242 4242 4242 4242</span> · Any future date · Any 3-digit CVC
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="h-10 px-4 border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-600 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /><span>Back</span>
        </button>
        <button
          type="submit"
          disabled={processing || !stripe}
          className="flex-1 h-10 bg-[#0b1931] hover:bg-slate-950 disabled:opacity-60 text-xs font-bold text-white rounded-lg transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-md"
        >
          {processing ? (
            <><Loader2 className="w-4 h-4 animate-spin" /><span>Processing Payment...</span></>
          ) : (
            <><Lock className="w-3.5 h-3.5" /><span>Complete Purchase — ${selectedNumber.cost.toFixed(2)}/mo</span></>
          )}
        </button>
      </div>

      <p className="text-center text-[9px] text-slate-400 font-semibold flex items-center justify-center space-x-1">
        <Lock className="w-2.5 h-2.5" />
        <span>Payments processed securely by Stripe. Your card details never touch our servers.</span>
      </p>
    </form>
  );
};

// ── Main Tab Component ──────────────────────────────────────────────────────
export const PhoneNumbersTab: React.FC<PhoneNumbersTabProps> = ({
  phoneNumbers,
  token,
  fetchAllData,
  triggerSuccess,
  triggerError,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"ALL" | "OUTBOUND" | "INBOUND">("ALL");
  const [drawerTab, setDrawerTab] = useState<"buy" | "sip">("buy");

  // Synchronize searchQuery with URL parameter "search"
  React.useEffect(() => {
    const syncSearch = () => {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const q = params.get("search") || "";
        setSearchQuery(q);
      }
    };
    syncSearch();
    const interval = setInterval(syncSearch, 400);
    return () => clearInterval(interval);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (val) {
        params.set("search", val);
      } else {
        params.delete("search");
      }
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, "", newUrl);
    }
  };

  // Buy number multi-step flow
  type BuyStep = "select" | "pay" | "assign" | "success";
  const [buyStep, setBuyStep] = useState<BuyStep>("select");
  const [selectedBuyNumber, setSelectedBuyNumber] = useState(buyNumbersSeeds[0]);
  const [transactionId, setTransactionId] = useState("");
  const [purchasedPhoneId, setPurchasedPhoneId] = useState<number | null>(null);
  const [, setPaidCardName] = useState("");

  // Assign step
  const [assignAgentName, setAssignAgentName] = useState("Unassigned");
  const [assignDirection, setAssignDirection] = useState<"INBOUND" | "OUTBOUND">("INBOUND");
  const [availableAgents, setAvailableAgents] = useState<{ id: number; name: string }[]>([]);
  const [assigning, setAssigning] = useState(false);

  // SIP trunk fields
  const [sipDirection, setSipDirection] = useState<"Outbound" | "Inbound">("Outbound");
  const [sipPhoneNumber, setSipPhoneNumber] = useState("");
  const [sipDestination, setSipDestination] = useState("USA");
  const [sipTerminationUri, setSipTerminationUri] = useState("");
  const [sipCpsLimit, setSipCpsLimit] = useState(2);
  const [sipUsername, setSipUsername] = useState("");
  const [sipPassword, setSipPassword] = useState("");
  const [sipNickname, setSipNickname] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Quick-assign existing number modal
  const [assignModalPhone, setAssignModalPhone] = useState<PhoneNumber | null>(null);
  const [quickAssignAgent, setQuickAssignAgent] = useState("Unassigned");
  const [quickAssignDir, setQuickAssignDir] = useState("INBOUND");
  const [quickAssignSaving, setQuickAssignSaving] = useState(false);

  useEffect(() => {
    if (token) {
      apiFetch("/dashboard/agents", "GET", undefined, token)
        .then((data) => {
          if (Array.isArray(data)) {
            setAvailableAgents(data.map((a: { id: string; name: string }) => ({ id: parseInt(a.id, 10), name: a.name })));
            if (data.length > 0) setAssignAgentName(data[0].name);
          }
        })
        .catch(() => { });
    }
  }, [token]);

  const resetBuyFlow = useCallback(() => {
    setBuyStep("select");
    setTransactionId("");
    setPurchasedPhoneId(null);
    setPaidCardName("");
    setAssignAgentName(availableAgents.length > 0 ? availableAgents[0].name : "Unassigned");
    setAssignDirection("INBOUND");
  }, [availableAgents]);

  // Called by StripePayForm after payment is confirmed
  const handlePaymentSuccess = useCallback(async (paymentIntentId: string, cardName: string) => {
    setTransactionId(paymentIntentId);
    setPaidCardName(cardName);

    // Provision the phone number after payment confirmation
    try {
      const res = await apiFetch<{ status: string; phone_number?: { id: number } }>("/dashboard/phone-numbers/purchase", "POST", {
        phone_number: selectedBuyNumber.number,
        region: selectedBuyNumber.region,
        country: selectedBuyNumber.country,
        type: selectedBuyNumber.type,
        monthly_cost: selectedBuyNumber.cost,
        direction: "INBOUND",
        assigned_agent_name: "Unassigned",
        payment_intent_id: paymentIntentId,
        card_name: cardName
      }, token);

      if (res?.status === "success") {
        setPurchasedPhoneId(res.phone_number?.id || null);
        setBuyStep("assign");
      } else {
        triggerError("Failed to provision number after payment.");
        setBuyStep("select");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to provision number after payment.";
      triggerError(message);
    }
  }, [selectedBuyNumber, token, triggerError]);

  const handleAssignAfterPurchase = async () => {
    if (!purchasedPhoneId) { setBuyStep("success"); fetchAllData(true); return; }
    setAssigning(true);
    try {
      await apiFetch(`/dashboard/phone-numbers/${purchasedPhoneId}/assign`, "PUT", {
        assigned_agent_name: assignAgentName,
        direction: assignDirection
      }, token);
      setBuyStep("success");
      fetchAllData(true);
    } catch {
      setBuyStep("success");
      fetchAllData(true);
    } finally {
      setAssigning(false);
    }
  };

  const handleSipPhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sipPhoneNumber) { triggerError("Please enter a valid phone number."); return; }
    setSubmitting(true);
    try {
      const res = await apiFetch("/dashboard/phone-numbers", "POST", {
        phone_number: sipPhoneNumber,
        label: sipNickname || "Custom SIP Trunk",
        country: sipDestination === "United Kingdom" ? "United Kingdom" : sipDestination === "India" ? "India" : "USA",
        type: "LOCAL",
        assigned_agent: "Unassigned",
        monthly_cost: 0.00,
        direction: sipDirection.toUpperCase(),
        destination_region: sipDestination,
        termination_uri: sipTerminationUri,
        cps_limit: sipCpsLimit,
        sip_username: sipUsername,
        sip_password: sipPassword,
        nickname: sipNickname
      }, token);
      if (res) {
        triggerSuccess(`SIP Trunk "${sipPhoneNumber}" successfully linked!`);
        setSipPhoneNumber(""); setSipTerminationUri(""); setSipUsername(""); setSipPassword(""); setSipNickname("");
        setDrawerOpen(false);
        fetchAllData(true);
      }
    } catch {
      triggerError("Failed to link SIP trunk line.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickAssign = async () => {
    if (!assignModalPhone) return;
    setQuickAssignSaving(true);
    try {
      await apiFetch(`/dashboard/phone-numbers/${assignModalPhone.id}/assign`, "PUT", {
        assigned_agent_name: quickAssignAgent,
        direction: quickAssignDir
      }, token);
      triggerSuccess(`${assignModalPhone.phone_number} assigned to ${quickAssignAgent}.`);
      setAssignModalPhone(null);
      fetchAllData(true);
    } catch {
      triggerError("Failed to reassign number.");
    } finally {
      setQuickAssignSaving(false);
    }
  };

  const filteredNumbers = phoneNumbers.filter((p) => {
    const matchesSearch =
      p.phone_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.assigned_agent.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.country.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filterTab === "ALL") return true;
    return (p.direction || "OUTBOUND").toUpperCase() === filterTab;
  });

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-950 tracking-tight">Phone Numbers</h2>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Manage your global voice presence — inbound, outbound, and SIP trunks.
          </p>
        </div>
        <button
          onClick={() => { resetBuyFlow(); setDrawerTab("buy"); setDrawerOpen(true); }}
          className="h-9 px-4 bg-[#0b1931] hover:bg-slate-950 text-xs font-bold text-white rounded-lg transition-all flex items-center justify-center space-x-1.5 shadow-sm active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Get New Number</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-sm">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Active Numbers</span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-extrabold text-slate-950 font-mono">{phoneNumbers.length}</span>
            <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">+2 this month</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-sm">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Inbound Lines</span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-extrabold text-slate-950 font-mono">
              {phoneNumbers.filter(p => (p.direction || "").toUpperCase() === "INBOUND").length}
            </span>
            <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">INBOUND</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-sm">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Outbound Lines</span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-extrabold text-slate-950 font-mono">
              {phoneNumbers.filter(p => (p.direction || "OUTBOUND").toUpperCase() === "OUTBOUND").length}
            </span>
            <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">OUTBOUND</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-sm">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Carrier Status</span>
          <div className="flex items-center space-x-2 mt-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-xs font-bold text-slate-900">99.9% Uptime</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
        <div className="h-14 px-6 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="relative flex items-center w-full max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3" />
            <input
              type="text"
              placeholder="Search numbers, agents..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg pl-9 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-blue-600 transition-all"
            />
          </div>
          <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold border border-slate-200 shrink-0">
            {(["ALL", "INBOUND", "OUTBOUND"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`px-3 py-1.5 rounded-md transition-all ${filterTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                {tab === "ALL" ? "All Numbers" : tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-semibold text-slate-700">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-4 pl-6">NUMBER</th>
                <th className="p-4">COUNTRY</th>
                <th className="p-4">DIRECTION</th>
                <th className="p-4">TYPE</th>
                <th className="p-4">ASSIGNED AGENT</th>
                <th className="p-4">CALLS TODAY</th>
                <th className="p-4">MONTHLY COST</th>
                <th className="p-4">STATUS</th>
                <th className="p-4 pr-6 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredNumbers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center">
                    <Phone className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                    <p className="text-xs text-slate-400 font-semibold">No phone numbers found.</p>
                    <button
                      onClick={() => { resetBuyFlow(); setDrawerOpen(true); }}
                      className="mt-3 text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      Get your first number →
                    </button>
                  </td>
                </tr>
              ) : (
                filteredNumbers.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/40 transition-all">
                    <td className="p-4 pl-6">
                      <div className="flex items-center space-x-2">
                        <PhoneCall className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-slate-950 font-extrabold font-mono">{p.phone_number}</span>
                      </div>
                      {p.nickname && <span className="text-[9px] text-slate-400 font-normal block pl-5">{p.nickname}</span>}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-sm">{countryFlag(p.country)}</span>
                        <span className="text-slate-600">{p.country}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider ${(p.direction || "OUTBOUND").toUpperCase() === "INBOUND"
                        ? "text-purple-800 bg-purple-50 border border-purple-200"
                        : "text-blue-800 bg-blue-50 border border-blue-200"
                        }`}>
                        {p.direction || "OUTBOUND"}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider ${p.type === "TOLL-FREE"
                        ? "text-amber-800 bg-amber-50 border border-amber-200"
                        : "text-slate-700 bg-slate-50 border border-slate-200"
                        }`}>
                        {p.type}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 rounded-full bg-[#0b1931] flex items-center justify-center text-[9px] font-bold text-white uppercase select-none">
                          {(p.assigned_agent || "U").substring(0, 1)}
                        </div>
                        <span className="text-slate-900 font-bold">{p.assigned_agent}</span>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-slate-600">{p.calls_today.toLocaleString()}</td>
                    <td className="p-4 font-mono text-slate-900 font-bold">${p.monthly_cost.toFixed(2)}<span className="text-slate-400 font-normal text-[9px]">/mo</span></td>
                    <td className="p-4">
                      <span className="flex items-center space-x-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${p.status.toLowerCase() === "active" ? "bg-emerald-500" : "bg-slate-400"}`} />
                        <span className="text-slate-800">{p.status}</span>
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <button
                        onClick={() => {
                          setAssignModalPhone(p);
                          setQuickAssignAgent(p.assigned_agent || "Unassigned");
                          setQuickAssignDir((p.direction || "OUTBOUND").toUpperCase());
                        }}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      >
                        Assign
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="h-14 px-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 select-none">
          <span>Showing {filteredNumbers.length} of {phoneNumbers.length} numbers</span>
          <div className="flex items-center space-x-4">
            <button className="h-8 px-3 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg font-bold transition-all disabled:opacity-50" disabled>Previous</button>
            <button className="h-8 px-3 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg font-bold transition-all disabled:opacity-50" disabled>Next</button>
          </div>
        </div>
      </div>

      {/* ===== GET NEW NUMBER MODAL ===== */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 select-none animate-fade-in">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl flex flex-col animate-scale-up text-left max-h-[92vh] overflow-y-auto">

            {/* Modal Header */}
            <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  {drawerTab === "buy" ? "Buy a Phone Number" : "Bring Your Own Number (SIP)"}
                </h3>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  {drawerTab === "buy"
                    ? "Purchase a real DID number and assign it to your organization."
                    : "Connect your SIP trunk to route calls through Voqly."}
                </p>
              </div>
              <button
                onClick={() => { setDrawerOpen(false); resetBuyFlow(); }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer mt-0.5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Switch */}
            <div className="px-6 pt-4">
              <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold border border-slate-200">
                <button
                  type="button"
                  onClick={() => { setDrawerTab("buy"); resetBuyFlow(); }}
                  className={`flex-1 py-1.5 rounded-md transition-all flex items-center justify-center space-x-1.5 ${drawerTab === "buy" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-800"}`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Buy A Number</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerTab("sip")}
                  className={`flex-1 py-1.5 rounded-md transition-all flex items-center justify-center space-x-1.5 ${drawerTab === "sip" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-800"}`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Bring Your Own (SIP)</span>
                </button>
              </div>
            </div>

            {/* ===== BUY NUMBER FLOW ===== */}
            {drawerTab === "buy" && (
              <div className="p-6 pt-4">
                {/* STEP 1: SELECT NUMBER */}
                {buyStep === "select" && (
                  <div className="space-y-4">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Available Numbers</span>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {buyNumbersSeeds.map((seed, idx) => (
                        <label
                          key={idx}
                          onClick={() => setSelectedBuyNumber(seed)}
                          className={`flex items-center justify-between p-3.5 border rounded-xl cursor-pointer transition-all ${selectedBuyNumber.number === seed.number ? "border-[#0b1931] bg-slate-50 shadow-sm" : "border-slate-200 hover:bg-slate-50/60"}`}
                        >
                          <div className="flex items-center space-x-3">
                            <input
                              type="radio"
                              name="buyNumber"
                              checked={selectedBuyNumber.number === seed.number}
                              onChange={() => setSelectedBuyNumber(seed)}
                              className="accent-[#0b1931] h-3.5 w-3.5"
                            />
                            <div>
                              <span className="text-xs font-extrabold text-slate-950 block font-mono">{seed.number}</span>
                              <span className="text-[9px] text-slate-400 block font-semibold mt-0.5">
                                {countryFlag(seed.country)} {seed.region}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider ${seed.type === "TOLL-FREE" ? "text-amber-800 bg-amber-50 border border-amber-200" : "text-blue-700 bg-blue-50 border border-blue-100"}`}>{seed.type}</span>
                            <span className="text-sm font-black text-slate-900 block mt-1">${seed.cost.toFixed(2)}<span className="text-[9px] text-slate-400 font-normal">/mo</span></span>
                          </div>
                        </label>
                      ))}
                    </div>
                    <div className="pt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold block">Selected Number</span>
                        <span className="text-xs font-extrabold text-slate-900 font-mono">{selectedBuyNumber.number}</span>
                      </div>
                      <span className="text-base font-black text-[#0b1931]">${selectedBuyNumber.cost.toFixed(2)}<span className="text-xs font-normal text-slate-400">/mo</span></span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBuyStep("pay")}
                      className="w-full h-10 bg-[#0b1931] hover:bg-slate-950 text-xs font-extrabold text-white rounded-lg transition-all flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer"
                    >
                      <span>Proceed to Payment</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* STEP 2: STRIPE PAYMENT */}
                {buyStep === "pay" && (
                  <Elements stripe={stripePromise}>
                    <StripePayForm
                      selectedNumber={selectedBuyNumber}
                      token={token}
                      onBack={() => setBuyStep("select")}
                      onSuccess={handlePaymentSuccess}
                      onError={triggerError}
                    />
                  </Elements>
                )}

                {/* STEP 3: ASSIGN TO AGENT */}
                {buyStep === "assign" && (
                  <div className="space-y-5">
                    <div className="flex items-center space-x-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <span className="text-xs font-extrabold text-emerald-800 block">Payment Successful!</span>
                        <span className="text-[10px] text-emerald-600 font-medium font-mono">{transactionId.slice(0, 24)}... · {selectedBuyNumber.number}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-3">Assign to Your Organization</span>
                      <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
                        Now assign this number to an AI agent and configure its direction. You can change this at any time.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-[9px] text-slate-500 font-bold block mb-1.5">ASSIGN TO AGENT</label>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <select
                            value={assignAgentName}
                            onChange={(e) => setAssignAgentName(e.target.value)}
                            className="w-full h-9 pl-9 pr-8 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-[#0b1931] cursor-pointer appearance-none"
                          >
                            <option value="Unassigned">Unassigned</option>
                            {availableAgents.map((a) => (
                              <option key={a.id} value={a.name}>{a.name}</option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] text-slate-500 font-bold block mb-1.5">NUMBER DIRECTION</label>
                        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] font-bold">
                          {(["INBOUND", "OUTBOUND"] as const).map((dir) => (
                            <button
                              key={dir}
                              type="button"
                              onClick={() => setAssignDirection(dir)}
                              className={`flex-1 py-2 rounded-md transition-all flex items-center justify-center space-x-1.5 ${assignDirection === dir ? `bg-white shadow-sm border ${dir === "INBOUND" ? "text-purple-800 border-purple-100" : "text-blue-800 border-blue-100"}` : "text-slate-500 hover:text-slate-800"}`}
                            >
                              <span>{dir === "INBOUND" ? "📞" : "📤"}</span>
                              <span>{dir.charAt(0) + dir.slice(1).toLowerCase()}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleAssignAfterPurchase}
                      disabled={assigning}
                      className="w-full h-10 bg-[#0b1931] hover:bg-slate-950 disabled:opacity-60 text-xs font-extrabold text-white rounded-lg transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-sm"
                    >
                      {assigning ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /><span>Assigning...</span></>
                      ) : (
                        <><Sparkles className="w-4 h-4" /><span>Assign & Activate Number</span></>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setBuyStep("success"); fetchAllData(true); }}
                      className="w-full text-center text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      Skip assignment — assign later
                    </button>
                  </div>
                )}

                {/* STEP 4: SUCCESS */}
                {buyStep === "success" && (
                  <div className="flex flex-col items-center py-8 text-center space-y-5">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-lg font-extrabold text-slate-900">Number Provisioned!</h4>
                      <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
                        <span className="font-extrabold text-slate-800 font-mono">{selectedBuyNumber.number}</span> is now live in your workspace and assigned to <span className="font-bold text-[#0b1931]">{assignAgentName}</span>.
                      </p>
                    </div>
                    <div className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-left">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400 font-semibold">Stripe Payment ID</span>
                        <span className="font-mono font-bold text-slate-800 text-[10px]">{transactionId.slice(0, 24)}...</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400 font-semibold">Monthly Cost</span>
                        <span className="font-bold text-slate-800">${selectedBuyNumber.cost.toFixed(2)}/mo</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400 font-semibold">Direction</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider ${assignDirection === "INBOUND" ? "text-purple-800 bg-purple-50 border border-purple-200" : "text-blue-800 bg-blue-50 border border-blue-200"}`}>{assignDirection}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400 font-semibold">Status</span>
                        <span className="flex items-center space-x-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span className="font-bold text-emerald-700">Active</span></span>
                      </div>
                    </div>
                    <button
                      onClick={() => { setDrawerOpen(false); resetBuyFlow(); }}
                      className="w-full h-10 bg-[#0b1931] hover:bg-slate-950 text-xs font-bold text-white rounded-lg transition-all cursor-pointer shadow-sm"
                    >
                      Done — Back to Phone Numbers
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ===== SIP TRUNK FLOW ===== */}
            {drawerTab === "sip" && (
              <form onSubmit={handleSipPhoneSubmit} className="p-6 pt-4 space-y-4">
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] font-bold max-w-xs">
                  {(["Outbound", "Inbound"] as const).map((dir) => (
                    <button key={dir} type="button" onClick={() => setSipDirection(dir)}
                      className={`flex-1 py-1 px-3 rounded-md transition-all text-center ${sipDirection === dir ? "bg-white text-slate-900 shadow-sm border border-slate-200/50" : "text-slate-400 hover:text-slate-700"}`}>
                      {dir}
                    </button>
                  ))}
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-900 flex items-center space-x-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-blue-500" /><span>Not sure how this works?</span>
                  </span>
                  <p className="text-[9px] text-slate-400 leading-relaxed">
                    These tutorials explain everything step by step from setting up a SIP trunk to finding credentials.
                  </p>
                  <div className="flex items-center space-x-2 pt-0.5 text-[9px] font-bold text-blue-600">
                    {["Twilio", "Plivo", "Telnyx", "Wavix"].map((name) => (
                      <React.Fragment key={name}>
                        <span className="underline cursor-pointer hover:text-blue-800">{name}</span>
                        <span className="text-slate-300 last:hidden">•</span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold block mb-1">PHONE NUMBER</label>
                      <input type="text" required placeholder="+1234567890" value={sipPhoneNumber} onChange={(e) => setSipPhoneNumber(e.target.value)}
                        className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 outline-none focus:border-[#0b1931] shadow-sm font-mono" />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold block mb-1">DESTINATION</label>
                      <select value={sipDestination} onChange={(e) => setSipDestination(e.target.value)}
                        className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none cursor-pointer">
                        <option value="USA">USA 🇺🇸</option>
                        <option value="United Kingdom">United Kingdom 🇬🇧</option>
                        <option value="India">India 🇮🇳</option>
                        <option value="Europe">Europe 🇪🇺</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold block mb-1">TERMINATION URI</label>
                      <input type="text" placeholder="sip.example.com" value={sipTerminationUri} onChange={(e) => setSipTerminationUri(e.target.value)}
                        className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 outline-none focus:border-[#0b1931] shadow-sm font-mono" />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold block mb-1">CPS LIMIT</label>
                      <input type="number" min={1} max={10} value={sipCpsLimit} onChange={(e) => setSipCpsLimit(parseInt(e.target.value))}
                        className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-none focus:border-[#0b1931] shadow-sm font-mono" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold block mb-1">SIP USERNAME</label>
                      <input type="text" placeholder="username" value={sipUsername} onChange={(e) => setSipUsername(e.target.value)}
                        className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 outline-none focus:border-[#0b1931] shadow-sm" />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold block mb-1">SIP PASSWORD</label>
                      <input type="password" placeholder="••••••••" value={sipPassword} onChange={(e) => setSipPassword(e.target.value)}
                        className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-none focus:border-[#0b1931] shadow-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-500 font-bold block mb-1">NICKNAME</label>
                    <input type="text" placeholder="e.g. Sales Line" value={sipNickname} onChange={(e) => setSipNickname(e.target.value)}
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 outline-none focus:border-[#0b1931] shadow-sm" />
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between gap-3 border-t border-slate-100">
                  <span className="text-[9px] text-slate-400 font-bold">Transport: TCP</span>
                  <div className="flex items-center space-x-3">
                    <button type="button" onClick={() => setDrawerOpen(false)}
                      className="h-9 px-4 border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-600 rounded-lg transition-all cursor-pointer">
                      Cancel
                    </button>
                    <button type="submit" disabled={submitting}
                      className="h-9 px-4 bg-[#0b1931] hover:bg-slate-950 disabled:opacity-60 text-xs font-bold text-white rounded-lg transition-all flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer">
                      {submitting ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Saving...</span></>
                      ) : (
                        <span>Save {sipDirection} Number</span>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ===== QUICK ASSIGN MODAL ===== */}
      {assignModalPhone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-5 animate-scale-up text-left">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">Assign Number</h4>
                <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{assignModalPhone.phone_number}</p>
              </div>
              <button onClick={() => setAssignModalPhone(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[9px] text-slate-500 font-bold block mb-1.5">ASSIGN TO AGENT</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <select value={quickAssignAgent} onChange={(e) => setQuickAssignAgent(e.target.value)}
                    className="w-full h-9 pl-9 pr-8 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-[#0b1931] cursor-pointer appearance-none">
                    <option value="Unassigned">Unassigned</option>
                    {availableAgents.map((a) => (
                      <option key={a.id} value={a.name}>{a.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-[9px] text-slate-500 font-bold block mb-1.5">DIRECTION</label>
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] font-bold">
                  {["INBOUND", "OUTBOUND"].map((dir) => (
                    <button key={dir} type="button" onClick={() => setQuickAssignDir(dir)}
                      className={`flex-1 py-1.5 rounded-md transition-all ${quickAssignDir === dir ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-700"}`}>
                      {dir.charAt(0) + dir.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button onClick={() => setAssignModalPhone(null)}
                className="flex-1 h-9 border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-600 rounded-lg transition-all cursor-pointer">
                Cancel
              </button>
              <button onClick={handleQuickAssign} disabled={quickAssignSaving}
                className="flex-1 h-9 bg-[#0b1931] hover:bg-slate-950 disabled:opacity-60 text-xs font-bold text-white rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm">
                {quickAssignSaving ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Saving...</span></>
                ) : (
                  <><Check className="w-3.5 h-3.5" /><span>Confirm Assignment</span></>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
