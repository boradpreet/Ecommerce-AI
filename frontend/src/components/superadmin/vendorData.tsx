"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "src/store/authStore";
import { apiFetch } from "src/lib/api";
import { formatPhone } from "src/lib/format";
import { Loader2, Users, Target, PhoneCall, Clock, Contact, Mic, Download, Music } from "lucide-react";

export interface AgentRow { id: number; name: string; voice_id: string; voice_provider: string; category?: string | null; subcategory?: string | null; lang?: string | null; status: string; created_at?: string; }
export interface CampaignRow { id: number; name: string; status: string; agent_name: string; leads_count: number; calls_count: number; created_at: string; }
export interface CallRow { id: number; lead_name: string; lead_phone: string; agent_name: string; voice_id?: string | null; campaign_name?: string | null; status: string; direction?: string; duration: string; sentiment: string; interest_score: number; recording_url?: string | null; created_at: string; }
export interface LeadRow { id: number; name: string; total: number; called: number; dnc: number; }
export interface VendorActivity {
  vendor_name: string;
  totals: { agents: number; campaigns: number; calls: number; minutes: number; leads: number };
  agents: AgentRow[];
  campaigns: CampaignRow[];
  calls: CallRow[];
  leads: LeadRow[];
}

// Shared fetch — one endpoint returns every dataset the vendor sees, scoped to this vendor.
export function useVendorActivity(vendorId: string | undefined) {
  const token = useAuthStore((s) => s.token);
  const [data, setData] = useState<VendorActivity | null>(null);
  const [loading, setLoading] = useState(true);

  // Route param may be "vendor_7" (prefixed) — the backend endpoint expects the numeric id.
  const numericId = vendorId ? (vendorId.startsWith("vendor_") ? vendorId.split("_")[1] : vendorId) : "";

  const load = useCallback(async () => {
    if (!token || !numericId) return;
    setLoading(true);
    try {
      const res = await apiFetch<VendorActivity>(`/superadmin/vendors/${numericId}/activity`, "GET", undefined, token);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token, numericId]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, reload: load };
}

/* ---------- downloads (CSV history + call audio) ---------- */

const numericVendorId = (vendorId: string) => (vendorId.startsWith("vendor_") ? vendorId.split("_")[1] : vendorId);

interface ReportCall {
  campaign_name: string; lead_name: string; lead_phone: string; agent_name: string;
  date: string; time: string; status: string; direction?: string; duration: string; sentiment: string;
  interest_score: number; recording_url?: string | null;
}

async function fetchDetailedReport(numericId: string, token: string, campaignId?: number) {
  const qs = campaignId != null ? `?campaign_id=${campaignId}` : "";
  return apiFetch<{ vendor_name: string; campaign_name: string | null; total_calls: number; calls: ReportCall[] }>(
    `/superadmin/vendors/${numericId}/report/detailed${qs}`, "GET", undefined, token,
  );
}

const csvCell = (v: string | number) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function saveCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const lines = [header.map(csvCell).join(",")];
  rows.forEach((r) => lines.push(r.map(csvCell).join(",")));
  const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

const CALL_CSV_HEADER = ["Campaign", "Lead Name", "Phone", "Agent", "Direction", "Date", "Time", "Status", "Call Duration", "Sentiment", "Interest %", "Recording URL"];
const callCsvRow = (c: ReportCall): (string | number)[] => [
  c.campaign_name, c.lead_name, formatPhone(c.lead_phone), c.agent_name, (c.direction || "OUTBOUND"),
  c.date, c.time, c.status, c.duration, c.sentiment, `${c.interest_score}%`, c.recording_url || "",
];

// Pull one vendor's call history (whole vendor or a single campaign) and save it as CSV.
async function downloadHistoryCsv(numericId: string, token: string, campaignId?: number, campaignName?: string) {
  const rep = await fetchDetailedReport(numericId, token, campaignId);
  const rows = (rep.calls || []).map(callCsvRow);
  const safe = (campaignName || rep.vendor_name || "vendor").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const kind = campaignId != null ? "campaign-report" : "call-logs";
  saveCsv(`${kind}-${safe}-${new Date().toISOString().slice(0, 10)}.csv`, CALL_CSV_HEADER, rows);
}

// Download a single call's audio recording.
async function downloadRecording(call: CallRow) {
  if (!call.recording_url) return;
  const safe = (call.lead_name || "call").replace(/[^a-z0-9]+/gi, "_").toLowerCase();
  const filename = `voqly_recording_${safe}_${call.id}.mp3`;
  try {
    const res = await fetch(call.recording_url);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  } catch {
    const a = document.createElement("a");
    a.href = call.recording_url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
  }
}

const DownloadBtn: React.FC<{ onClick: () => void; busy?: boolean; disabled?: boolean; label: string }> = ({ onClick, busy, disabled, label }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={busy || disabled}
    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#0b1931] hover:bg-slate-950 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[10px] font-black uppercase tracking-wider cursor-pointer transition"
  >
    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
    {label}
  </button>
);

/* ---------- shared presentation helpers ---------- */

const statusPill = (s: string) => {
  const u = (s || "").toUpperCase();
  if (u === "COMPLETED" || u === "ACTIVE") return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (u === "FAILED" || u === "DNC" || u === "INACTIVE") return "text-red-700 bg-red-50 border-red-200";
  if (u === "RUNNING" || u === "IN_PROGRESS") return "text-blue-700 bg-blue-50 border-blue-200";
  return "text-slate-600 bg-slate-50 border-slate-200";
};
const sentimentPill = (s: string) =>
  s === "POSITIVE" ? "text-emerald-700 bg-emerald-50" : s === "NEGATIVE" ? "text-red-700 bg-red-50" : "text-slate-600 bg-slate-100";

const th = "text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider p-3";
const td = "p-3 text-xs font-semibold text-slate-700";
const fmtDate = (s?: string) => (s ? new Date(s).toLocaleDateString() : "—");
const fmtDateTime = (s?: string) => (s ? new Date(s).toLocaleString() : "—");

const Section: React.FC<{ title: string; count: number; action?: React.ReactNode; children: React.ReactNode }> = ({ title, count, action, children }) => (
  <div className="bg-white border border-slate-200 rounded-3xl shadow-3xs overflow-hidden">
    <div className="min-h-12 px-5 py-2 border-b border-slate-100 flex items-center justify-between gap-3">
      <span className="text-xs font-black text-slate-800 uppercase tracking-wider">{title}</span>
      <div className="flex items-center gap-3">
        {action}
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{count}</span>
      </div>
    </div>
    {children}
  </div>
);

const Kpi: React.FC<{ icon: React.ElementType; label: string; value: React.ReactNode; color: string }> = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-3xs">
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}><Icon className="w-4 h-4" /></div>
    <div>
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</p>
      <p className="text-lg font-extrabold text-slate-900 leading-tight">{value}</p>
    </div>
  </div>
);

