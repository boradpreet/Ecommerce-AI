"use client";

import React, { useState } from "react";
import { MarketingShell, PageHero } from "src/components/marketing/marketing-shell";
import { Mail, Phone, Globe, Clock, Check, Send } from "lucide-react";

const CONTACT_EMAIL = "business@onewebmart.com";
const PHONES = ["+91 9033806717", "+91 9408307302"];

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "" });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // Open the visitor's mail client with a prefilled message to our inbox.
    const subject = encodeURIComponent(`Voqly enquiry from ${form.name || "website visitor"}`);
    const body = encodeURIComponent(
      `Name: ${form.name}\nWork email: ${form.email}\nCompany: ${form.company || "-"}\n\n${form.message}`
    );
    if (typeof window !== "undefined") {
      window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    }
    setSent(true);
  };

  return (
    <MarketingShell>
      <div className="space-y-16">
        <PageHero
          eyebrow="Contact Us"
          title="Let's talk about your"
          highlight="calls"
          subtitle="Questions about pricing, compliance or a custom rollout? Send us a note and our team will get back within one business day."
        />

        <div className="grid md:grid-cols-5 gap-8 max-w-4xl mx-auto w-full">
          {/* Info column */}
          <div className="md:col-span-2 space-y-7">
            <div>
              <h2 className="text-lg font-black text-slate-900">Get in touch</h2>
              <p className="text-sm text-slate-500 font-medium mt-1">Reach the Voqly AI team directly — we usually reply within one business day.</p>
            </div>

            <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-start gap-3 group">
              <span className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center shrink-0"><Mail className="w-4 h-4" /></span>
              <div>
                <h3 className="text-sm font-black text-slate-900">Email us</h3>
                <p className="text-sm text-slate-500 font-medium group-hover:text-orange-600 transition-colors break-all">{CONTACT_EMAIL}</p>
              </div>
            </a>

            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center shrink-0"><Phone className="w-4 h-4" /></span>
              <div>
                <h3 className="text-sm font-black text-slate-900">Call us</h3>
                {PHONES.map((p) => (
                  <a key={p} href={`tel:${p.replace(/\s/g, "")}`} className="block text-sm text-slate-500 font-medium hover:text-orange-600 transition-colors">{p}</a>
                ))}
              </div>
            </div>

            <a href="https://onewebmart.com/" target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 group">
              <span className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center shrink-0"><Globe className="w-4 h-4" /></span>
              <div>
                <h3 className="text-sm font-black text-slate-900">Our website</h3>
                <p className="text-sm text-slate-500 font-medium group-hover:text-orange-600 transition-colors">onewebmart.com</p>
              </div>
            </a>

            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center shrink-0"><Clock className="w-4 h-4" /></span>
              <div>
                <h3 className="text-sm font-black text-slate-900">Hours</h3>
                <p className="text-sm text-slate-500 font-medium">Mon – Sat, 9:00 – 19:00 IST</p>
              </div>
            </div>
          </div>

          {/* Form column */}
          <div className="md:col-span-3">
            {sent ? (
              <div className="bg-white border border-slate-200/70 rounded-3xl p-10 text-center shadow-sm flex flex-col items-center gap-4">
                <span className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><Check className="w-7 h-7" /></span>
                <h3 className="text-xl font-black text-slate-900">Thanks, {form.name || "there"}!</h3>
                <p className="text-sm text-slate-500 font-medium max-w-sm">
                  Your email draft to <span className="font-bold text-slate-700">{CONTACT_EMAIL}</span> is ready in your mail app — just hit send and we&apos;ll get back to you within one business day.
                </p>
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-xs font-black uppercase tracking-wider text-orange-600 hover:text-orange-700">Open mail app again</a>
              </div>
            ) : (
              <form onSubmit={submit} className="bg-white border border-slate-200/70 rounded-3xl p-7 shadow-sm space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Name" value={form.name} onChange={(v) => update("name", v)} required placeholder="Jane Cooper" />
                  <Field label="Work email" type="email" value={form.email} onChange={(v) => update("email", v)} required placeholder="jane@company.com" />
                </div>
                <Field label="Company" value={form.company} onChange={(v) => update("company", v)} placeholder="Acme Inc." />
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Message</label>
                  <textarea
                    required
                    rows={4}
                    value={form.message}
                    onChange={(e) => update("message", e.target.value)}
                    placeholder="Tell us what you're building..."
                    className="w-full bg-slate-50/60 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-orange-500 transition-colors resize-none"
                  />
                </div>
                <button type="submit" className="w-full h-12 bg-black hover:bg-slate-800 text-white text-xs font-black rounded-full flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer uppercase tracking-wider">
                  <Send className="w-3.5 h-3.5 shrink-0" />
                  Send message
                </button>
                <p className="text-[11px] text-slate-400 font-medium text-center">
                  Prefer email? Write to <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold text-slate-600 hover:text-orange-600">{CONTACT_EMAIL}</a>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </MarketingShell>
  );
}

function Field({ label, value, onChange, type = "text", required = false, placeholder = "" }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-50/60 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-orange-500 transition-colors"
      />
    </div>
  );
}
