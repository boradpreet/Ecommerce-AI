"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X, Send, Loader2, Bot, Sparkles, Volume2, VolumeX, Rocket } from "lucide-react";
import { apiFetch } from "src/lib/api";

interface TalkAgent {
  id: number;
  name: string;
  first_message?: string;
  voice_id?: string;
  category?: string;
  subcategory?: string;
  capabilities?: string;
}

interface ChatLine {
  role: "agent" | "user";
  text: string;
}

interface TalkToAgentModalProps {
  agent: TalkAgent;
  token: string;
  onClose: () => void;
}

export const TalkToAgentModal: React.FC<TalkToAgentModalProps> = ({ agent, token, onClose }) => {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<ChatLine[]>(() =>
    agent.first_message ? [{ role: "agent", text: agent.first_message }] : []
  );
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const spokenRef = useRef<Set<number>>(new Set());

  useEffect(() => setMounted(true), []);

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
  };

  // Speak a line of agent dialogue — gives the "call experience" preview.
  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      const vid = (agent.voice_id || "").toLowerCase();
      const isMale = vid.includes("male") && !vid.includes("female");
      u.rate = 1.0;
      u.pitch = isMale ? 0.9 : 1.12;
      u.lang = "en-US";
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find((v) => v.lang.startsWith("en") && (isMale ? /david|mark|male/i.test(v.name) : /zira|samantha|female/i.test(v.name))) ||
        voices.find((v) => v.lang.startsWith("en"));
      if (preferred) u.voice = preferred;
      window.speechSynthesis.speak(u);
    } catch {
      /* speech not available — silently ignore */
    }
  }, [agent.voice_id]);

  // Speak each new agent message once, while voice is on.
  useEffect(() => {
    if (!voiceOn) return;
    messages.forEach((m, i) => {
      if (m.role === "agent" && !spokenRef.current.has(i)) {
        spokenRef.current.add(i);
        speak(m.text);
      }
    });
  }, [messages, voiceOn, speak]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  useEffect(() => () => stopSpeaking(), []);

  const toggleVoice = () => {
    setVoiceOn((v) => {
      if (v) stopSpeaking();
      return !v;
    });
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const history = messages.map((m) => ({ role: m.role, text: m.text }));
    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setSending(true);
    try {
      const res = await apiFetch<{ reply?: string }>(
        `/dashboard/agents/${agent.id}/simulate`,
        "POST",
        { message: text, chat_history: history },
        token
      );
      setMessages((prev) => [
        ...prev,
        { role: "agent", text: res?.reply || "Sorry, I didn't catch that. Could you rephrase?" },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "agent", text: "⚠️ I couldn't reach the voice engine. Please try again." },
      ]);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const goCreateCampaign = () => {
    stopSpeaking();
    onClose();
    router.push(`/dashboard/campaigns?new=1&agent=${agent.id}`);
  };

  const industry = agent.category
    ? `${agent.category}${agent.subcategory ? " · " + agent.subcategory : ""}`
    : agent.capabilities || "Voice agent preview";

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-md p-4 animate-fade-only"
      onClick={(e) => { if (e.target === e.currentTarget) { stopSpeaking(); onClose(); } }}
    >
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[82vh] animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-150 bg-slate-50/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0">
              <Bot className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold text-slate-900 truncate">{agent.name}</h2>
              <p className="text-[10px] text-slate-500 font-semibold truncate">{industry}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={toggleVoice}
              title={voiceOn ? "Mute voice" : "Enable voice"}
              className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${voiceOn ? "text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100" : "text-slate-400 border-slate-100 hover:bg-slate-150"}`}
            >
              {voiceOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={() => { stopSpeaking(); onClose(); }}
              aria-label="Close"
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-150 border border-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50 min-h-[260px]">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 gap-2 py-10">
              <Sparkles className="w-6 h-6 text-slate-300" />
              <p className="text-xs font-semibold">Say hello to hear how {agent.name} handles a call.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] p-3 rounded-2xl text-sm font-medium leading-relaxed shadow-2xs ${
                  m.role === "user"
                    ? "bg-blue-600 text-white rounded-tr-none"
                    : "bg-white text-slate-800 border border-slate-200/90 rounded-tl-none"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-white text-slate-400 border border-slate-200/90 rounded-2xl rounded-tl-none p-3 text-xs font-semibold flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> {agent.name} is speaking…
              </div>
            </div>
          )}
        </div>

        {/* Create-campaign CTA */}
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
          <p className="text-[10px] text-slate-400 font-semibold hidden sm:block">Happy with {agent.name}? Launch a campaign with it.</p>
          <button
            onClick={goCreateCampaign}
            className="h-8 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer shrink-0 ml-auto"
          >
            <Rocket className="w-3.5 h-3.5" /><span>Create Campaign</span>
          </button>
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-100 bg-white flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={`Message ${agent.name}…`}
            className="flex-1 h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition"
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            className="h-11 w-11 shrink-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition flex items-center justify-center cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