export const VendorDataLoading = () => (
  <div className="flex items-center justify-center py-20 text-slate-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading vendor data…</div>
);
export const VendorDataError = () => (
  <div className="py-20 text-center text-slate-400 text-sm">Could not load this vendor&apos;s data.</div>
);

/* ---------- per-section views (mirror the vendor dashboard) ---------- */

export function VendorAgentsView({ data }: { data: VendorActivity }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 select-none">
        <Kpi icon={Users} label="AI Agents" value={data.totals.agents} color="text-violet-600 bg-violet-50" />
        <Kpi icon={Mic} label="Voices in use" value={new Set(data.agents.map((a) => a.voice_id)).size} color="text-blue-600 bg-blue-50" />
      </div>
      <Section title="AI Agents" count={data.agents.length}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr className="border-b border-slate-100 bg-slate-50/50"><th className={th}>Agent</th><th className={th}>Voice · Provider</th><th className={th}>Category</th><th className={th}>Language</th><th className={th}>Onboarded</th><th className={th}>Status</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.agents.length === 0 ? (<tr><td className="p-6 text-center text-slate-400 text-xs" colSpan={6}>No agents.</td></tr>) :
                data.agents.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/40">
                    <td className={`${td} font-extrabold text-slate-900`}>{a.name}</td>
                    <td className={td}><span className="inline-flex items-center gap-1"><Mic className="w-3 h-3 text-slate-400" />{a.voice_id}<span className="text-slate-400 font-medium"> · {a.voice_provider}</span></span></td>
                    <td className={td}>{a.category || "—"}{a.subcategory ? ` / ${a.subcategory}` : ""}</td>
                    <td className={td}>{a.lang || "—"}</td>
                    <td className={`${td} text-slate-400`}>{fmtDate(a.created_at)}</td>
                    <td className={td}><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusPill(a.status)}`}>{a.status}</span></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

export function VendorCampaignsView({ data, vendorId }: { data: VendorActivity; vendorId: string }) {
  const token = useAuthStore((s) => s.token);
  const numericId = numericVendorId(vendorId);
  const [busyId, setBusyId] = useState<number | "all" | null>(null);

  const run = async (busyKey: number | "all", campaignId?: number, name?: string) => {
    if (!token) return;
    setBusyId(busyKey);
    try { await downloadHistoryCsv(numericId, token, campaignId, name); }
    finally { setBusyId(null); }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 select-none">
        <Kpi icon={Target} label="Campaigns" value={data.totals.campaigns} color="text-blue-600 bg-blue-50" />
        <Kpi icon={PhoneCall} label="Total Calls" value={data.totals.calls} color="text-emerald-600 bg-emerald-50" />
      </div>
      <Section
        title="Campaigns"
        count={data.campaigns.length}
        action={<DownloadBtn label="All history" busy={busyId === "all"} disabled={data.totals.calls === 0} onClick={() => run("all")} />}
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr className="border-b border-slate-100 bg-slate-50/50"><th className={th}>Campaign</th><th className={th}>Status</th><th className={th}>Agent</th><th className={th}>Leads</th><th className={th}>Calls</th><th className={th}>Created</th><th className={th}>Report</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.campaigns.length === 0 ? (<tr><td className="p-6 text-center text-slate-400 text-xs" colSpan={7}>No campaigns.</td></tr>) :
                data.campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/40">
                    <td className={`${td} font-extrabold text-slate-900`}>{c.name}</td>
                    <td className={td}><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusPill(c.status)}`}>{c.status}</span></td>
                    <td className={td}>{c.agent_name}</td>
                    <td className={`${td} font-mono`}>{c.leads_count}</td>
                    <td className={`${td} font-mono`}>{c.calls_count}</td>
                    <td className={`${td} text-slate-400`}>{fmtDate(c.created_at)}</td>
                    <td className={td}>
                      <button
                        type="button"
                        onClick={() => run(c.id, c.id, c.name)}
                        disabled={busyId === c.id || c.calls_count === 0}
                        title={c.calls_count === 0 ? "No calls to export" : "Download this campaign's call history"}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 hover:text-blue-900 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {busyId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} CSV
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

