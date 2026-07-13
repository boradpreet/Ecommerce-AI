"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "src/store/authStore";
import { apiFetch } from "src/lib/api";
import {
  CreditCard, CheckCircle2, Zap, Star, Crown, Loader2,
  Download, AlertCircle, X, Shield, ArrowRight, RefreshCw,
  TrendingUp, Building2, PhoneCall, Users, Check,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

interface BillingInfo {
  prepaid_balance: number;
  plan_tier: string;
  subscription_status: string;
  current_period_end: string;
  invoices: {
    id: number;
    invoice_number: string;
    amount: number;
    status: string;
    created_at: string;
    pdf_url: string;
  }[];
}

interface Plan {
  id: string;
  label: string;
  price: number;
  priceInr: number;
  description: string;
  icon: React.ElementType;
  color: string;
  gradient: string;
  features: string[];
  limits: { agents: string; calls: string; minutes: string };
  badge?: string;
}

// ─── Plan definitions ──────────────────────────────────────────────────────

const PLANS: Plan[] = [
  {
    id: "starter",
    label: "Starter",
    price: 99,
    priceInr: 8200,
    description: "Perfect for small teams getting started with AI voice",
    icon: Zap,
    color: "text-emerald-600",
    gradient: "from-emerald-50 to-teal-50",
    features: [
      "2 AI Voice Agents",
      "1,000 calls / month",
      "Basic analytics",
      "Email support",
      "Twilio SIP integration",
      "5 campaign slots",
    ],
    limits: { agents: "2 agents", calls: "1k calls/mo", minutes: "500 min/mo" },
  },
  {
    id: "growth",
    label: "Growth",
    price: 499,
    priceInr: 41500,
    description: "Ideal for growing businesses scaling their voice ops",
    icon: TrendingUp,
    color: "text-blue-600",
    gradient: "from-blue-50 to-indigo-50",
    badge: "Most Popular",
    features: [
      "10 AI Voice Agents",
      "10,000 calls / month",
      "Advanced analytics",
      "Priority support",
      "HubSpot & CRM integrations",
      "Unlimited campaigns",
      "Call recording & transcripts",
      "Webhook support",
    ],
    limits: { agents: "10 agents", calls: "10k calls/mo", minutes: "5k min/mo" },
  },
  {
    id: "professional",
    label: "Professional",
    price: 999,
    priceInr: 83200,
    description: "Enterprise-grade power with full customization",
    icon: Crown,
    color: "text-purple-600",
    gradient: "from-purple-50 to-violet-50",
    features: [
      "Unlimited AI Voice Agents",
      "100,000 calls / month",
      "Full analytics suite",
      "Dedicated account manager",
      "All CRM integrations",
      "White-label support",
      "Custom SIP trunking",
      "SLA guarantee",
      "On-prem deployment option",
    ],
    limits: { agents: "Unlimited", calls: "100k calls/mo", minutes: "50k min/mo" },
  },
];

// ─── Stripe Card Element (inline, no npm) ──────────────────────────────────

declare global {
  interface Window {
    Stripe?: (key: string) => StripeInstance;
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void };
  }
}

type StripeInstance = {
  elements: () => {
    create: (type: string, opts?: object) => CardElement;
  };
  confirmCardPayment: (
    secret: string,
    opts: object
  ) => Promise<{ error?: { message: string }; paymentIntent?: { status: string } }>;
};

