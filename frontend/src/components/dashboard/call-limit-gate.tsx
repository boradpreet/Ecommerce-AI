"use client";

import React, { useEffect, useState } from "react";
import { Phone, Mail, PhoneOff, X } from "lucide-react";
import { apiFetch } from "src/lib/api";
import { useAuthStore } from "src/store/authStore";

interface Usage {
  minutes_used: number;
  minutes_limit: number | null;
  minutes_remaining: number | null;
  limit_reached: boolean;
  contact_numbers: string[];
  contact_email: string;
}

/**
 * Watches the vendor's call-minute usage. When the admin-set allowance is used
 * up, outbound campaigns stop (enforced server-side) and this popup tells the
 * vendor to contact us to top up.
 */
export function CallLimitGate() {
  const token = useAuthStore((s) => s.token);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;
    const load = () => {
      apiFetch<Usage>("/dashboard/usage", "GET", undefined, token)
        .then((u) => { if (active) setUsage(u); })
        .catch(() => { /* ignore — never block the dashboard */ });
    };
    load();
    const interval = setInterval(load, 60000); // re-check every minute
    return () => { active = false; clearInterval(interval); };
  }, [token]);

  if (!usage || !usage.limit_reached || dismissed) return null;

  const numbers = usage.contact_numbers?.length ? usage.contact_numbers : ["+91 9033806717", "+91 9408307302"];
  const email = usage.contact_email || "business@onewebmart.com";

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-only">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border-t-4 border-orange-500 relative">
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-7 pt-8 pb-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-4">
            <PhoneOff className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-black text-slate-900">Free call minutes used up</h3>
          <p className="text-sm text-slate-500 font-semibold leading-relaxed mt-2">
            You&apos;ve used all {usage.minutes_limit ?? 100} of your free call minutes
            {typeof usage.minutes_used === "number" ? ` (${usage.minutes_used} min used)` : ""}.
            Your outbound campaigns have been paused. Contact us to add more minutes and resume calling.
          </p>
        </div>

        <div className="px-7 pb-7 space-y-2.5">
          {numbers.map((num) => (
            <a
              key={num}
              href={`tel:${num.replace(/\s/g, "")}`}
              className="flex items-center gap-3 w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl px-4 py-3 transition group"
            >
              <span className="w-9 h-9 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 fill-current" />
              </span>
              <span className="text-sm font-black text-slate-900 group-hover:text-orange-600 transition-colors">{num}</span>
            </a>
          ))}
          <a
            href={`mailto:${email}`}
            className="flex items-center gap-3 w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl px-4 py-3 transition group"
          >
            <span className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4" />
            </span>
            <span className="text-sm font-black text-slate-900 group-hover:text-orange-600 transition-colors break-all">{email}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
