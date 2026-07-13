"use client";

import React, { useCallback, useEffect, useState } from "react";
import { PhoneIncoming, Loader2, Plus, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "src/store/authStore";
import { apiFetch } from "src/lib/api";
import { phoneWarning } from "src/components/superadmin/EditVendorModal";

interface InboundNumber {
  id: number;
  phone_number: string;
  assigned_agent?: string | null;
  agent_name?: string | null;
  type?: string;
  nickname?: string | null;
  status?: string;
  direction?: string;
}

interface AgentOpt { id: number; name: string }

export default function InboundNumbersPanel({ vendorId, agents, defaultNumber, defaultProvider }: { vendorId: number; agents: AgentOpt[]; defaultNumber?: string; defaultProvider?: string }) {
  const token = useAuthStore((s) => s.token);
  const [numbers, setNumbers] = useState<InboundNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [provider, setProvider] = useState(defaultProvider || "plivo");
  const [agentId, setAgentId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiFetch<InboundNumber[]>(`/superadmin/vendors/${vendorId}/inbound-numbers`, "GET", undefined, token);
      setNumbers(Array.isArray(res) ? res : []);
    } catch {
      setNumbers([]);
    } finally {
      setLoading(false);
    }
  }, [token, vendorId]);

  useEffect(() => { load(); }, [load]);

  const warn = phoneWarning(phone);

  const assign = async () => {
    if (!token || !phone || warn) return;
    setSaving(true); setNote(null);
    try {
      const res = await apiFetch<{ webhook?: { ok: boolean; message: string } }>(
        `/superadmin/vendors/${vendorId}/inbound-numbers`, "POST",
        { phone_number: phone, provider, assigned_agent: agentId || null }, token,
      );
      const wh = res?.webhook;
      setNote({ ok: !!wh?.ok, text: wh?.message || "Number assigned." });
      setPhone(""); setAgentId("");
      await load();
    } catch (e) {
      setNote({ ok: false, text: e instanceof Error ? e.message : "Failed to assign number." });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!token) return;
    try {
      await apiFetch(`/superadmin/vendors/${vendorId}/inbound-numbers/${id}`, "DELETE", undefined, token);
      await load();
    } catch { /* ignore */ }
  };

  const field = "w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-blue-600";

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs text-left">
      <div className="border-b border-slate-100 pb-3 mb-5 flex items-center gap-1.5 select-none">
        <PhoneIncoming className="w-4 h-4 text-emerald-600" />
        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Inbound Numbers</h4>
      </div>

      {/* Assign form */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-start">
        <div className="sm:col-span-2">
          <label className="text-[10px] text-slate-500 font-bold block mb-1.5">Phone Number (E.164)</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+14155238886" className={`${field} font-mono ${warn ? "border-amber-400" : ""}`} />
          {defaultNumber && (
            <button
              type="button"
              onClick={() => { setPhone(defaultNumber); if (defaultProvider) setProvider(defaultProvider); }}
              className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              <PhoneIncoming className="w-3 h-3" />
              Use the same number as outbound ({defaultNumber})
            </button>
          )}
        </div>
        <div>
          <label className="text-[10px] text-slate-500 font-bold block mb-1.5">Provider</label>
          <select value={provider} onChange={(e) => setProvider(e.target.value)} className={`${field} cursor-pointer`}>
            <option value="plivo">Plivo</option>
            <option value="twilio">Twilio</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-slate-500 font-bold block mb-1.5">Answering Agent</label>
          <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className={`${field} cursor-pointer`}>
            <option value="">Auto (first active)</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>

      {warn && (
        <div className="mt-2 flex items-start gap-1.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-semibold">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /><span>{warn}</span>
        </div>
      )}

      <div className="flex items-center justify-between mt-3 gap-3 flex-wrap">
        <p className="text-[10px] text-slate-400 font-medium max-w-lg">
          The number must already exist in the platform&apos;s {provider === "twilio" ? "Twilio" : "Plivo"} account. Assigning it auto-registers its answer webhook so incoming calls reach this vendor&apos;s agent.
        </p>
        <button
          type="button"
          onClick={assign}
          disabled={saving || !phone || !!warn}
          className="h-10 px-4 bg-[#0F2D67] hover:bg-slate-950 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold text-white rounded-xl transition flex items-center gap-2 cursor-pointer shrink-0"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {saving ? "Registering…" : "Assign & Register"}
        </button>
      </div>

      {note && (
        <div className={`mt-3 flex items-start gap-1.5 p-2.5 rounded-lg text-[11px] font-semibold border ${note.ok ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
          {note.ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
          <span>{note.text}</span>
        </div>
      )}

      {/* Existing inbound numbers */}
      <div className="mt-5 border-t border-slate-100 pt-4">
        {loading ? (
          <div className="text-slate-400 text-xs flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading numbers…</div>
        ) : numbers.length === 0 ? (
          <p className="text-xs text-slate-400 font-semibold">No inbound numbers assigned yet.</p>
        ) : (
          <div className="space-y-2">
            {numbers.map((n) => (
              <div key={n.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-900 font-mono">{n.phone_number}</p>
                  <p className="text-[10px] text-slate-400 font-bold">Answers with: {n.agent_name || n.assigned_agent || "Auto (first active)"}</p>
                </div>
                <button type="button" onClick={() => remove(n.id)} title="Remove inbound routing" className="h-8 w-8 flex items-center justify-center rounded-lg text-red-600 hover:bg-red-50 border border-red-200 cursor-pointer shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
