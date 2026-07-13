"use client";

import React, { useState } from "react";
import { useOnboardingStore } from "src/store/useOnboardingStore";
import { CreditCard, Landmark, ShieldCheck } from "lucide-react";

export const StepPayment: React.FC = () => {
  const {
    cardholderName, cardNumber, expiryDate, cvv, selectedPlan, billingCycle,
    setBusinessDetails
  } = useOnboardingStore();

  const [paymentMode, setPaymentMode] = useState("card");

  // Calculate annual rate or monthly summary based on plan selections
  const getSubtotal = () => {
    if (selectedPlan === "starter") return billingCycle === "annual" ? 49 * 12 * 0.8 : 49;
    if (selectedPlan === "growth") {
      const basePrice = billingCycle === "annual" ? 199 : 249;
      return billingCycle === "annual" ? basePrice * 12 : basePrice;
    }
    if (selectedPlan === "professional") return billingCycle === "annual" ? 499 * 12 * 0.8 : 499;
    return 0;
  };

  const subtotal = getSubtotal();
  const savings = billingCycle === "annual" ? subtotal * 0.2 : 0;

  return (
    <div className="w-full space-y-6 text-slate-800 text-left animate-fade-in">
      
      {/* Title */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-slate-950 tracking-tight">Complete your payment</h2>
        <p className="text-xs text-slate-500 font-medium">
          Configure your preferred billing method to activate your enterprise voice features and production API endpoints.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-stretch">
        
        {/* Left Side Billing Form Card */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
          
          {/* Payment Method Selector Tabs */}
          <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setPaymentMode("card")}
              className={`h-9 rounded-md text-[10px] font-bold uppercase transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                paymentMode === "card" ? "bg-blue-600 text-white shadow-2xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Card</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMode("upi")}
              className={`h-9 rounded-md text-[10px] font-bold uppercase transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                paymentMode === "upi" ? "bg-blue-600 text-white shadow-2xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>UPI</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMode("banking")}
              className={`h-9 rounded-md text-[10px] font-bold uppercase transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                paymentMode === "banking" ? "bg-blue-600 text-white shadow-2xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>Net Banking</span>
            </button>
          </div>

          {/* Form */}
          {paymentMode === "card" ? (
            <div className="space-y-4">
              
              {/* Cardholder Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Cardholder Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={cardholderName}
                  onChange={(e) => setBusinessDetails({ cardholderName: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-950 placeholder-slate-400 outline-none focus:border-blue-600"
                />
              </div>

              {/* Card Number */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Card Number</label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={19}
                    placeholder="0000 0000 0000 0000"
                    value={cardNumber}
                    onChange={(e) => setBusinessDetails({ cardNumber: e.target.value })}
                    className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-950 placeholder-slate-400 outline-none focus:border-blue-600 pr-16"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex space-x-1">
                    <span className="w-6 h-4 bg-slate-200 rounded-xs block shadow-3xs" />
                    <span className="w-6 h-4 bg-slate-350 rounded-xs block shadow-3xs" />
                  </div>
                </div>
              </div>

              {/* Expiry / CVV */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Expiry Date</label>
                  <input
                    type="text"
                    placeholder="MM / YY"
                    maxLength={5}
                    value={expiryDate}
                    onChange={(e) => setBusinessDetails({ expiryDate: e.target.value })}
                    className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-950 placeholder-slate-400 outline-none focus:border-blue-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">CVV</label>
                  <input
                    type="password"
                    maxLength={3}
                    placeholder="•••"
                    value={cvv}
                    onChange={(e) => setBusinessDetails({ cvv: e.target.value })}
                    className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-950 placeholder-slate-400 outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Save checkbox */}
              <div
                onClick={() => setBusinessDetails({ timezoneLock: !expiryDate })} // Mock checkbox trigger
                className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center space-x-2.5 cursor-pointer select-none"
              >
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-blue-600 rounded" />
                <span className="text-[10px] font-semibold text-slate-600">Securely save card for future billing</span>
              </div>

            </div>
          ) : (
            <div className="p-8 border border-dashed border-slate-200 rounded-lg text-center flex flex-col items-center justify-center space-y-2">
              <Landmark className="w-8 h-8 text-slate-400" />
              <h5 className="text-xs font-bold text-slate-900">Alternate Payment Portal</h5>
              <p className="text-[10px] text-slate-550 max-w-[250px] leading-relaxed font-semibold">
                Proceeding to continue will prompt a standard external Net Banking secure routing layout check.
              </p>
            </div>
          )}

        </div>

        {/* Right Side Order Summary Sidebar */}
        <div className="w-full lg:w-80 space-y-4 shrink-0 flex flex-col justify-between">
          
          {/* Order Summary Main Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4 flex-grow flex flex-col justify-between">
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block border-b border-slate-100 pb-2">Order Summary</h4>
              
              <div className="space-y-3.5">
                {/* Plan Tier details */}
                <div className="flex justify-between items-start text-xs">
                  <div className="text-left">
                    <span className="font-bold text-slate-900 uppercase">
                      Enterprise {selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} Plan
                    </span>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                      Billed {billingCycle === "annual" ? "Annually" : "Monthly"}
                    </p>
                  </div>
                  
                  <span className="font-mono font-bold text-slate-900">
                    ${subtotal.toLocaleString()}/{billingCycle === "annual" ? "yr" : "mo"}
                  </span>
                </div>

                <div className="border-t border-slate-100 pt-3 space-y-2 text-[10px] text-slate-500 font-semibold">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-mono font-bold text-slate-900">${subtotal.toLocaleString()}.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Platform Fee</span>
                    <span className="font-mono font-bold text-slate-900">$0.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VAT (0%)</span>
                    <span className="font-mono font-bold text-slate-900">$0.00</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Total invoice block */}
            <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-xs">
              <span className="font-bold text-slate-900">Total Amount</span>
              <span className="font-mono text-base font-bold text-blue-600">${subtotal.toLocaleString()}.00</span>
            </div>

            {/* SSL Trust badge */}
            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start space-x-2 text-[9px] text-slate-500 font-semibold leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>Bank-grade Security:</strong> Your transaction is encrypted with 256-bit SSL technology.
              </span>
            </div>

          </div>

          {/* Annual Plan Savings banner */}
          {billingCycle === "annual" && (
            <div className="bg-blue-50 border border-blue-150 rounded-xl p-4 text-[10px] text-blue-700 font-semibold flex items-center shadow-inner">
              <span className="text-center w-full">
                {"✨ You're saving "}<strong>${savings.toFixed(0)}</strong>{" on this annual plan compared to monthly billing."}
              </span>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
