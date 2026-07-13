"use client";

import React, { useMemo, useState } from "react";
import {
  Calculator, Sparkles, Radio, Mic, Volume2, FileText, PhoneCall,
  Clock, Wallet, RotateCcw, Info,
} from "lucide-react";

/**
 * Interactive per-minute / per-call cost estimator for the Voqly AI-calling stack.
 * Pure client-side "what-if" tool — no backend. Rates are pre-filled from research
 * (see CALL_COST_MODEL.md, researched 2026-07-07) and are fully editable so the
 * estimate stays accurate as vendor prices drift.
 */

// ---- Default rates (editable in the UI) ----
const DEFAULTS = {
  // Gemini Live gemini-3.1-flash-live-preview (USD)
  audioInPerMin: 0.005, // caller speech -> Gemini (STT), billed continuously
  audioOutPerMin: 0.018, // agent speech from Gemini (TTS), billed on talk time
  transcriptOverheadPerMin: 0.002, // input+output transcription text tokens
  fixedPerCallUsd: 0.007, // system prompt + post-call analysis + embedding
  // Telephony
  plivoLocalPerMinInr: 0.6,
  plivoTollFreePerMinInr: 1.3,
  twilioMobilePerMinUsd: 0.0075,
  twilioInboundPerMinUsd: 0.0045,
  // FX
  fxInrPerUsd: 86,
};

type Carrier = "plivo_local" | "plivo_tollfree" | "twilio_mobile" | "twilio_inbound";

const CARRIERS: { key: Carrier; label: string }[] = [
  { key: "plivo_local", label: "Plivo · India local" },
  { key: "plivo_tollfree", label: "Plivo · Toll-free" },
  { key: "twilio_mobile", label: "Twilio · India mobile" },
  { key: "twilio_inbound", label: "Twilio · Inbound" },
];

