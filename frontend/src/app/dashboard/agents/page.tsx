"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "src/store/authStore";
import { useRouter } from "next/navigation";
import { apiFetch } from "src/lib/api";
import { ConfirmModal } from "src/components/dashboard/confirm-modal";
import { FilterMenu, FilterGroup } from "src/components/dashboard/filter-menu";
import {
  Search, Plus, Loader2, MoreVertical, Sparkles,
  Users, ArrowRight, Download, Trash2, Copy
} from "lucide-react";

interface Agent {
  id: number;
  name: string;
  voice_id: string;
  capabilities?: string;
  status?: string;
  lang?: string;
  performance_score?: number;
  performance_grade?: string;
}

// Generate a vq_live_XXXXX slug from integer ID (matches screenshot style)
function agentSlug(id: number): string {
  return `vq_live_${id.toString(16).padStart(5, "0")}`;
}

// Avatar color based on first letter
const AVATAR_COLORS = [
  "bg-orange-500", "bg-green-500", "bg-blue-500", "bg-purple-500",
  "bg-rose-500", "bg-amber-500", "bg-teal-500", "bg-indigo-500",
];
function avatarColor(name: string): string {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

const MOCK_AGENTS: Agent[] = [
  { id: 1, name: "Sarah (Sales)", voice_id: "Sarah", capabilities: "Customer Support / General FAQ", status: "ACTIVE", lang: "ENGLISH (US)", performance_score: 98.2, performance_grade: "A+" },
  { id: 2, name: "Alex (Support)", voice_id: "Max", capabilities: "Customer Support / General FAQ", status: "ACTIVE", lang: "ENGLISH (US)", performance_score: 89.5, performance_grade: "A" },
];

export default function DashboardAgentsPage() {
  const token = useAuthStore((s) => s.token);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const router = useRouter();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [creatingBlank, setCreatingBlank] = useState(false);
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

  // Synchronize searchQuery with URL parameter "search"
  useEffect(() => {
    const syncSearch = () => {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const q = params.get("search") || "";
        setSearchQuery(q);
      }
    };
    syncSearch();
    const interval = setInterval(syncSearch, 400);
    return () => clearInterval(interval);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (val) {
        params.set("search", val);
      } else {
        params.delete("search");
      }
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, "", newUrl);
    }
  };

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAgents = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiFetch<Agent[]>("/dashboard/agents", "GET", undefined, token);
      setAgents(Array.isArray(data) ? data : MOCK_AGENTS);
    } catch {
      setAgents(MOCK_AGENTS);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!token) { router.replace("/"); return; }
    fetchAgents();
  }, [hasHydrated, token, router, fetchAgents]);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".menu-trigger-btn") && !target.closest(".menu-dropdown-content")) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const handleCreateBlank = () => {
    router.push("/dashboard/agents/new");
  };

  const handleDuplicate = async (agent: Agent) => {
    try {
      const payload = { ...agent, name: `${agent.name} (Copy)` };
      const res = await apiFetch<{ status: string; agent: Agent }>("/dashboard/agents", "POST", payload, token);
      if (res?.agent) {
        showToast(`Duplicated "${agent.name}"`, "success");
        fetchAgents();
      }
    } catch {
      showToast("Failed to duplicate agent.", "error");
    }
  };

  const handleDelete = async (agent: Agent) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete AI Agent",
      message: `Are you sure you want to delete "${agent.name}"? This cannot be undone.`,
      onConfirm: async () => {
        try {
          await apiFetch(`/dashboard/agents/${agent.id}`, "DELETE", undefined, token);
          showToast(`"${agent.name}" deleted.`, "success");
          fetchAgents();
        } catch {
          showToast("Failed to delete agent.", "error");
        }
      }
    });
  };

  const [agentFilters, setAgentFilters] = useState<Record<string, string>>({ status: "all", capability: "all", lang: "all" });
  const uniq = (arr: (string | undefined)[]) => Array.from(new Set(arr.filter(Boolean) as string[])).sort();
  const agentFilterGroups: FilterGroup[] = [
    { key: "status", label: "Status", options: [{ value: "all", label: "All" }, ...uniq(agents.map((a) => (a.status || "").toUpperCase())).map((v) => ({ value: v, label: v }))] },
    { key: "capability", label: "Category", options: [{ value: "all", label: "All" }, ...uniq(agents.map((a) => a.capabilities)).map((v) => ({ value: v, label: v }))] },
    { key: "lang", label: "Language", options: [{ value: "all", label: "All" }, ...uniq(agents.map((a) => a.lang)).map((v) => ({ value: v, label: v }))] },
  ];

  const filtered = agents.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.capabilities || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = agentFilters.status === "all" || (a.status || "").toUpperCase() === agentFilters.status;
    const matchesCap = agentFilters.capability === "all" || a.capabilities === agentFilters.capability;
    const matchesLang = agentFilters.lang === "all" || a.lang === agentFilters.lang;
    return matchesSearch && matchesStatus && matchesCap && matchesLang;
  });

  if (!hasHydrated || !token) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading…</div>;
  }

  return (
    <>
      <div className="min-h-[calc(100vh-128px)]">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] flex items-center space-x-2.5 px-5 py-3 rounded-xl shadow-xl text-xs font-bold text-white ${toast.type === "success" ? "bg-slate-900" : "bg-red-600"}`}>
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 ${toast.type === "success" ? "bg-emerald-500" : "bg-red-400"}`}>
            {toast.type === "success" ? "✓" : "✕"}
          </span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-slate-950 tracking-tight">AI Agents</h2>
            <p className="text-xs text-slate-500 font-medium">
              Build and deploy fully functional calling agents powered by neural voice networks.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleCreateBlank}
              disabled={creatingBlank}
              className="h-9 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center space-x-2 shadow-xs"
            >
              {creatingBlank ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Create Blank Agent</span>
            </button>
          </div>
        </div>

        {/* Search + filter + count */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search agents..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full h-9 pl-9 pr-4 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 transition"
              />
            </div>
            <FilterMenu
              align="left"
              groups={agentFilterGroups}
              value={agentFilters}
              onChange={(k, v) => setAgentFilters((prev) => ({ ...prev, [k]: v }))}
              onClear={() => setAgentFilters({ status: "all", capability: "all", lang: "all" })}
            />
          </div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            {filtered.length} AGENTS
          </span>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-visible shadow-xs">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_2fr_1fr] px-5 py-3 border-b border-slate-100 bg-slate-50/60">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Name</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Capabilities</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Loading agents...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Users className="w-8 h-8 mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-semibold">No agents found.</p>
              <p className="text-xs mt-1">Create your first agent using the buttons above.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((agent) => {
                const slug = agentSlug(agent.id);
                return (
                  <div
                    key={agent.id}
                    className="grid grid-cols-[2fr_2fr_1fr] px-5 py-4 hover:bg-slate-50/60 transition-colors group items-center"
                  >
                    {/* Name + ID */}
                    <button
                      onClick={() => router.push(`/dashboard/agents/${slug}`)}
                      className="flex items-center space-x-3 text-left cursor-pointer"
                    >
                      <div className={`w-9 h-9 rounded-full ${avatarColor(agent.name)} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                        {agent.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors">
                          {agent.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          ID: {slug}
                        </p>
                      </div>
                    </button>

                    {/* Capabilities */}
                    <div>
                      <p className="text-xs font-semibold text-slate-700">
                        {(agent.capabilities || "Customer Support").split("/")[0].trim()}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {(agent.capabilities || "General FAQ").split("/").slice(1).join("/").trim() || "General FAQ"}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => router.push(`/dashboard/agents/${slug}`)}
                        className="h-8 px-3 text-[11px] font-bold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition cursor-pointer whitespace-nowrap flex items-center space-x-1"
                      >
                        <span>Talk to Agent</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>

                      <div className="relative">
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === agent.id ? null : agent.id); }}
                          className="menu-trigger-btn w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {openMenuId === agent.id && (
                          <div className="menu-dropdown-content absolute right-0 top-9 z-20 bg-white border border-slate-200 rounded-xl shadow-xl py-1 w-40 text-xs font-semibold" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => { router.push(`/dashboard/agents/${slug}`); setOpenMenuId(null); }}
                              className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                            >
                              <ArrowRight className="w-3.5 h-3.5 text-blue-500" /><span>Open Agent</span>
                            </button>
                            <button
                              onClick={() => { handleDuplicate(agent); setOpenMenuId(null); }}
                              className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                            >
                              <Copy className="w-3.5 h-3.5 text-slate-400" /><span>Duplicate</span>
                            </button>
                            <button
                              onClick={() => { handleDelete(agent); setOpenMenuId(null); }}
                              className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center space-x-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" /><span>Delete AI Agent</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </div>
    </div>
  </div>
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
    </>
  );
}