type CardElement = {
  mount: (selector: string) => void;
  unmount: () => void;
};

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function BillingPage() {
  const token = useAuthStore((s) => s.token);

  // Original state declarations
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [gateway, setGateway] = useState<"stripe" | "razorpay">("stripe");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [paySuccess, setPaySuccess] = useState("");
  const [cardName, setCardName] = useState("");
  const isSubmittingRef = React.useRef(false);
  const [stripeLoaded, setStripeLoaded] = useState(false);
  const [stripeInst, setStripeInst] = useState<StripeInstance | null>(null);
  const [cardElement, setCardElement] = useState<CardElement | null>(null);

  // New state declarations
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [stripeIntent, setStripeIntent] = useState<{ client_secret: string; payment_intent_id: string; mode: string } | null>(null);
  const [fetchingIntent, setFetchingIntent] = useState(false);

  const resetForm = () => {
    setSelectedPlan(null);
    setPayError("");
    setCardNumber("");
    setCardExpiry("");
    setCardCvc("");
    setStripeIntent(null);
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 16) value = value.slice(0, 16);
    const parts = [];
    for (let i = 0; i < value.length; i += 4) {
      parts.push(value.substring(i, i + 4));
    }
    setCardNumber(parts.join(" "));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length >= 2) {
      setCardExpiry(`${value.slice(0, 2)}/${value.slice(2)}`);
    } else {
      setCardExpiry(value);
    }
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 4) {
      setCardCvc(value);
    }
  };

  const isMockStripe = !stripeInst || !stripeIntent || stripeIntent.mode === "test_mock";

  // Fetch Stripe Intent info when selectedPlan / gateway / token changes
  useEffect(() => {
    if (!selectedPlan || gateway !== "stripe" || !token) {
      setStripeIntent(null);
      return;
    }
    const fetchIntent = async () => {
      setFetchingIntent(true);
      setPayError("");
      try {
        const intentRes = await apiFetch<{ client_secret: string; payment_intent_id: string; mode: string }>(
          "/dashboard/billing/stripe/payment-intent",
          "POST",
          { plan_tier: selectedPlan.id, currency: "usd" },
          token
        );
        setStripeIntent(intentRes);
      } catch (err: unknown) {
        const e = err as { message?: string };
        setPayError(e?.message || "Failed to initiate payment gateway intent.");
      } finally {
        setFetchingIntent(false);
      }
    };
    fetchIntent();
  }, [selectedPlan, gateway, token]);

  // Load billing info
  const fetchBilling = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiFetch<BillingInfo>("/dashboard/organization/billing", "GET", undefined, token);
      setBilling(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchBilling(); }, [fetchBilling]);

  // Load Stripe.js
  useEffect(() => {
    if (stripeLoaded) return;
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/";
    script.onload = () => {
      setStripeLoaded(true);
      const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_placeholder";
      if (window.Stripe) {
        const inst = window.Stripe(stripeKey);
        setStripeInst(inst);
      }
    };
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [stripeLoaded]);

  // Mount Stripe CardElement when modal opens with stripe selected (and not mock)
  useEffect(() => {
    if (!selectedPlan || gateway !== "stripe" || !stripeInst || isMockStripe) return;
    const timer = setTimeout(() => {
      try {
        const elements = stripeInst.elements();
        const card = elements.create("card", {
          style: {
            base: {
              fontSize: "14px",
              color: "#0f172a",
              fontFamily: "Inter, sans-serif",
              "::placeholder": { color: "#94a3b8" },
            },
          },
        });
        card.mount("#stripe-card-element");
        setCardElement(card);
      } catch {
        // ignore mount errors (e.g. element not in DOM yet)
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [selectedPlan, gateway, stripeInst, isMockStripe]);

  // ─── Payment handlers ─────────────────────────────────────────────────

  const handleStripePayment = async () => {
    if (!selectedPlan || !token || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setPaying(true);
    setPayError("");

    try {
      let piId = "";

      // 1. Get or create Stripe PaymentIntent
      let currentIntent = stripeIntent;
      if (!currentIntent) {
        currentIntent = await apiFetch<{ client_secret: string; payment_intent_id: string; mode: string }>(
          "/dashboard/billing/stripe/payment-intent",
          "POST",
          { plan_tier: selectedPlan.id, currency: "usd" },
          token
        );
      }
      piId = currentIntent.payment_intent_id;

      // 2. If mock mode, simulate card verification loading
      if (currentIntent.mode === "test_mock") {
        if (!cardNumber.trim() || !cardExpiry.trim() || !cardCvc.trim()) {
          throw new Error("Please fill in your card details.");
        }
        // Simulated latency
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } else {
        // Live mode checkout
        if (stripeInst && cardElement) {
          const result = await stripeInst.confirmCardPayment(currentIntent.client_secret, {
            payment_method: {
              card: cardElement as unknown as never,
              billing_details: { name: cardName },
            },
          });
          if (result.error) {
            setPayError(result.error.message || "Payment failed.");
            setPaying(false);
            isSubmittingRef.current = false;
            return;
          }
          piId = result.paymentIntent?.status === "succeeded" ? piId : "";
        } else {
          throw new Error("Stripe SDK not initialized.");
        }
      }

      // 3. Complete Subscription
      await apiFetch(
        "/dashboard/billing/subscribe",
        "POST",
        {
          plan_tier: selectedPlan.id,
          payment_gateway: "stripe",
          payment_intent_id: piId,
          amount_paid: selectedPlan.price,
        },
        token
      );

      setPaySuccess(`🎉 You are now on the ${selectedPlan.label} plan!`);
      resetForm();
      fetchBilling();
    } catch (err: unknown) {
      const e = err as { data?: { detail?: string }; message?: string };
      setPayError(e?.data?.detail || e?.message || "Payment failed. Please try again.");
    } finally {
      setPaying(false);
      isSubmittingRef.current = false;
    }
  };

  const handleDownloadInvoice = async (invoiceId: number) => {
    if (!token) return;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5011/api/v1";
      const res = await fetch(`${baseUrl}/dashboard/billing/invoices/${invoiceId}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch invoice");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice_INV-2026-${1000 + invoiceId}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRazorpayPayment = async () => {
    if (!selectedPlan || !token || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setPaying(true);
    setPayError("");

    try {
      // Load Razorpay checkout script
      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://checkout.razorpay.com/v1/checkout.js";
          s.onload = () => resolve();
          s.onerror = () => reject(new Error("Razorpay checkout.js failed to load"));
          document.head.appendChild(s);
        });
      }

      // 1. Create order
      const orderRes = await apiFetch<{
        order_id: string; amount: number; currency: string; key_id: string; mode: string;
      }>("/dashboard/billing/razorpay/order", "POST", { plan_tier: selectedPlan.id, currency: "inr" }, token);

      // If in mock mode, simulate latency and complete the checkout immediately
      if (orderRes.mode === "test_mock") {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        
        await apiFetch("/dashboard/billing/subscribe", "POST", {
          plan_tier: selectedPlan.id,
          payment_gateway: "razorpay",
          razorpay_order_id: orderRes.order_id,
          razorpay_payment_id: `pay_mock_${Math.random().toString(36).substring(7)}`,
          amount_paid: selectedPlan.price,
        }, token);

        setPaySuccess(`🎉 You are now on the ${selectedPlan.label} plan!`);
        resetForm();
        fetchBilling();
        setPaying(false);
        isSubmittingRef.current = false;
        return;
      }

      // 2. Open Razorpay checkout
      const options: Record<string, unknown> = {
        key: orderRes.key_id || "rzp_test_SuiaVbQ34XG4B9",
        amount: orderRes.amount,
        currency: orderRes.currency,
        name: "Voqly AI",
        description: `${selectedPlan.label} Plan Subscription`,
        handler: async (response: { razorpay_order_id?: string; razorpay_payment_id: string; razorpay_signature?: string }) => {
          try {
            // 3. Verify + subscribe (only verify if in live/real modes, or signature present)
            if (orderRes.mode !== "test_mock" && response.razorpay_signature) {
              await apiFetch("/dashboard/billing/razorpay/verify", "POST", {
                razorpay_order_id: response.razorpay_order_id || "",
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature || "",
                plan_tier: selectedPlan.id,
              }, token);
            }

            await apiFetch("/dashboard/billing/subscribe", "POST", {
              plan_tier: selectedPlan.id,
              payment_gateway: "razorpay",
              razorpay_order_id: response.razorpay_order_id || orderRes.order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              amount_paid: selectedPlan.price,
            }, token);

            setPaySuccess(`🎉 You are now on the ${selectedPlan.label} plan!`);
            resetForm();
            fetchBilling();
          } catch (err: unknown) {
            const e = err as { data?: { detail?: string }; message?: string };
            setPayError(e?.data?.detail || e?.message || "Payment verification failed.");
          } finally {
            setPaying(false);
            isSubmittingRef.current = false;
          }
        },
        prefill: { name: cardName },
        theme: { color: "#2563eb" },
        modal: {
          ondismiss: () => {
            setPaying(false);
            isSubmittingRef.current = false;
          },
        },
      };

      if (orderRes.mode !== "test_mock") {
        options.order_id = orderRes.order_id;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzp = new (window.Razorpay as any)(options);
      rzp.open();
    } catch (err: unknown) {
      const e = err as { data?: { detail?: string }; message?: string };
      setPayError(e?.data?.detail || e?.message || "Payment failed. Please try again.");
      setPaying(false);
      isSubmittingRef.current = false;
    }
  };

  const handlePayment = () => {
    if (gateway === "stripe") handleStripePayment();
    else handleRazorpayPayment();
  };

  // ─── Helpers ──────────────────────────────────────────────────────────

  const currentTier = billing?.plan_tier?.toLowerCase() || "free";
  const isPlanCurrent = (planId: string) => planId === currentTier;
  const isPlanUpgrade = (plan: Plan) => {
    const order = ["free", "starter", "growth", "professional"];
    return order.indexOf(plan.id) > order.indexOf(currentTier);
  };
  // hasPaidPlan: backend already guarantees plan_tier != 'free' only when paid invoice exists
  const hasPaidPlan = currentTier !== "free" && billing?.subscription_status === "active";

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 pb-16" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:none; } }
        @keyframes popIn  { 0%{opacity:0;transform:scale(0.93);} 70%{transform:scale(1.02);} 100%{opacity:1;transform:scale(1);} }
        @keyframes shimmer { 0%{background-position:-200% 0;} 100%{background-position:200% 0;} }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{ animation: "fadeUp .45s ease both" }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-950 tracking-tight">Billing & Plans</h1>
            <p className="text-sm text-slate-500 mt-1">Manage your subscription, upgrade plans, and view invoices.</p>
          </div>
          <button
            onClick={fetchBilling}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* ── Success banner ─────────────────────────────────────────── */}
      {paySuccess && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 font-semibold text-sm" style={{ animation: "popIn .4s ease both" }}>
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{paySuccess}</span>
          <button className="ml-auto" onClick={() => setPaySuccess("")}><X className="w-4 h-4" /></button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-3" /> Loading billing info…
        </div>
      ) : (
        <>
          {/* ── Current Plan Card ───────────────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm" style={{ animation: "fadeUp .5s .05s ease both" }}>
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md ${hasPaidPlan ? "bg-gradient-to-br from-blue-600 to-indigo-600" : "bg-gradient-to-br from-slate-400 to-slate-500"}`}>
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Current Plan</p>
                  <h2 className="text-xl font-extrabold text-slate-950 capitalize">
                    {hasPaidPlan ? (billing?.plan_tier || "Free") : "Free"} Plan
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      hasPaidPlan
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}>
                      {hasPaidPlan ? "ACTIVE" : "FREE"}
                    </span>
                    {hasPaidPlan && billing?.current_period_end && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        Renews {billing.current_period_end}
                      </span>
                    )}
                    {!hasPaidPlan && (
                      <span className="text-[10px] text-amber-600 font-semibold">
                        No active subscription — choose a plan below to upgrade
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Prepaid Balance</p>
                  <p className="text-2xl font-black text-slate-950 mt-0.5">
                    ${(billing?.prepaid_balance ?? 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Usage indicators */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100">
              {[
                { icon: Users, label: "AI Agents", value: currentTier === "professional" ? "Unlimited" : currentTier === "growth" ? "10" : currentTier === "starter" ? "2" : "1 (Free)" },
                { icon: PhoneCall, label: "Calls / Month", value: currentTier === "professional" ? "100k" : currentTier === "growth" ? "10k" : currentTier === "starter" ? "1k" : "—" },
                { icon: Shield, label: "SLA", value: currentTier === "professional" ? "99.99%" : currentTier === "growth" ? "99.9%" : "Best effort" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                    <item.icon className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{item.label}</p>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Upgrade nudge for free users */}
            {!hasPaidPlan && (
              <div className="mt-5 pt-5 border-t border-slate-100 flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-700 font-semibold">
                  You are on the <strong>Free plan</strong>. Select a plan below and complete payment to unlock more agents, calls, and features.
                </p>
              </div>
            )}
          </div>

          {/* ── Plan Cards ────────────────────────────────────────────── */}
          <div>
            <h3 className="text-base font-extrabold text-slate-900 mb-4">Choose a Plan</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {PLANS.map((plan, i) => {
                const Icon = plan.icon;
                const isCurrent = isPlanCurrent(plan.id);
                const isUpgrade = isPlanUpgrade(plan);
                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-2xl border-2 p-6 flex flex-col transition-all duration-300 ${
                      isCurrent
                        ? "border-blue-500 bg-blue-50/30 shadow-md"
                        : (!isCurrent && isUpgrade && !hasPaidPlan)
                        ? "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md cursor-pointer"
                        : "border-slate-200 bg-white opacity-80 cursor-default"
                    }`}
                    style={{ animation: `fadeUp .5s ${.1 + i * .08}s ease both` }}
                    onClick={() => { if (!isCurrent && isUpgrade && !hasPaidPlan) setSelectedPlan(plan); }}
                  >
                    {plan.badge && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow">
                          {plan.badge}
                        </span>
                      </div>
                    )}
                    {isCurrent && (
                      <div className="absolute -top-3 right-4">
                        <span className="bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow flex items-center gap-1">
                          <Check className="w-3 h-3" /> Current Plan
                        </span>
                      </div>
                    )}

                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.gradient} border border-slate-100 flex items-center justify-center mb-4`}>
                      <Icon className={`w-5 h-5 ${plan.color}`} />
                    </div>

                    <h4 className="text-lg font-extrabold text-slate-950">{plan.label}</h4>
                    <p className="text-xs text-slate-500 mt-1 mb-4">{plan.description}</p>

                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-3xl font-black text-slate-950">${plan.price}</span>
                      <span className="text-xs text-slate-400 font-semibold">/mo</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mb-5">≈ ₹{plan.priceInr.toLocaleString()}/mo via Razorpay</p>

                    <ul className="space-y-2 flex-1 mb-6">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <button
                      disabled={isCurrent || !isUpgrade}
                      onClick={(e) => { e.stopPropagation(); if (!isCurrent && isUpgrade) setSelectedPlan(plan); }}
                      className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                        isCurrent
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default"
                          : isUpgrade
                          ? "bg-[#0b1931] hover:bg-slate-800 text-white shadow active:scale-[.98]"
                          : "bg-slate-100 text-slate-400 cursor-not-allowed"
                      }`}
                    >
                      {isCurrent ? (
                        // "Current Plan"/"Subscribed" is reserved for the plan the user is actually on.
                        <><Check className="w-4 h-4" /> Current Plan</>
                      ) : isUpgrade ? (
                        <>Upgrade to {plan.label} <ArrowRight className="w-4 h-4" /></>
                      ) : (
                        "Included"
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Invoice History ──────────────────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden" style={{ animation: "fadeUp .5s .35s ease both" }}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Invoice History</h3>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">{billing?.invoices?.length ?? 0} invoices</span>
            </div>

            {!billing?.invoices?.length ? (
              <div className="px-6 py-12 text-center text-slate-400">
                <CreditCard className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="font-semibold text-sm">No invoices yet</p>
                <p className="text-xs mt-1">Your billing history will appear here after your first payment.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="px-6 py-3 text-left">Invoice #</th>
                    <th className="px-6 py-3 text-left">Date</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                    <th className="px-6 py-3 text-center">Status</th>
                    <th className="px-6 py-3 text-right">Download</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {billing.invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-800 text-xs">{inv.invoice_number}</td>
                      <td className="px-6 py-4 text-slate-500 text-xs">{inv.created_at}</td>
                      <td className="px-6 py-4 text-right font-extrabold text-slate-900">${inv.amount.toFixed(2)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          inv.status === "paid"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {inv.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDownloadInvoice(inv.id)}
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-700 transition cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" /> PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ── Payment Modal ─────────────────────────────────────────────────── */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden" style={{ animation: "popIn .35s ease both" }}>
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-950">
                  Upgrade to {selectedPlan.label}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  ${selectedPlan.price}/mo · ₹{selectedPlan.priceInr.toLocaleString()}/mo
                </p>
              </div>
              <button onClick={resetForm} className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
              {/* Gateway toggle */}
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Payment Gateway</p>
                <div className="grid grid-cols-2 gap-3">
                  {(["stripe", "razorpay"] as const).map((gw) => (
                    <button
                      key={gw}
                      onClick={() => { setGateway(gw); setPayError(""); }}
                      className={`flex flex-col items-center gap-2 py-3 px-4 rounded-2xl border-2 text-sm font-bold transition-all ${
                        gateway === gw
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      {gw === "stripe" ? (
                        <>
                          <svg viewBox="0 0 60 25" className="h-5 fill-current" aria-label="Stripe">
                            <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 0 1-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.13v5.84zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 0 1-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.53-.24 1.53-1C6.26 13.77 0 14.51 0 9.95 0 7.04 2.28 5.3 5.62 5.3c1.5 0 3 .23 4.43.82v3.88a9.23 9.23 0 0 0-4.43-1.24c-.88 0-1.4.3-1.4.95 0 1.85 6.29.97 6.29 5.91z"/>
                          </svg>
                          <span className="text-xs">Pay with Stripe</span>
                        </>
                      ) : (
                        <>
                          <svg viewBox="0 0 80 24" className="h-5" aria-label="Razorpay">
                            <text x="0" y="19" fontFamily="Inter,sans-serif" fontWeight="800" fontSize="18" fill={gateway === "razorpay" ? "#1c63b7" : "#64748b"}>Razorpay</text>
                          </svg>
                          <span className="text-xs">Pay with Razorpay (INR)</span>
                        </>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cardholder / Customer name */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  {gateway === "stripe" ? "Cardholder Name" : "Your Name"}
                </label>
                <input
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition"
                />
              </div>

              {/* Stripe fields */}
              {gateway === "stripe" && (
                <>
                  {fetchingIntent ? (
                    <div className="flex items-center justify-center py-8 text-slate-400 text-xs">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" /> Initializing gateway secure session...
                    </div>
                  ) : isMockStripe ? (
                    <div className="space-y-4" style={{ animation: "fadeUp 0.3s ease" }}>
                      {/* Premium Card Graphic Mockup */}
                      <div className="relative w-full aspect-[1.586/1] bg-gradient-to-br from-slate-900 via-[#10203e] to-slate-950 rounded-2xl p-5 text-white shadow-xl overflow-hidden border border-slate-800 flex flex-col justify-between select-none">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.06),transparent_60%)] pointer-events-none" />
                        
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-600/30 flex items-center justify-center border border-blue-500/30">
                              <span className="font-extrabold text-xs text-white tracking-wider">V</span>
                            </div>
                            <span className="font-bold text-xs tracking-widest text-slate-200">VOQLY AI</span>
                          </div>
                          
                          <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                            {cardNumber.startsWith("4") ? "VISA" : cardNumber.startsWith("5") ? "MASTERCARD" : "STRIPE TEST"}
                          </span>
                        </div>

                        {/* Metallic chip */}
                        <div className="w-8 h-6 rounded bg-gradient-to-r from-amber-400 to-amber-200 opacity-80 relative overflow-hidden flex flex-col justify-between p-1">
                          <div className="border-b border-black/20 h-full w-full" />
                          <div className="border-r border-black/20 h-full w-full absolute inset-0" />
                        </div>

                        {/* Monospace number */}
                        <div className="font-mono text-base md:text-lg tracking-[0.2em] text-white/90 my-1 drop-shadow-md">
                          {cardNumber || "•••• •••• •••• ••••"}
                        </div>

                        <div className="flex justify-between items-end">
                          <div className="max-w-[70%]">
                            <p className="text-[7px] text-slate-400 font-bold uppercase tracking-wider">Card Holder</p>
                            <p className="font-mono text-xs font-semibold tracking-wider truncate uppercase text-white/90">
                              {cardName || "JOHN DOE"}
                            </p>
                          </div>

                          <div>
                            <p className="text-[7px] text-slate-400 font-bold uppercase tracking-wider">Expires</p>
                            <p className="font-mono text-xs font-semibold tracking-wider text-white/90">
                              {cardExpiry || "MM/YY"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Inputs */}
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Card Number</label>
                          <div className="relative">
                            <input
                              value={cardNumber}
                              onChange={handleCardNumberChange}
                              placeholder="4242 4242 4242 4242"
                              maxLength={19}
                              className="w-full h-10 border border-slate-200 rounded-xl px-3 pr-10 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <CreditCard className="w-4 h-4 text-slate-400" />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Expiration Date</label>
                            <input
                              value={cardExpiry}
                              onChange={handleExpiryChange}
                              placeholder="MM/YY"
                              maxLength={5}
                              className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">CVC / CVV</label>
                            <input
                              value={cardCvc}
                              onChange={handleCvcChange}
                              placeholder="123"
                              maxLength={4}
                              type="password"
                              className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition"
                            />
                          </div>
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                        <Shield className="w-3 h-3 text-emerald-500" /> Sandboxed Mode: Any test numbers are simulated.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Card Details</label>
                      <div
                        id="stripe-card-element"
                        className="h-10 border border-slate-200 rounded-xl px-3 flex items-center text-sm text-slate-400 bg-white"
                      >
                        {!stripeLoaded && <span className="text-slate-400 text-xs">Loading card input…</span>}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Secured by Stripe. Test card: 4242 4242 4242 4242
                      </p>
                    </div>
                  )}
                </>
              )}

              {gateway === "razorpay" && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700 flex items-start gap-2.5" style={{ animation: "fadeUp 0.3s ease" }}>
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
                  <div className="space-y-1">
                    <span className="font-bold block">Razorpay Test Checkout</span>
                    <span>An interactive Razorpay payment overlay will open. You can input mock details or complete test transactions. Standard currency is INR (₹{selectedPlan.priceInr.toLocaleString()}).</span>
                  </div>
                </div>
              )}

              {/* Plan summary */}
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 font-medium">{selectedPlan.label} Plan (Monthly)</span>
                  <span className="font-extrabold text-slate-900">
                    {gateway === "stripe" ? `$${selectedPlan.price}.00` : `₹${selectedPlan.priceInr.toLocaleString()}`}
                  </span>
                </div>
                <div className="border-t border-slate-200 mt-3 pt-3 flex justify-between text-sm font-bold">
                  <span className="text-slate-800">Total due today</span>
                  <span className="text-slate-950 text-base">
                    {gateway === "stripe" ? `$${selectedPlan.price}.00` : `₹${selectedPlan.priceInr.toLocaleString()}`}
                  </span>
                </div>
              </div>

              {/* Error */}
              {payError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {payError}
                </div>
              )}

              {/* Pay button */}
              <button
                onClick={handlePayment}
                disabled={paying || fetchingIntent || !cardName.trim() || (gateway === "stripe" && isMockStripe && (!cardNumber.trim() || !cardExpiry.trim() || !cardCvc.trim()))}
                className="w-full py-3.5 bg-[#0b1931] hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[.98] text-sm"
              >
                {paying ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                ) : (
                  <>
                    <Star className="w-4 h-4" />
                    Confirm & Pay {gateway === "stripe" ? `$${selectedPlan.price}` : `₹${selectedPlan.priceInr.toLocaleString()}`}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
