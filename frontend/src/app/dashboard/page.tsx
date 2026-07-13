"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "src/store/authStore";
import { useOnboardingStore } from "src/store/useOnboardingStore";
import { apiFetch } from "src/lib/api";
import { X } from "lucide-react";
import { DashboardTab, DashboardMetrics, LiveSession } from "src/components/dashboard/dashboard-tab";

type SimulationLine = { speaker: "agent" | "user"; text: string };

const simulationDialogues: Record<string, SimulationLine[]> = {
  vq_9281a: [
    { speaker: "agent", text: "Hello! This is Sarah calling from Voqly Health. I see that you have a dental appointment coming up this Thursday. Would you like to confirm that?" },
    { speaker: "user", text: "Oh, yes. I remember. What time is it scheduled for again?" },
    { speaker: "agent", text: "It is scheduled for 2:30 PM Eastern Time. Does that time still work for your calendar?" },
    { speaker: "user", text: "Actually, 2:30 PM is tight. Do you have anything later in the afternoon?" },
    { speaker: "agent", text: "Yes, we have a 4:15 PM opening available on Thursday. Shall I lock that in for you?" },
    { speaker: "user", text: "Perfect! 4:15 PM works much better. Go ahead and lock it." },
    { speaker: "agent", text: "Done! I have rescheduled your appointment to Thursday at 4:15 PM. Goodbye!" },
  ],
  vq_0128z: [
    { speaker: "agent", text: "Hello, this is Max calling from TechCapital Group. Am I speaking with Alex?" },
    { speaker: "user", text: "Yes, this is Alex. Who is this?" },
    { speaker: "agent", text: "Hi Alex, this is regarding the pending invoice balance of $480.00 that was due on the 15th." },
    { speaker: "user", text: "Yeah, I've been meaning to pay that, but cash flow is a bit tight right now." },
    { speaker: "agent", text: "I completely understand. We can split this into two equal bi-weekly payments of $240.00 starting today. Would that relieve some pressure?" },
    { speaker: "user", text: "That sounds much more manageable. Let's do that." },
  ],
};

export default function DashboardPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const storedUser = useAuthStore((state) => state.user);
  const setAuthUser = useAuthStore((state) => state.setUser);
  const onboardingStore = useOnboardingStore();

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCallSim, setSelectedCallSim] = useState<LiveSession | null>(null);
  const [simTranscript, setSimTranscript] = useState<SimulationLine[]>([]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!token) {
      router.replace("/");
    }
  }, [hasHydrated, router, token]);

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    apiFetch<DashboardMetrics>("/dashboard/metrics", "GET", undefined, token)
      .then((data) => setMetrics(data))
      .catch(() => {
        // Backend offline — metrics will be null, DashboardTab uses its own defaults
      })
      .finally(() => setLoading(false));

    apiFetch<{ id: number; full_name: string; email: string }>("/auth/me", "GET", undefined, token)
      .then((meData) => {
        if (meData) {
          setAuthUser({ id: meData.id, full_name: meData.full_name, email: meData.email });
        }
      })
      .catch(() => {
        // silently ignore profile fetch failures
      });
  }, [token, setAuthUser]);

  useEffect(() => {
    if (!selectedCallSim) return;

    const dialogue = simulationDialogues[selectedCallSim.id] || simulationDialogues.vq_9281a;
    setSimTranscript([dialogue[0]]);

    const interval = window.setInterval(() => {
      setSimTranscript((prev) => {
        const nextLine = prev.length;
        if (nextLine < dialogue.length) {
          return [...prev, dialogue[nextLine]];
        }
        window.clearInterval(interval);
        return prev;
      });
    }, 2500);

    return () => window.clearInterval(interval);
  }, [selectedCallSim]);

  const userName = storedUser?.full_name || onboardingStore.fullName || "Enterprise User";

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans selection:bg-slate-900 selection:text-white antialiased relative">
      <main className="min-h-[calc(100vh-64px)] p-6 sm:p-8">
        {loading ? (
          <div className="space-y-6 animate-fade-in" aria-busy="true" aria-label="Loading dashboard overview">
            <div className="h-8 w-64 bg-slate-200/70 rounded-lg animate-pulse" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
                  <div className="h-9 w-9 rounded-xl bg-slate-200/70 animate-pulse mb-4" />
                  <div className="h-3 w-20 bg-slate-200/70 rounded animate-pulse mb-2" />
                  <div className="h-6 w-16 bg-slate-200/70 rounded animate-pulse" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl shadow-xs h-72 animate-pulse" />
              <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs h-72 animate-pulse" />
            </div>
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs h-40 animate-pulse" />
          </div>
        ) : (
          <DashboardTab metrics={metrics} userName={userName} setSelectedCallSim={setSelectedCallSim} setActiveTab={(tab) => router.push(`/dashboard/${tab}`)} />
        )}
      </main>

      {selectedCallSim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-950">Live Conversation</h2>
                <p className="text-xs text-slate-500">Synthetic agent transcript preview for the selected session.</p>
              </div>
              <button
                onClick={() => setSelectedCallSim(null)}
                aria-label="Close live conversation"
                className="p-2 rounded-full text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 bg-slate-50 min-h-80 space-y-4">
              {simTranscript.map((line, index) => (
                <div
                  key={index}
                  className={`rounded-3xl p-4 max-w-[85%] ${line.speaker === "agent" ? "bg-white border border-slate-200 self-start" : "bg-blue-600 text-white self-end"}`}
                >
                  <div className="text-[10px] uppercase tracking-[0.3em] font-bold mb-2 text-slate-400">
                    {line.speaker === "agent" ? selectedCallSim.agent_name : "User"}
                  </div>
                  <p className="text-sm leading-6">{line.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
