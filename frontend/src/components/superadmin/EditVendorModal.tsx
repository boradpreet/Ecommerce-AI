import React, { useState, useEffect, useCallback } from "react";
import { X, Building2, Mail, Globe, Hash, CreditCard, Loader2, Phone, AlertTriangle } from "lucide-react";
import { apiFetch } from "src/lib/api";
import { useAuthStore } from "src/store/authStore";
import { useSuperAdmin } from "src/context/SuperAdminContext";

interface EditVendorModalProps {
  vendorId: number;
  onClose: () => void;
}

// Flags obviously-fake / non-dialable caller numbers before they're saved.
// Returns a human-readable warning, or "" when the number looks OK (or is empty).
export function phoneWarning(raw: string): string {
  const v = (raw || "").trim();
  if (!v) return "";
  const cleaned = v.replace(/[^\d+]/g, "");
  if (!cleaned.startsWith("+")) {
    return "Use full E.164 format starting with a country code, e.g. +14155238886.";
  }
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) {
    return "This isn't a valid phone number — E.164 numbers are 8–15 digits including the country code.";
  }
  // US / Canada fictional-number checks (+1 followed by 10 digits)
  if (cleaned.startsWith("+1") && digits.length === 11) {
    const areaCode = digits.slice(1, 4);
    const exchange = digits.slice(4, 7);
    if (areaCode === "555") {
      return "Area code 555 isn't a real US area code — Twilio/Plivo can't own or dial from it. Buy a real number in the provider console.";
    }
    if (exchange === "555") {
      return "555 exchange numbers (e.g. 555-01xx) are reserved fictional numbers and can't place real calls. Use a real purchased number.";
    }
  }
  return "";
}

export default function EditVendorModal({ vendorId, onClose }: EditVendorModalProps) {
  const token = useAuthStore((s) => s.token);
  const { handleEditVendor } = useSuperAdmin();
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    owner_email: "",
    industry: "SaaS",
    concurrency_limit: 100,
    prepaid_balance: 250.00,
    plan_tier: "starter",
    telephony_provider: "plivo",
    twilio_number: "",
    plivo_number: "",
  });

  const fetchDetail = useCallback(async () => {
    if (!token) return;
    setLoadingDetail(true);
    setError("");
    try {
      const data = await apiFetch<{
        name: string;
        slug: string;
        email: string;
        industry: string;
        concurrency_limit: number;
        prepaid_balance: number;
        plan_tier: string;
        telephony_provider?: string;
        twilio_number?: string;
        plivo_number?: string;
      }>(`/superadmin/vendors/${vendorId}`, "GET", undefined, token);

      setFormData({
        name: data.name || "",
        slug: data.slug || "",
        owner_email: data.email || "",
        industry: data.industry || "SaaS",
        concurrency_limit: data.concurrency_limit ?? 100,
        prepaid_balance: data.prepaid_balance ?? 0.00,
        plan_tier: data.plan_tier || "starter",
        telephony_provider: data.telephony_provider || "plivo",
        twilio_number: data.twilio_number || "",
        plivo_number: data.plivo_number || "",
      });
    } catch {
      setError("Failed to fetch vendor configurations. Please try again.");
    } finally {
      setLoadingDetail(false);
    }
  }, [vendorId, token]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "concurrency_limit" || name === "prepaid_balance" ? Number(value) : value,
    }));
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    setFormData((prev) => ({ ...prev, name, slug }));
  };

  const activeNumber = formData.telephony_provider === "twilio" ? formData.twilio_number : formData.plivo_number;
  const numberWarning = phoneWarning(activeNumber);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Catch obviously-fake caller numbers before they reach the dialer.
    if (numberWarning) {
      setError(numberWarning);
      return;
    }

    setSubmitting(true);
    try {
      await handleEditVendor(vendorId, formData);
      onClose();
    } catch (err) {
      setError((err as Error).message || "Failed to update vendor.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-[90vw] sm:max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto my-8" style={{ animation: "popIn .35s ease both" }}>
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Edit Vendor Registry
          </h2>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-full text-slate-400 hover:bg-slate-200 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loadingDetail ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
            <span className="text-xs font-semibold uppercase tracking-wider">Loading configurations...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-600 text-xs font-bold border border-red-100">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Company Name</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleNameChange}
                    placeholder="Acme Corp"
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-colors font-medium text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">URL Slug</label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="slug"
                    required
                    value={formData.slug}
                    onChange={handleChange}
                    placeholder="acme-corp"
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-colors font-medium text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Owner Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    name="owner_email"
                    required
                    value={formData.owner_email}
                    onChange={handleChange}
                    placeholder="admin@acme.com"
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-colors font-medium text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Industry</label>
                  <select
                    name="industry"
                    aria-label="Industry"
                    value={formData.industry}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-colors font-medium text-slate-900 cursor-pointer"
                  >
                    <option value="SaaS">SaaS</option>
                    <option value="E-commerce">E-commerce</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Finance">Finance</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Active Plan Tier</label>
                  <select
                    name="plan_tier"
                    aria-label="Active Plan Tier"
                    value={formData.plan_tier}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-colors font-medium text-slate-900 cursor-pointer"
                  >
                    <option value="starter">Starter</option>
                    <option value="growth">Growth</option>
                    <option value="professional">Professional</option>
                    <option value="free">Free</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Concurrency Limit</label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      name="concurrency_limit"
                      aria-label="Concurrency Limit"
                      required
                      min="1"
                      value={formData.concurrency_limit}
                      onChange={handleChange}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-colors font-medium text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Prepaid Balance ($)</label>
                  <div className="relative">
                    <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      name="prepaid_balance"
                      aria-label="Prepaid Balance in dollars"
                      required
                      min="0"
                      step="0.01"
                      value={formData.prepaid_balance}
                      onChange={handleChange}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-colors font-medium text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* ── Telephony (which provider/number this vendor dials from) ── */}
              <div className="pt-2 border-t border-slate-100">
                <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> Telephony / Outbound Calling
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Provider</label>
                    <select
                      name="telephony_provider"
                      aria-label="Telephony Provider"
                      value={formData.telephony_provider}
                      onChange={handleChange}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-colors font-medium text-slate-900 cursor-pointer"
                    >
                      <option value="plivo">Plivo</option>
                      <option value="twilio">Twilio</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      {formData.telephony_provider === "twilio" ? "Twilio Number" : "Plivo Number"}
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        name={formData.telephony_provider === "twilio" ? "twilio_number" : "plivo_number"}
                        aria-label="Outbound caller number"
                        value={formData.telephony_provider === "twilio" ? formData.twilio_number : formData.plivo_number}
                        onChange={handleChange}
                        placeholder="+14155550123"
                        className={`w-full pl-9 pr-4 py-2 bg-slate-50 border rounded-xl text-sm outline-none transition-colors font-medium text-slate-900 font-mono ${
                          numberWarning ? "border-amber-400 focus:border-amber-500" : "border-slate-200 focus:border-blue-500"
                        }`}
                      />
                    </div>
                  </div>
                </div>
                {numberWarning ? (
                  <div className="mt-2 flex items-start gap-1.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-semibold leading-relaxed">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{numberWarning}</span>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 font-medium mt-1.5">
                    Use E.164 format (e.g. +14155550123). The vendor&apos;s campaigns will dial from this number. Twilio/Plivo API keys are set server-side in the backend environment.
                  </p>
                )}
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? "Saving changes..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