export function VendorLeadsView({ data }: { data: VendorActivity }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 select-none">
        <Kpi icon={Contact} label="Leads" value={data.totals.leads} color="text-rose-600 bg-rose-50" />
        <Kpi icon={Target} label="Lead Lists" value={data.leads.length} color="text-blue-600 bg-blue-50" />
      </div>
      <Section title="Lead Lists" count={data.leads.length}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr className="border-b border-slate-100 bg-slate-50/50"><th className={th}>List</th><th className={th}>Total</th><th className={th}>Called</th><th className={th}>DNC</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.leads.length === 0 ? (<tr><td className="p-6 text-center text-slate-400 text-xs" colSpan={4}>No lead lists.</td></tr>) :
                data.leads.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/40">
                    <td className={`${td} font-extrabold text-slate-900`}>{l.name}</td>
                    <td className={`${td} font-mono`}>{l.total}</td>
                    <td className={`${td} font-mono`}>{l.called}</td>
                    <td className={`${td} font-mono text-red-600`}>{l.dnc}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

export function VendorCallsView({ data, vendorId }: { data: VendorActivity; vendorId: string }) {
  const token = useAuthStore((s) => s.token);
  const numericId = numericVendorId(vendorId);
  const [busy, setBusy] = useState(false);

  const downloadAll = async () => {
    if (!token) return;
    setBusy(true);
    try { await downloadHistoryCsv(numericId, token); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 select-none">
        <Kpi icon={PhoneCall} label="Total Calls" value={data.totals.calls} color="text-emerald-600 bg-emerald-50" />
        <Kpi icon={Clock} label="Talk Minutes" value={data.totals.minutes} color="text-amber-600 bg-amber-50" />
      </div>
      <Section
        title="Call Logs (recent 200)"
        count={data.calls.length}
        action={<DownloadBtn label="Download CSV" busy={busy} disabled={data.totals.calls === 0} onClick={downloadAll} />}
      >
        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-slate-50 z-10"><tr className="border-b border-slate-100"><th className={th}>Contact</th><th className={th}>Campaign</th><th className={th}>Agent · Voice</th><th className={th}>Status</th><th className={th}>Duration</th><th className={th}>Sentiment</th><th className={th}>Interest</th><th className={th}>Date</th><th className={th}>Audio</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.calls.length === 0 ? (<tr><td className="p-6 text-center text-slate-400 text-xs" colSpan={9}>No calls yet.</td></tr>) :
                data.calls.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/40">
                    <td className={td}><div className="font-extrabold text-slate-900">{c.lead_name}</div><div className="text-[9px] text-slate-400 font-mono">{formatPhone(c.lead_phone)}</div></td>
                    <td className={td}>{c.campaign_name || "—"}</td>
                    <td className={td}>{c.agent_name}<span className="text-slate-400"> · {c.voice_id || "—"}</span></td>
                    <td className={td}>
                      <span className="inline-flex items-center gap-1">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusPill(c.status)}`}>{c.status}</span>
                        <span className={`text-[8px] font-black px-1 py-0.5 rounded ${(c.direction || "OUTBOUND").toUpperCase() === "INBOUND" ? "text-emerald-700 bg-emerald-50 border border-emerald-200" : "text-slate-500 bg-slate-100"}`}>{(c.direction || "OUTBOUND").toUpperCase() === "INBOUND" ? "IN" : "OUT"}</span>
                      </span>
                    </td>
                    <td className={`${td} font-mono`}>{c.duration}</td>
                    <td className={td}><span className={`text-[9px] font-bold px-2 py-0.5 rounded ${sentimentPill(c.sentiment)}`}>{c.sentiment}</span></td>
                    <td className={`${td} font-mono`}>{c.interest_score}%</td>
                    <td className={`${td} text-slate-400 whitespace-nowrap`}>{fmtDateTime(c.created_at)}</td>
                    <td className={td}>
                      {c.recording_url ? (
                        <button
                          type="button"
                          onClick={() => downloadRecording(c)}
                          title="Download call audio (.mp3)"
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                        >
                          <Music className="w-3.5 h-3.5" /> MP3
                        </button>
                      ) : <span className="text-[9px] text-slate-300 font-bold" title="No recording available">—</span>}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