export default function CostCalculatorPage() {
  const [rates, setRates] = useState(DEFAULTS);
  const [carrier, setCarrier] = useState<Carrier>("plivo_local");
  const [avgMinutes, setAvgMinutes] = useState(3);
  const [talkPct, setTalkPct] = useState(50); // agent talk share
  const [monthlyCalls, setMonthlyCalls] = useState(1000);

  const setRate = (k: keyof typeof DEFAULTS, v: number) =>
    setRates((r) => ({ ...r, [k]: isNaN(v) ? 0 : v }));
  const reset = () => setRates(DEFAULTS);

  const c = useMemo(() => {
    const fx = rates.fxInrPerUsd || 0;
    const talk = Math.min(Math.max(talkPct, 0), 100) / 100;

    // Gemini per minute (USD)
    const gAudioIn = rates.audioInPerMin;
    const gAudioOut = rates.audioOutPerMin * talk;
    const gOverhead = rates.transcriptOverheadPerMin;
    const geminiPerMinUsd = gAudioIn + gAudioOut + gOverhead;

    // Telephony per minute (USD)
    let telephonyPerMinUsd = 0;
    if (carrier === "plivo_local") telephonyPerMinUsd = rates.plivoLocalPerMinInr / fx;
    else if (carrier === "plivo_tollfree") telephonyPerMinUsd = rates.plivoTollFreePerMinInr / fx;
    else if (carrier === "twilio_mobile") telephonyPerMinUsd = rates.twilioMobilePerMinUsd;
    else telephonyPerMinUsd = rates.twilioInboundPerMinUsd;

    const perMinUsd = geminiPerMinUsd + telephonyPerMinUsd;
    const fixedUsd = rates.fixedPerCallUsd;
    const perCallUsd = perMinUsd * avgMinutes + fixedUsd;
    const monthlyUsd = perCallUsd * monthlyCalls;

    const toInr = (u: number) => u * fx;

    return {
      // breakdown per call (USD) for the bar
      breakdown: [
        { key: "in", label: "Gemini audio in", icon: Mic, color: "bg-violet-400", usd: gAudioIn * avgMinutes },
        { key: "out", label: "Gemini audio out", icon: Volume2, color: "bg-violet-600", usd: gAudioOut * avgMinutes },
        { key: "tx", label: "Transcripts", icon: FileText, color: "bg-fuchsia-400", usd: gOverhead * avgMinutes },
        { key: "tel", label: "Telephony", icon: Radio, color: "bg-blue-500", usd: telephonyPerMinUsd * avgMinutes },
        { key: "fix", label: "Fixed / call", icon: Sparkles, color: "bg-rose-400", usd: fixedUsd },
      ],
      geminiPerMinUsd,
      telephonyPerMinUsd,
      perMinUsd,
      perCallUsd,
      monthlyUsd,
      toInr,
    };
  }, [rates, carrier, avgMinutes, talkPct, monthlyCalls]);

  const inr = (u: number) =>
    `₹${c.toInr(u).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const usd = (u: number) =>
    `$${u.toLocaleString(undefined, { minimumFractionDigits: u < 1 ? 3 : 2, maximumFractionDigits: u < 1 ? 3 : 2 })}`;

  const callTotalUsd = c.breakdown.reduce((s, b) => s + b.usd, 0);

  const rateFields: { k: keyof typeof DEFAULTS; label: string; unit: string; step: number }[] = [
    { k: "audioInPerMin", label: "Gemini audio in", unit: "$/min", step: 0.001 },
    { k: "audioOutPerMin", label: "Gemini audio out", unit: "$/min", step: 0.001 },
    { k: "transcriptOverheadPerMin", label: "Transcript overhead", unit: "$/min", step: 0.001 },
    { k: "fixedPerCallUsd", label: "Fixed per call", unit: "$/call", step: 0.001 },
    { k: "plivoLocalPerMinInr", label: "Plivo local", unit: "₹/min", step: 0.05 },
    { k: "plivoTollFreePerMinInr", label: "Plivo toll-free", unit: "₹/min", step: 0.05 },
    { k: "twilioMobilePerMinUsd", label: "Twilio mobile", unit: "$/min", step: 0.001 },
    { k: "twilioInboundPerMinUsd", label: "Twilio inbound", unit: "$/min", step: 0.001 },
    { k: "fxInrPerUsd", label: "FX rate", unit: "₹/$", step: 0.5 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200/50 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Calculator className="w-6 h-6 text-violet-600" /> Call Cost Calculator
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            What-if estimator for the Gemini Live + telephony stack. Rates pre-filled from research (Jul 2026) — edit any to match live vendor pricing.
          </p>
        </div>
        <button
          onClick={reset}
          className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl px-3 py-2 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset rates
        </button>
      </div>

      {/* Result KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Cost per minute", primary: inr(c.perMinUsd), sub: usd(c.perMinUsd), icon: Clock, color: "text-violet-600 bg-violet-50" },
          { label: `Cost per call (${avgMinutes} min avg)`, primary: inr(c.perCallUsd), sub: usd(c.perCallUsd), icon: PhoneCall, color: "text-blue-600 bg-blue-50" },
          { label: `Monthly (${monthlyCalls.toLocaleString()} calls)`, primary: inr(c.monthlyUsd), sub: usd(c.monthlyUsd), icon: Wallet, color: "text-emerald-600 bg-emerald-50" },
        ].map((k) => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${k.color}`}><k.icon className="w-5 h-5" /></div>
            <div className="min-w-0">
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider truncate">{k.label}</p>
              <p className="text-xl font-black text-slate-900 leading-tight font-mono truncate">{k.primary}</p>
              <p className="text-[10px] text-slate-400 font-mono">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-3xs space-y-5">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Scenario</h4>

          {/* Carrier */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 mb-1.5 block">Telephony route</label>
            <div className="grid grid-cols-2 gap-2">
              {CARRIERS.map((cr) => (
                <button
                  key={cr.key}
                  onClick={() => setCarrier(cr.key)}
                  className={`text-xs font-bold rounded-xl px-3 py-2.5 border transition ${
                    carrier === cr.key
                      ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {cr.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders / numbers */}
          <div>
            <div className="flex justify-between items-baseline mb-1.5">
              <label className="text-[11px] font-bold text-slate-600">Avg call length</label>
              <span className="text-xs font-black text-slate-900 font-mono">{avgMinutes} min</span>
            </div>
            <input type="range" min={0.5} max={15} step={0.5} value={avgMinutes}
              onChange={(e) => setAvgMinutes(parseFloat(e.target.value))}
              className="w-full accent-violet-600" />
          </div>

          <div>
            <div className="flex justify-between items-baseline mb-1.5">
              <label className="text-[11px] font-bold text-slate-600">Agent talk share</label>
              <span className="text-xs font-black text-slate-900 font-mono">{talkPct}%</span>
            </div>
            <input type="range" min={0} max={100} step={5} value={talkPct}
              onChange={(e) => setTalkPct(parseFloat(e.target.value))}
              className="w-full accent-violet-600" />
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <Info className="w-3 h-3" /> Drives Gemini audio-output cost — the most expensive line.
            </p>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 mb-1.5 block">Monthly call volume</label>
            <input type="number" min={0} value={monthlyCalls}
              onChange={(e) => setMonthlyCalls(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full text-sm font-mono font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500/40" />
          </div>
        </div>

        {/* Per-call breakdown */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-3xs space-y-4">
          <div className="flex items-baseline justify-between">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Per-call breakdown</h4>
            <span className="text-sm font-black text-slate-900 font-mono">{inr(callTotalUsd)}</span>
          </div>

          {/* Stacked bar */}
          <div className="flex w-full h-3 rounded-full overflow-hidden bg-slate-100">
            {c.breakdown.map((b) => (
              <div key={b.key} className={b.color}
                style={{ width: `${callTotalUsd > 0 ? (b.usd / callTotalUsd) * 100 : 0}%` }}
                title={`${b.label}: ${inr(b.usd)}`} />
            ))}
          </div>

          <div className="space-y-1.5">
            {c.breakdown.map((b) => (
              <div key={b.key} className="flex items-center gap-2.5 text-xs">
                <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${b.color}`} />
                <b.icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-slate-600 font-medium flex-1 truncate">{b.label}</span>
                <span className="text-slate-400 font-mono">{callTotalUsd > 0 ? Math.round((b.usd / callTotalUsd) * 100) : 0}%</span>
                <span className="text-slate-900 font-bold font-mono w-16 text-right">{inr(b.usd)}</span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-1 text-[11px] text-slate-500 font-medium">
            <div className="flex justify-between"><span>Gemini Live / min</span><span className="font-mono font-bold text-slate-700">{inr(c.geminiPerMinUsd)} · {usd(c.geminiPerMinUsd)}</span></div>
            <div className="flex justify-between"><span>Telephony / min</span><span className="font-mono font-bold text-slate-700">{inr(c.telephonyPerMinUsd)} · {usd(c.telephonyPerMinUsd)}</span></div>
          </div>
        </div>
      </div>

      {/* Editable rates */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-3xs">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
          Billing Rates <span className="text-slate-300 normal-case font-semibold">— edit to match live pricing</span>
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {rateFields.map((f) => (
            <div key={f.k} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <label className="text-[10px] font-bold text-slate-600 block truncate">{f.label}</label>
              <div className="flex items-center gap-1 mt-1">
                <input type="number" step={f.step} value={rates[f.k]}
                  onChange={(e) => setRate(f.k, parseFloat(e.target.value))}
                  className="w-full text-[11px] font-black text-slate-900 font-mono bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-violet-500/40" />
                <span className="text-[9px] text-slate-400 font-bold whitespace-nowrap">{f.unit}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-3 flex items-center gap-1">
          <Info className="w-3 h-3" /> Model: <span className="font-mono">gemini-3.1-flash-live-preview</span>. See <span className="font-mono">CALL_COST_MODEL.md</span> for sources & the re-verify checklist.
        </p>
      </div>
    </div>
  );
}
