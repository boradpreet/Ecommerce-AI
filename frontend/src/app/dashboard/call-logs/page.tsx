"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "src/store/authStore";
import { useRouter } from "next/navigation";
import { CallLogsTab } from "src/components/dashboard/call-logs-tab";
import { apiFetch } from "src/lib/api";
import { formatPhone } from "src/lib/format";
import { Loader2, X, Archive, RotateCcw, FileDown, FileText, Send, MailCheck, MessageCircle } from "lucide-react";
import { ConfirmModal } from "src/components/dashboard/confirm-modal";

function escapeHtml(s: string): string {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function resolveRecordingUrl(rawUrl?: string | null): string {
  if (!rawUrl) return "";
  const url = rawUrl.trim();
  if (typeof window !== "undefined") {
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (isLocal && url.includes("/api/v1/calls/recordings/")) {
      const pathIndex = url.indexOf("/api/v1/calls/recordings/");
      return `http://localhost:5011${url.substring(pathIndex)}`;
    }
  }
  return url;
}

interface CallLog {
  id: number;
  lead_name: string;
  lead_phone: string;
  agent_name: string;
  agent_id: number;
  campaign_id?: number | null;
  campaign_name?: string | null;
  status: string;
  direction?: string;
  duration: string;
  duration_seconds?: number;
  sentiment: string;
  interest_score?: number;
  recording_url?: string;
  created_at?: string;
  lead_email?: string;
  wants_details?: boolean;
  details_sent?: boolean;
  details_sent_to?: string | null;
}

interface TranscriptLine {
  speaker: string;
  text: string;
}

interface TranscriptResponse {
  dialogue?: TranscriptLine[];
  summary?: string;
  sentiment?: string;
  interest_score?: number;
  recording_url?: string;
  wants_details?: boolean;
  details_sent?: boolean;
  details_sent_to?: string | null;
}

export default function DashboardCallLogsPage() {
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const router = useRouter();
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);
  const [selectedCallTranscript, setSelectedCallTranscript] = useState<TranscriptResponse | null>(null);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedLogs, setArchivedLogs] = useState<CallLog[]>([]);
  const [loadingArchived, setLoadingArchived] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [sendingDetails, setSendingDetails] = useState(false);
  const [detailsResult, setDetailsResult] = useState<{ ok: boolean; text: string } | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
  });

  const fetchCallLogs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiFetch<CallLog[]>("/dashboard/calls", "GET", undefined, token);
      setCallLogs(Array.isArray(data) ? data : []);
    } catch {
      // Backend offline — show empty state
      setCallLogs([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const handleViewTranscript = async (call: CallLog) => {
    if (!token) return;
    setSelectedCall(call);
    setTranscriptOpen(true);
    setLoadingTranscript(true);
    setDetailsResult(null);
    try {
      const data = await apiFetch<TranscriptResponse>(`/dashboard/calls/${call.id}/transcript`, "GET", undefined, token);
      setSelectedCallTranscript(data);
    } catch {
      setSelectedCallTranscript(null);
    } finally {
      setLoadingTranscript(false);
    }
  };

  const handleSendDetails = async () => {
    if (!token || !selectedCall) return;
    setSendingDetails(true);
    setDetailsResult(null);
    try {
      const res = await apiFetch<{ status?: string; ok?: boolean; message?: string }>(
        `/dashboard/calls/${selectedCall.id}/send-details`, "POST", undefined, token,
      );
      setDetailsResult({ ok: !!res?.ok, text: res?.message || (res?.ok ? "Details sent." : "Could not send details.") });
      // refresh so the transcript + list badges reflect the new state
      const fresh = await apiFetch<TranscriptResponse>(`/dashboard/calls/${selectedCall.id}/transcript`, "GET", undefined, token);
      setSelectedCallTranscript(fresh);
      fetchCallLogs();
    } catch (e) {
      setDetailsResult({ ok: false, text: e instanceof Error ? e.message : "Failed to send details." });
    } finally {
      setSendingDetails(false);
    }
  };

  const handleRemoveAllCallLogs = () => {
    if (!token) return;
    setConfirmModal({
      isOpen: true,
      title: "Archive All Call Logs",
      message: "Archive all call logs? They'll be moved to Archived and can be restored for 30 days before being permanently deleted.",
      onConfirm: async () => {
        try {
          await apiFetch("/dashboard/calls", "DELETE", undefined, token);
          setCallLogs([]);
          if (showArchived) loadArchived();
        } catch (err) {
          console.error(err);
          setAlertModal({
            isOpen: true,
            title: "Error Archiving Logs",
            message: "Failed to archive call history.",
          });
        }
      }
    });
  };

  const loadArchived = useCallback(async () => {
    if (!token) return;
    setLoadingArchived(true);
    try {
      const data = await apiFetch<CallLog[]>("/dashboard/calls/archived", "GET", undefined, token);
      setArchivedLogs(Array.isArray(data) ? data : []);
    } catch {
      setArchivedLogs([]);
    } finally {
      setLoadingArchived(false);
    }
  }, [token]);

  const toggleArchivedView = () => {
    const next = !showArchived;
    setShowArchived(next);
    if (next) loadArchived();
  };

  const restoreCalls = async (ids?: number[]) => {
    if (!token) return;
    try {
      await apiFetch("/dashboard/calls/restore", "POST", ids ? { call_ids: ids } : {}, token);
      await Promise.all([fetchCallLogs(), loadArchived()]);
    } catch {
      setAlertModal({ isOpen: true, title: "Restore failed", message: "Could not restore the archived logs." });
    }
  };

  const downloadRecording = async (call: CallLog) => {
    const recUrl = resolveRecordingUrl(call.recording_url);
    if (!recUrl) return;
    const safe = (call.lead_name || "call").replace(/[^a-z0-9]+/gi, "_").toLowerCase();
    const filename = `voqly_recording_${safe}_${call.id}.wav`;
    try {
      const res = await fetch(recUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback for CORS-friendly / same-origin hosts
      const a = document.createElement("a");
      a.href = recUrl; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }
  };

  const downloadTranscriptCSV = () => {
    if (!selectedCall) return;
    const lines = selectedCallTranscript?.dialogue || [];
    let csv = "data:text/csv;charset=utf-8,";
    csv += "Voqly AI Call Transcript\n";
    csv += `Prospect,${selectedCall.lead_name}\nPhone,${formatPhone(selectedCall.lead_phone)}\nAgent,${selectedCall.agent_name}\nStatus,${selectedCall.status}\nDuration,${selectedCall.duration}\n\n`;
    csv += "SPEAKER,MESSAGE\n";
    lines.forEach((l) => { csv += `"${l.speaker}","${(l.text || "").replace(/"/g, '""')}"\n`; });
    const safe = (selectedCall.lead_name || "call").replace(/[^a-z0-9]+/gi, "_").toLowerCase();
    const a = document.createElement("a");
    a.href = encodeURI(csv);
    a.download = `voqly_transcript_${safe}_${selectedCall.id}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const printTranscriptPDF = () => {
    if (!selectedCall) return;
    const lines = selectedCallTranscript?.dialogue || [];
    const rows = lines.map((l) => `<div style="margin:10px 0;"><strong>${l.speaker === "agent" ? "Agent" : "Customer"}:</strong> ${escapeHtml(l.text || "")}</div>`).join("");
    const html = `<!doctype html><html><head><title>Transcript ${selectedCall.id}</title>
<style>body{font-family:Arial,Helvetica,sans-serif;padding:32px;color:#0f172a;} h1{font-size:18px;margin:0 0 4px;} .meta{color:#475569;font-size:12px;margin-bottom:16px;} .sum{background:#f8fafc;border:1px solid #e2e8f0;padding:12px;border-radius:8px;margin:12px 0;font-size:13px;}</style>
</head><body>
<h1>Voqly AI &mdash; Call Transcript</h1>
<div class="meta">${escapeHtml(selectedCall.lead_name)} &middot; ${escapeHtml(formatPhone(selectedCall.lead_phone))} &middot; Agent: ${escapeHtml(selectedCall.agent_name)} &middot; ${escapeHtml(selectedCall.status)} &middot; ${escapeHtml(selectedCall.duration)}</div>
${selectedCallTranscript?.summary ? `<div class="sum"><strong>Summary:</strong> ${escapeHtml(selectedCallTranscript.summary)}</div>` : ""}
<hr/>
${rows || "<p>No dialogue recorded.</p>"}
</body></html>`;
    const w = window.open("", "_blank", "width=820,height=640");
    if (!w) {
      setAlertModal({ isOpen: true, title: "Popup blocked", message: "Allow popups for this site to save the transcript as PDF." });
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 350);
  };

  useEffect(() => {
    if (!hasHydrated) return;
    if (!token) {
      router.replace("/");
      return;
    }
    fetchCallLogs();
  }, [hasHydrated, router, token, fetchCallLogs]);

  if (!hasHydrated || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">Loading call logs…</div>
    );
  }

  const [searchQuery, setSearchQuery] = useState("");
  const [campaignFilter, setCampaignFilter] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const syncSearch = () => {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        setSearchQuery(params.get("search") || "");
        const cid = params.get("campaign");
        setCampaignFilter(cid ? { id: cid, name: params.get("name") || `Campaign #${cid}` } : null);
      }
    };
    syncSearch();
    const interval = setInterval(syncSearch, 400);
    return () => clearInterval(interval);
  }, []);

  const clearCampaignFilter = () => {
    setCampaignFilter(null);
    router.push("/dashboard/call-logs");
  };

  // Download the full call history for the campaign currently being viewed.
  const downloadCampaignReport = async () => {
    if (!token || !campaignFilter) return;
    setDownloadingReport(true);
    try {
      const data = await apiFetch<{
        campaign_name: string | null;
        calls: Array<{
          campaign_name: string; lead_name: string; lead_phone: string; agent_name: string;
          date: string; time: string; status: string; duration: string; sentiment: string; interest_score: number;
        }>;
      }>(`/dashboard/campaigns/report/detailed?campaign_id=${campaignFilter.id}`, "GET", undefined, token);

      const rows = data.calls || [];
      if (rows.length === 0) {
        setAlertModal({ isOpen: true, title: "Nothing to download", message: "This campaign has no calls yet." });
        return;
      }
      const cell = (v: string | number) => {
        const s = String(v ?? "");
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const header = ["Campaign", "Lead Name", "Phone", "Agent", "Date", "Time", "Status", "Call Duration", "Sentiment", "Interest %"];
      const lines = [header.map(cell).join(",")];
      rows.forEach((r) => {
        lines.push([
          r.campaign_name, r.lead_name, formatPhone(r.lead_phone), r.agent_name,
          r.date, r.time, r.status, r.duration, r.sentiment, `${r.interest_score}%`,
        ].map(cell).join(","));
      });
      const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safe = (data.campaign_name || campaignFilter.name || "campaign").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      a.download = `campaign-report-${safe}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setAlertModal({ isOpen: true, title: "Download failed", message: "Could not generate the campaign report." });
    } finally {
      setDownloadingReport(false);
    }
  };

  const handleDeleteCall = (call: CallLog) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete this call log?",
      message: `Delete the call with ${call.lead_name || "this lead"}? It moves to Archived and can be restored for 30 days.`,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        if (!token) return;
        try {
          await apiFetch(`/dashboard/calls/${call.id}`, "DELETE", undefined, token);
          setCallLogs((prev) => prev.filter((c) => c.id !== call.id));
        } catch {
          setAlertModal({ isOpen: true, title: "Delete failed", message: "Could not delete this call log. Please try again." });
        }
      },
    });
  };

  const filteredCallLogs = callLogs.filter((c) => {
    if (campaignFilter && String(c.campaign_id ?? "") !== campaignFilter.id) return false;
    return (
      c.lead_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lead_phone.includes(searchQuery) ||
      c.agent_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <>
      {campaignFilter && (
        <div className="mb-4 flex items-center justify-between gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
          <span className="text-xs font-bold text-blue-800">
            Showing calls for campaign: <span className="font-extrabold">{campaignFilter.name}</span>
            <span className="ml-2 font-semibold text-blue-500">({filteredCallLogs.length})</span>
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={downloadCampaignReport}
              disabled={downloadingReport}
              title="Download this campaign's full call history"
              className="h-8 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-xs font-bold text-white rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              {downloadingReport ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
              <span>Download Report</span>
            </button>
            <button
              onClick={clearCampaignFilter}
              className="h-8 px-3 bg-white border border-blue-200 hover:bg-blue-100 text-xs font-bold text-blue-700 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /><span>Clear filter</span>
            </button>
          </div>
        </div>
      )}
      {!loading && (
        <div className="mb-3 flex justify-end">
          <button
            onClick={toggleArchivedView}
            className={`h-8 px-3 border text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${showArchived ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-800" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>{showArchived ? "Hide Archived" : "View Archived"}</span>
          </button>
        </div>
      )}
      {loading ? (
        <div className="min-h-[60vh] flex items-center justify-center text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mr-3" /> Loading call logs...
        </div>
      ) : (
        <CallLogsTab
          callLogs={filteredCallLogs}
          handleViewTranscript={handleViewTranscript}
          handleRemoveAllCallLogs={handleRemoveAllCallLogs}
          handleDeleteCall={handleDeleteCall}
        />
      )}

      {showArchived && !loading && (
        <div className="mt-6 bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
          <div className="h-14 px-6 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Archive className="w-3.5 h-3.5 text-slate-400" /> Archived Call Logs
              <span className="text-[10px] text-slate-400">(auto-deleted after 30 days)</span>
            </span>
            {archivedLogs.length > 0 && (
              <button
                onClick={() => restoreCalls()}
                className="h-8 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-600" /><span>Restore all</span>
              </button>
            )}
          </div>
          {loadingArchived ? (
            <div className="p-8 text-center text-slate-400 font-bold text-sm">Loading archived logs…</div>
          ) : archivedLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-semibold text-sm">No archived call logs.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {archivedLogs.map((call) => (
                <div key={call.id} className="flex items-center justify-between gap-3 px-6 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{call.lead_name}</p>
                    <p className="text-[11px] text-slate-400 font-medium truncate">
                      {formatPhone(call.lead_phone)} · {call.agent_name} · {call.duration}
                      {call.campaign_name ? ` · ${call.campaign_name}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => restoreCalls([call.id])}
                    className="h-8 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 rounded-lg transition flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-emerald-600" /><span>Restore</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {transcriptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 overflow-y-auto animate-fade-only">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 transform scale-100 animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-150 bg-slate-50/50">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                  <span>Call Log Details</span>
                </h2>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                  Call metadata, audio recording, and conversation transcript.
                </p>
              </div>
              <button
                onClick={() => {
                  setTranscriptOpen(false);
                  setSelectedCallTranscript(null);
                  setSelectedCall(null);
                }}
                aria-label="Close transcript modal"
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-150 border border-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 bg-slate-50 max-h-[70vh] overflow-y-auto min-h-[350px] space-y-6">
              
              {/* Call Details Banner */}
              {selectedCall && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
                  <div>
                    <span className="text-[9px] text-slate-450 font-bold uppercase tracking-wider block">Prospect</span>
                    <span className="text-xs font-extrabold text-slate-900 block mt-1">{selectedCall.lead_name}</span>
                    <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{formatPhone(selectedCall.lead_phone)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-450 font-bold uppercase tracking-wider block">Voice Agent</span>
                    <span className="text-xs font-extrabold text-slate-900 block mt-1">{selectedCall.agent_name}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Agent ID: {selectedCall.agent_id}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-450 font-bold uppercase tracking-wider block">Call Status</span>
                    <span className="mt-1 block">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider inline-block ${
                        selectedCall.status === "COMPLETED"
                          ? "text-emerald-700 bg-emerald-50 border border-emerald-100"
                          : "text-blue-700 bg-blue-50 border border-blue-100"
                      }`}>
                        {selectedCall.status}
                      </span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-450 font-bold uppercase tracking-wider block">Duration</span>
                    <span className="text-xs font-extrabold text-slate-900 block mt-1 font-mono">{selectedCall.duration}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Connection verified</span>
                  </div>
                </div>
              )}

              {loadingTranscript ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-3">
                  <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
                  <span className="text-xs font-bold">Loading call logs…</span>
                </div>
              ) : (
                <>
                  {/* Call Summary & Sentiment Card */}
                  {selectedCallTranscript && (
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4.5 shadow-xs text-left">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="space-y-0.5">
                          <h3 className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider">Call Summary & Notes</h3>
                          <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                            {selectedCallTranscript.summary || "No automated summary compiled."}
                          </p>
                        </div>
                        <div className="shrink-0 flex flex-wrap items-center gap-x-4 gap-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sentiment:</span>
                            <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                              selectedCallTranscript.sentiment?.toUpperCase() === "POSITIVE"
                                ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                : selectedCallTranscript.sentiment?.toUpperCase() === "NEGATIVE"
                                  ? "text-red-700 bg-red-50 border-red-200"
                                  : "text-slate-650 bg-slate-50 border-slate-200"
                            }`}>
                              {selectedCallTranscript.sentiment || "NEUTRAL"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Interest:</span>
                            <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                              (selectedCallTranscript.interest_score ?? 0) >= 70
                                ? "text-indigo-700 bg-indigo-50 border-indigo-200"
                                : (selectedCallTranscript.interest_score ?? 0) >= 30
                                  ? "text-amber-700 bg-amber-50 border-amber-200"
                                  : "text-rose-700 bg-rose-50 border-rose-200"
                            }`}>
                              {selectedCallTranscript.interest_score ?? 0}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Company details follow-up (WhatsApp + email) */}
                      <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Company details:</span>
                          {selectedCallTranscript.details_sent ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider text-emerald-700 bg-emerald-50 border-emerald-200">
                              <MailCheck className="w-3 h-3" /> Sent
                            </span>
                          ) : selectedCallTranscript.wants_details ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider text-amber-700 bg-amber-50 border-amber-200">
                              <Send className="w-3 h-3" /> Requested — not sent
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-400">Not sent</span>
                          )}
                          {selectedCallTranscript.details_sent_to && (
                            <span className="text-[10px] font-mono text-slate-400">{selectedCallTranscript.details_sent_to}</span>
                          )}
                        </div>
                        <button
                          onClick={handleSendDetails}
                          disabled={sendingDetails}
                          title="Send the company details to this caller on WhatsApp + email"
                          className="h-8 px-3.5 bg-[#0b1931] hover:bg-slate-950 disabled:opacity-50 text-white font-bold text-[10px] rounded-lg transition flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          {sendingDetails ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                          <span>{selectedCallTranscript.details_sent ? "Resend details" : "Send details now"}</span>
                        </button>
                      </div>
                      {detailsResult && (
                        <div className={`flex items-start gap-1.5 p-2.5 rounded-lg text-[10px] font-semibold border ${detailsResult.ok ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                          <MessageCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{detailsResult.text}</span>
                        </div>
                      )}

                      {/* Stored Call Voice Recording Playback */}
                      {(selectedCallTranscript?.recording_url || selectedCall?.recording_url) && (
                        <div className="pt-1.5 space-y-2">
                          <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-450 uppercase tracking-wider">
                            <span>🎙️</span>
                            <span>Stored Voice Record Call Recording</span>
                          </div>
                          <div className="bg-slate-50/80 border border-slate-100 p-3 rounded-xl flex items-center justify-between gap-4">
                            <audio 
                              controls 
                              src={resolveRecordingUrl(selectedCallTranscript?.recording_url || selectedCall?.recording_url)} 
                              className="flex-1 h-9 rounded-lg"
                            />
                            <button
                              onClick={() => {
                                const rawRec = selectedCallTranscript?.recording_url || selectedCall?.recording_url;
                                const recUrl = resolveRecordingUrl(rawRec);
                                if (selectedCall && recUrl) {
                                  downloadRecording({ ...selectedCall, recording_url: recUrl });
                                }
                              }}
                              className="h-9 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg transition-colors flex items-center justify-center shrink-0 shadow-sm cursor-pointer"
                            >
                              Download Audio
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dialogue Conversation Speech Feed */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider text-left pl-1">
                        Conversation Dialogue Transcript
                      </h3>
                      {!!selectedCallTranscript?.dialogue?.length && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={downloadTranscriptCSV}
                            className="h-7 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[10px] rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <FileDown className="w-3.5 h-3.5 text-slate-400" /><span>CSV</span>
                          </button>
                          <button
                            onClick={printTranscriptPDF}
                            className="h-7 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[10px] rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-400" /><span>Save as PDF</span>
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {!selectedCallTranscript?.dialogue?.length ? (
                      <div className="bg-white border border-slate-150 text-slate-400 rounded-2xl py-12 text-center text-xs font-semibold select-none shadow-xs">
                        No dialogue recorded for this call session.
                      </div>
                    ) : (
                      <div className="space-y-4 flex flex-col">
                        {selectedCallTranscript.dialogue.map((line: TranscriptLine, index: number) => {
                          const isAgent = line.speaker === "agent";
                          return (
                            <div 
                              key={index} 
                              className={`flex flex-col max-w-[85%] ${isAgent ? "self-start text-left" : "self-end text-right"}`}
                            >
                              {/* Speaker Badge */}
                              <span className={`text-[9px] font-bold uppercase tracking-wider mb-1.5 px-1 ${
                                isAgent ? "text-slate-450" : "text-blue-500"
                              }`}>
                                {isAgent ? `Agent (${selectedCall?.agent_name || "AI"})` : "Customer"}
                              </span>
                              
                              {/* Chat Bubble */}
                              <div className={`p-4 rounded-2xl shadow-2xs leading-relaxed text-sm font-medium ${
                                isAgent 
                                  ? "bg-white text-slate-800 rounded-tl-none border border-slate-200/90" 
                                  : "bg-blue-600 text-white rounded-tr-none"
                              }`}>
                                <p className="break-words whitespace-pre-wrap">{line.text}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => {
          confirmModal.onConfirm();
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        isDestructive={true}
      />

      <ConfirmModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        onConfirm={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
        isAlert={true}
      />
    </>
  );
}
