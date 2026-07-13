"use client";

import React, { useState, useEffect, useRef } from "react";
import { useOnboardingStore } from "src/store/useOnboardingStore";
import {
  Landmark, Shield, HeartPulse, RefreshCw,
  CheckCircle2, Loader2, X, AlertCircle, Lock, Zap
} from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

// ─── Config ──────────────────────────────────────────────────────────────────
const STRIPE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_REPLACE_ME";
const RAZORPAY_KEY_ID =
  process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_REPLACE_ME";

const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

// ─── Plan Config ─────────────────────────────────────────────────────────────
const PLANS = [
  {
    id: "free",
    label: "Free",
    monthlyUSD: 0,
    annualUSD: 0,
    monthlyINR: 0,
    annualINR: 0,
    features: ["100 mins / mo", "Standard latency"],
    isFree: true,
  },
  {
    id: "starter",
    label: "Starter",
    monthlyUSD: 49,
    annualUSD: 39,
    monthlyINR: 4099,
    annualINR: 3299,
    features: ["2,500 mins / mo", "Webhooks access"],
  },
  {
    id: "growth",
    label: "Growth",
    monthlyUSD: 249,
    annualUSD: 199,
    monthlyINR: 20799,
    annualINR: 16599,
    features: [
      "10,000 mins included",
      "Under 500ms latency",
      "Custom knowledge base",
      "Phone number integration",
    ],
    popular: true,
  },
  {
    id: "professional",
    label: "Professional",
    monthlyUSD: 499,
    annualUSD: 399,
    monthlyINR: 41599,
    annualINR: 33299,
    features: ["25,000 mins / mo", "White-label dashboards", "Priority support"],
  },
];

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

// ─── Stripe Card Form ────────────────────────────────────────────────────────
interface StripeFormProps {
  amount: number;
  currency: "usd";
  planLabel: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
}

const StripeCardForm: React.FC<StripeFormProps> = ({
  amount,
  onSuccess,
  onError,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [cardReady, setCardReady] = useState(false);
  const isSubmittingRef = useRef(false);

  const handlePay = async () => {
    if (!stripe || !elements || !cardReady || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setProcessing(true);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        setProcessing(false);
        isSubmittingRef.current = false;
        return;
      }

      const { error } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
      });

      if (error) {
        onError(error.message || "Stripe error occurred.");
        setProcessing(false);
        isSubmittingRef.current = false;
        return;
      }

      // ── Simulate server-side confirmation (Replace with real backend) ──
      await new Promise((r) => setTimeout(r, 1200));
      setProcessing(false);
      isSubmittingRef.current = false;
      onSuccess();
    } catch {
      setProcessing(false);
      isSubmittingRef.current = false;
      onError("An unexpected error occurred during card processing.");
    }
  };

  return (
    <div className="space-y-5">
      {/* Test Mode Banner */}
      <div className="flex items-center space-x-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-[10px] text-amber-700 font-bold">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        <span>
          TEST MODE — Use card <span className="font-mono">4242 4242 4242 4242</span>, any future date, any CVC.
        </span>
      </div>

      {/* Stripe Card Element */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
          Card Details
        </label>
        <div className="border border-slate-200 rounded-lg px-4 py-3.5 bg-white focus-within:border-blue-600 transition-colors shadow-sm">
          <CardElement
            onChange={(e) => setCardReady(e.complete)}
            options={{
              style: {
                base: {
                  fontSize: "13px",
                  color: "#0f172a",
                  fontFamily: "Inter, system-ui, sans-serif",
                  "::placeholder": { color: "#94a3b8" },
                },
                invalid: { color: "#ef4444" },
              },
              hidePostalCode: true,
            }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handlePay}
        disabled={!cardReady || processing}
        className="w-full h-11 rounded-xl bg-[#635bff] hover:bg-[#4f46e5] text-white text-xs font-bold flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all shadow-lg shadow-[#635bff]/30 active:scale-[0.98]"
      >
        {processing ? (
          <><Loader2 className="w-4 h-4 animate-spin" /><span>Processing...</span></>
        ) : (
          <><Lock className="w-3.5 h-3.5" /><span>Pay ${(amount / 100).toFixed(2)} with Stripe</span></>
        )}
      </button>

      <div className="flex items-center justify-center space-x-1.5 text-[9px] text-slate-400 font-semibold">
        <Lock className="w-3 h-3" />
        <span>256-bit SSL encrypted · Powered by Stripe</span>
      </div>
    </div>
  );
};

