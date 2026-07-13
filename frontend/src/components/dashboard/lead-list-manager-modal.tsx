"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Trash2, Loader2, Check, Pencil, Users } from "lucide-react";
import { apiFetch } from "src/lib/api";
import { formatPhone } from "src/lib/format";

interface LeadItem {
  id: number;
  name: string;
  phone_number: string;
  status: string;
  created_at?: string;
}

interface ManagerList {
  id: number;
  campaign_name: string;
}

interface LeadListManagerModalProps {
  list: ManagerList;
  token: string;
  onClose: () => void;
  onChanged: () => void;
  triggerSuccess: (msg: string) => void;
  triggerError: (msg: string) => void;
}

const STATUS_OPTIONS = ["PENDING", "CALLED", "DNC", "CONVERTED"];

export const LeadListManagerModal: React.FC<LeadListManagerModalProps> = ({
  list,
  token,
  onClose,
  onChanged,
  triggerSuccess,
  triggerError,
}) => {
  const [mounted, setMounted] = useState(false);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  // Add-lead form
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newStatus, setNewStatus] = useState("PENDING");
  const [adding, setAdding] = useState(false);

  // Inline edit
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  useEffect(() => setMounted(true), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ leads: LeadItem[] }>(`/dashboard/leads/${list.id}/items`, "GET", undefined, token);
      setLeads(Array.isArray(data?.leads) ? data.leads : []);
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [list.id, token]);

  useEffect(() => { load(); }, [load]);

  const addLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;
    setAdding(true);
    try {
      const res = await apiFetch<{ lead: LeadItem }>(
        "/dashboard/leads/item",
        "POST",
        { campaign_id: list.id, name: newName.trim(), phone_number: newPhone.trim(), status: newStatus },
        token
      );
      if (res?.lead) setLeads((prev) => [res.lead, ...prev]);
      setNewName(""); setNewPhone(""); setNewStatus("PENDING");
      triggerSuccess("Lead added.");
      onChanged();
    } catch {
      triggerError("Failed to add lead.");
    } finally {
      setAdding(false);
    }
  };

  const patchLead = async (id: number, patch: Partial<Pick<LeadItem, "name" | "phone_number" | "status">>) => {
    setBusyId(id);
    try {
      const res = await apiFetch<{ lead: LeadItem }>(`/dashboard/leads/item/${id}`, "PUT", patch, token);
      if (res?.lead) setLeads((prev) => prev.map((l) => (l.id === id ? res.lead : l)));
      onChanged();
    } catch {
      triggerError("Failed to update lead.");
    } finally {
      setBusyId(null);
    }
  };

  const removeLead = async (id: number) => {
    setBusyId(id);
    try {
      await apiFetch(`/dashboard/leads/item/${id}`, "DELETE", undefined, token);
      setLeads((prev) => prev.filter((l) => l.id !== id));
      triggerSuccess("Lead deleted.");
      onChanged();
    } catch {
      triggerError("Failed to delete lead.");
    } finally {
      setBusyId(null);
    }
  };

  const startEdit = (l: LeadItem) => { setEditId(l.id); setEditName(l.name); setEditPhone(l.phone_number); };
  const saveEdit = async (id: number) => {
    await patchLead(id, { name: editName.trim(), phone_number: editPhone.trim() });
    setEditId(null);
  };

  const statusClass = (s: string) =>
    s === "CALLED" || s === "COMPLETED" ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : s === "DNC" ? "text-red-700 bg-red-50 border-red-200"
      : s === "CONVERTED" ? "text-indigo-700 bg-indigo-50 border-indigo-200"
      : "text-slate-600 bg-slate-50 border-slate-200";

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-start sm:items-center justify-center bg-black/50 backdrop-blur-md p-4 overflow-y-auto animate-fade-only"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[86vh] animate-scale-in my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-150 bg-slate-50/60 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Users className="w-4.5 h-4.5 text-slate-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold text-slate-900 truncate">{list.campaign_name}</h2>
              <p className="text-[10px] text-slate-500 font-semibold">{leads.length} lead{leads.length === 1 ? "" : "s"}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-150 border border-slate-100 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Add-lead form */}
        <form onSubmit={addLead} className="px-6 py-3 border-b border-slate-100 bg-white flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" className="flex-1 h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 text-xs font-semibold outline-none focus:border-blue-400" />
          <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Phone" className="flex-1 h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 text-xs font-semibold outline-none focus:border-blue-400 font-mono" />
          <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 text-xs font-bold outline-none focus:border-blue-400 cursor-pointer">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button type="submit" disabled={adding || !newName.trim() || !newPhone.trim()} className="h-9 px-4 bg-[#0b1931] hover:bg-slate-950 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0">
            {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}<span>Add</span>
          </button>
        </form>

        {/* Leads list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-10 text-center text-slate-400 font-bold text-sm">Loading leads…</div>
          ) : leads.length === 0 ? (
            <div className="p-10 text-center text-slate-400 font-semibold text-sm">No leads in this list yet. Add one above.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {leads.map((l) => (
                <div key={l.id} className="flex items-center gap-3 px-6 py-2.5">
                  {editId === l.id ? (
                    <>
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1 h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 text-xs font-semibold outline-none focus:border-blue-400" />
                      <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="flex-1 h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 text-xs font-mono outline-none focus:border-blue-400" />
                      <button onClick={() => saveEdit(l.id)} disabled={busyId === l.id} className="h-8 px-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer">
                        {busyId === l.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => setEditId(null)} className="h-8 px-2.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold cursor-pointer">Cancel</button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{l.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono truncate">{formatPhone(l.phone_number)}</p>
                      </div>
                      <select
                        value={STATUS_OPTIONS.includes(l.status) ? l.status : "PENDING"}
                        onChange={(e) => patchLead(l.id, { status: e.target.value })}
                        disabled={busyId === l.id}
                        className={`h-7 pl-2 pr-6 border rounded-full text-[10px] font-bold uppercase tracking-wider outline-none cursor-pointer appearance-none ${statusClass(l.status)}`}
                      >
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <button onClick={() => startEdit(l)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer" title="Edit">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => removeLead(l.id)} disabled={busyId === l.id} className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 cursor-pointer" title="Delete">
                        {busyId === l.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