// ─── Main StepBilling ────────────────────────────────────────────────────────
export const StepBilling: React.FC = () => {
  const { selectedPlan, billingCycle, voiceMinutes, setBusinessDetails, triggerToast } = useOnboardingStore();

  // Gateway: "stripe" | "razorpay" | null (null = no gateway shown yet)
  const [gateway, setGateway] = useState<"stripe" | "razorpay" | null>(null);
  const [, setCurrency] = useState<"usd" | "inr">("usd");
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [razorpayLoading, setRazorpayLoading] = useState(false);

  const handleMinutesChange = (val: number) => {
    setBusinessDetails({ voiceMinutes: val });
  };

  const getGrowthPrice = () => {
    if (voiceMinutes <= 5000) return billingCycle === "annual" ? 99 : 129;
    if (voiceMinutes <= 10000) return billingCycle === "annual" ? 199 : 249;
    if (voiceMinutes <= 25000) return billingCycle === "annual" ? 399 : 499;
    return billingCycle === "annual" ? 799 : 999;
  };

  const getPlanPrice = (plan: typeof PLANS[0]): number => {
    if (plan.id === "growth") return billingCycle === "annual" ? getGrowthPrice() : getGrowthPrice();
    return billingCycle === "annual" ? plan.annualUSD : plan.monthlyUSD;
  };

  const getPlanPriceINR = (plan: typeof PLANS[0]): number => {
    if (plan.id === "growth") return billingCycle === "annual" ? getGrowthPrice() * 83 : getGrowthPrice() * 83;
    return billingCycle === "annual" ? plan.annualINR : plan.monthlyINR;
  };

  const activePlan = PLANS.find((p) => p.id === selectedPlan);
  const amountUSD = activePlan ? getPlanPrice(activePlan) * 100 : 0; // cents
  const amountINR = activePlan ? getPlanPriceINR(activePlan) * 100 : 0; // paise

  // ── Load Razorpay script ──
  useEffect(() => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    document.body.appendChild(s);
    return () => { document.body.removeChild(s); };
  }, []);

  const openRazorpay = () => {
    if (!activePlan || activePlan.isFree) return;
    setRazorpayLoading(true);
    setPaymentError("");

    const options = {
      key: RAZORPAY_KEY_ID,
      amount: amountINR,
      currency: "INR",
      name: "Voqly AI",
      description: `${activePlan.label} Plan — ${billingCycle === "annual" ? "Annual" : "Monthly"}`,
      image: "/logo.png",
      handler: () => {
        // In production: verify payment_id on backend
        setRazorpayLoading(false);
        setGateway(null);
        setPaymentSuccess(true);
        setBusinessDetails({ cardholderName: "razorpay-success" });
        triggerToast(`✅ ₹${(amountINR / 100).toLocaleString("en-IN")} paid via Razorpay! ${activePlan.label} plan activated.`, "success");
      },
      prefill: {},
      notes: { plan: activePlan.id, billing_cycle: billingCycle },
      theme: { color: "#2563eb" },
      modal: {
        ondismiss: () => {
          setRazorpayLoading(false);
          setPaymentError("Payment cancelled. You can try again.");
        },
      },
    };

    try {
      const rzp = new window.Razorpay!(options);
      rzp.open();
    } catch {
      setRazorpayLoading(false);
      setPaymentError("Razorpay failed to load. Check your internet connection.");
    }
  };

  const handleStripeSuccess = () => {
    setGateway(null);
    setPaymentSuccess(true);
    setBusinessDetails({ cardholderName: "stripe-success" });
    triggerToast(`✅ $${(amountUSD / 100).toLocaleString()} paid via Stripe! ${activePlan?.label} plan activated.`, "success");
  };

  const handleStripeError = (msg: string) => {
    setPaymentError(msg);
  };

  const isFreeOrNone = !selectedPlan || selectedPlan === "free";

  return (
    <div className="w-full space-y-6 text-slate-800 text-left animate-fade-in">

      {/* Title */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-slate-950 tracking-tight">Choose your plan</h2>
        <p className="text-xs text-slate-500 font-medium">
          Recommended for high-volume voice AI campaigns. Select a plan, then complete payment to continue.
        </p>
      </div>

      {/* ── Payment Success Banner ── */}
      {paymentSuccess && (
        <div className="flex items-center space-x-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm font-bold text-emerald-700 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
          <span>
            Payment successful! <strong>{activePlan?.label} plan</strong> is now active. Click Continue to proceed.
          </span>
        </div>
      )}

      {/* ── Payment Error ── */}
      {paymentError && (
        <p className="text-xs font-semibold text-red-600 flex items-center space-x-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{paymentError}</span>
        </p>
      )}

      {/* Selectors Panel */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-inner">
        {/* Toggle */}
        <div className="flex items-center bg-slate-200/60 rounded-lg p-1 shrink-0">
          <button
            type="button"
            onClick={() => setBusinessDetails({ billingCycle: "monthly" })}
            className={`px-3.5 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${
              billingCycle === "monthly" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBusinessDetails({ billingCycle: "annual" })}
            className={`px-3.5 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${
              billingCycle === "annual" ? "bg-blue-600 text-white shadow-2xs" : "text-slate-500"
            }`}
          >
            Annual (Save 20%)
          </button>
        </div>

        {/* Minutes Slider */}
        <div className="flex-1 w-full flex items-center space-x-4 px-2">
          <div className="flex-grow space-y-1">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              Estimate monthly voice minutes
            </div>
            <input
              type="range" min="2000" max="40000" step="2000"
              value={voiceMinutes}
              onChange={(e) => handleMinutesChange(parseInt(e.target.value))}
              className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>
          <div className="w-24 bg-white border border-slate-200 rounded-lg py-2 px-3 text-center shrink-0 shadow-sm font-mono text-[11px] font-bold text-slate-800">
            {voiceMinutes.toLocaleString()} mins
          </div>
        </div>
      </div>

      {/* ── Plan Cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch select-none">

        {/* Free */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between hover:shadow-sm transition-shadow">
          <div className="space-y-4">
            <div>
              <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Free</h5>
              <p className="text-2xl font-bold text-slate-900 mt-1">$0 <span className="text-[10px] text-slate-400 font-medium">/mo</span></p>
            </div>
            <ul className="space-y-2 text-[10px] font-semibold text-slate-500">
              <li>✓ 100 mins / mo</li>
              <li>✓ Standard latency</li>
            </ul>
          </div>
          <button type="button" disabled className="w-full h-9 rounded-lg bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-400 mt-6 cursor-not-allowed">
            Current
          </button>
        </div>

        {/* Starter */}
        <div className={`lg:col-span-3 bg-white rounded-xl border p-5 flex flex-col justify-between transition-all ${selectedPlan === "starter" ? "border-blue-500 ring-2 ring-blue-500/30 shadow-md" : "border-slate-200 hover:shadow-sm"}`}>
          <div className="space-y-4">
            <div>
              <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Starter</h5>
              <div className="mt-1">
                <p className="text-2xl font-bold text-slate-900">
                  ${billingCycle === "annual" ? PLANS[1].annualUSD : PLANS[1].monthlyUSD}
                  <span className="text-[10px] text-slate-400 font-medium"> /mo</span>
                </p>
                <p className="text-[9px] text-slate-400 font-bold mt-0.5">
                  ≈ ₹{(billingCycle === "annual" ? PLANS[1].annualINR : PLANS[1].monthlyINR).toLocaleString("en-IN")}/mo
                </p>
              </div>
            </div>
            <ul className="space-y-2 text-[10px] font-semibold text-slate-500">
              <li>✓ 2,500 mins / mo</li>
              <li>✓ Webhooks access</li>
            </ul>
          </div>
          <button type="button" onClick={() => { setBusinessDetails({ selectedPlan: "starter" }); setPaymentSuccess(false); setGateway(null); }}
            className={`w-full h-9 rounded-lg text-[10px] font-bold mt-6 border transition-all cursor-pointer ${
              selectedPlan === "starter" ? "bg-blue-600 text-white border-blue-600 shadow-md" : "bg-white text-slate-700 border-slate-250 hover:bg-slate-50"
            }`}>
            {selectedPlan === "starter" ? "✓ Selected" : "Select Starter"}
          </button>
        </div>

        {/* Growth — MOST POPULAR */}
        <div className={`lg:col-span-6 rounded-xl p-6 flex flex-col justify-between shadow-lg relative overflow-hidden transition-all ${selectedPlan === "growth" ? "bg-[#0f2e5c] text-white ring-2 ring-blue-600 ring-offset-2" : "bg-[#0f2e5c] text-white opacity-90 hover:opacity-100"}`}>
          <span className="absolute top-3.5 right-3.5 bg-blue-600 text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
            Most Popular
          </span>
          <div className="flex flex-col sm:flex-row gap-6 justify-between items-start">
            <div className="space-y-4 flex-1">
              <div>
                <h5 className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">Growth</h5>
                <p className="text-3xl font-bold text-white mt-1">
                  ${getGrowthPrice()} <span className="text-[10px] text-blue-300 font-medium">/mo</span>
                </p>
                <p className="text-[9px] text-blue-400 font-bold mt-0.5">
                  ≈ ₹{(getGrowthPrice() * 83).toLocaleString("en-IN")}/mo
                </p>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed font-semibold">
                Scale your operations with priority processing and unlimited agent personalities.
              </p>
            </div>
            <div className="w-full sm:w-44 bg-slate-950/40 rounded-xl p-4 space-y-2 border border-white/[0.04] shrink-0">
              <h6 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Included:</h6>
              <ul className="space-y-1.5 text-[9px] font-bold text-slate-300">
                <li>✓ 10,000 mins included</li>
                <li>✓ Under 500ms latency</li>
                <li>✓ Custom knowledge base</li>
                <li>✓ Phone number integration</li>
              </ul>
            </div>
          </div>
          <button type="button" onClick={() => { setBusinessDetails({ selectedPlan: "growth" }); setPaymentSuccess(false); setGateway(null); }}
            className={`w-full h-10 rounded-lg text-xs font-bold mt-6 shadow-sm transition-all cursor-pointer ${
              selectedPlan === "growth" ? "bg-blue-600 text-white hover:bg-blue-500" : "bg-white text-slate-900 hover:bg-slate-100"
            }`}>
            {selectedPlan === "growth" ? "✓ Selected — Upgrade to Growth" : "Upgrade to Growth"}
          </button>
        </div>
      </div>

      {/* Professional + Enterprise row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 select-none">
        {/* Professional */}
        <div className={`bg-white rounded-xl border p-5 flex flex-col sm:flex-row justify-between items-center gap-4 transition-all ${selectedPlan === "professional" ? "border-blue-500 ring-2 ring-blue-500/30 shadow-md" : "border-slate-200 hover:shadow-md"}`}>
          <div className="text-left space-y-1.5">
            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Professional</h5>
            <div>
              <p className="text-xl font-bold text-slate-900">
                ${billingCycle === "annual" ? PLANS[3].annualUSD : PLANS[3].monthlyUSD}
                <span className="text-[10px] text-slate-400 font-medium"> /mo</span>
              </p>
              <p className="text-[9px] text-slate-400 font-bold">
                ≈ ₹{(billingCycle === "annual" ? PLANS[3].annualINR : PLANS[3].monthlyINR).toLocaleString("en-IN")}/mo
              </p>
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[9px] font-bold text-slate-500">
              <li>✓ 25,000 mins / mo</li>
              <li>✓ White-label dashboards</li>
            </ul>
          </div>
          <button type="button" onClick={() => { setBusinessDetails({ selectedPlan: "professional" }); setPaymentSuccess(false); setGateway(null); }}
            className={`h-9 px-4 rounded-lg text-[10px] font-bold border transition-all cursor-pointer shrink-0 ${
              selectedPlan === "professional" ? "bg-blue-600 text-white border-blue-600 shadow-md" : "bg-white text-slate-700 border-slate-250 hover:bg-slate-50"
            }`}>
            {selectedPlan === "professional" ? "✓ Selected" : "Select Professional"}
          </button>
        </div>

        {/* Enterprise */}
        <div className="bg-white rounded-xl border border-slate-250 border-dashed p-5 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-2xs">
          <div className="flex items-center space-x-3 text-left">
            <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Enterprise</h4>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Custom limits & dedicated infrastructure</p>
            </div>
          </div>
          <button type="button" className="h-9 px-5 rounded-lg text-[10px] font-bold bg-[#0f2e5c] hover:bg-[#1e40af] text-white shadow-sm hover:shadow-md cursor-pointer shrink-0 transition-all active:scale-[0.98]">
            Contact Sales
          </button>
        </div>
      </div>

      {/* ── Payment Gateway Trigger ── */}
      {!isFreeOrNone && !paymentSuccess && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5 animate-fade-in">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900">
              Complete Payment — {activePlan?.label} Plan
            </h3>
            <p className="text-[10px] text-slate-500 font-semibold">
              Choose your preferred payment gateway to activate the plan.
            </p>
          </div>

          {/* Order summary mini row */}
          <div className="flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            <span className="font-bold text-slate-700 uppercase tracking-wide">{activePlan?.label} · {billingCycle === "annual" ? "Annual" : "Monthly"}</span>
            <div className="text-right">
              <p className="font-mono font-bold text-slate-900">${(amountUSD / 100).toLocaleString()}/mo USD</p>
              <p className="text-[9px] text-slate-400 font-bold">≈ ₹{(amountINR / 100).toLocaleString("en-IN")}/mo INR</p>
            </div>
          </div>

          {/* Gateway chooser buttons */}
          {!gateway && (
            <div className="grid grid-cols-2 gap-4">
              {/* Stripe */}
              <button
                type="button"
                onClick={() => { setGateway("stripe"); setCurrency("usd"); setPaymentError(""); }}
                className="h-14 rounded-xl border-2 border-slate-200 hover:border-[#635bff] hover:bg-[#f5f4ff] transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 group active:scale-[0.97]"
              >
                <div className="flex items-center space-x-1.5">
                  <div className="w-5 h-5 rounded bg-[#635bff] flex items-center justify-center">
                    <Zap className="w-3 h-3 text-white fill-white" />
                  </div>
                  <span className="text-xs font-black text-slate-900 group-hover:text-[#635bff]">Stripe</span>
                </div>
                <span className="text-[9px] text-slate-400 font-bold">Pay in USD · Global</span>
              </button>

              {/* Razorpay */}
              <button
                type="button"
                onClick={() => { setGateway("razorpay"); setCurrency("inr"); setPaymentError(""); openRazorpay(); }}
                disabled={razorpayLoading}
                className="h-14 rounded-xl border-2 border-slate-200 hover:border-[#072654] hover:bg-[#f0f7ff] transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 group active:scale-[0.97] disabled:opacity-60"
              >
                {razorpayLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#072654]" />
                ) : (
                  <>
                    <div className="flex items-center space-x-1.5">
                      <div className="w-5 h-5 rounded bg-[#072654] flex items-center justify-center">
                        <span className="text-[8px] font-black text-white">R</span>
                      </div>
                      <span className="text-xs font-black text-slate-900 group-hover:text-[#072654]">Razorpay</span>
                    </div>
                    <span className="text-[9px] text-slate-400 font-bold">Pay in INR · India</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Stripe Checkout Form */}
          {gateway === "stripe" && (
            <div className="animate-fade-in space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 rounded bg-[#635bff] flex items-center justify-center">
                    <Zap className="w-3 h-3 text-white fill-white" />
                  </div>
                  <span className="text-xs font-black text-[#635bff]">Stripe Checkout</span>
                </div>
                <button
                  type="button"
                  onClick={() => setGateway(null)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <Elements stripe={stripePromise}>
                <StripeCardForm
                  amount={amountUSD}
                  currency="usd"
                  planLabel={activePlan?.label || ""}
                  onSuccess={handleStripeSuccess}
                  onError={handleStripeError}
                />
              </Elements>
            </div>
          )}
        </div>
      )}

      {/* Free plan activate block */}
      {selectedPlan === "free" && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center text-[11px] text-slate-500 font-semibold">
          Free plan selected — no payment required. Click Continue to proceed.
        </div>
      )}

      {/* Bottom Certifications */}
      <div className="border-t border-slate-200 pt-5 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-slate-550 font-bold uppercase tracking-wider">
        <div className="flex items-center space-x-1.5"><Shield className="w-4 h-4 text-blue-600 mr-0.5" /> SOC2 Type II Compliant</div>
        <div className="flex items-center space-x-1.5"><HeartPulse className="w-4 h-4 text-blue-600 mr-0.5" /> HIPAA Ready Infrastructure</div>
        <div className="flex items-center space-x-1.5"><RefreshCw className="w-4 h-4 text-blue-600 mr-0.5" /> 99.99% Global Uptime SLA</div>
      </div>

    </div>
  );
};
