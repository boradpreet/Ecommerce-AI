"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Users, Disc, Volume2 } from "lucide-react";

interface LogMessage {
  id: string;
  name: string;
  phone: string;
  text: string;
  role: "agent" | "customer";
  status: string;
  confidence: number;
}

const mockConversations: LogMessage[] = [
  { id: "1", name: "David Miller", phone: "+1 (555) 0192", text: "Voqly AI Outbound Agent calling...", role: "agent", status: "Initiating Outbound...", confidence: 99 },
  { id: "2", name: "David Miller", phone: "+1 (555) 0192", text: "Hi David, this is Sarah from Voqly. Did I catch you at a good time?", role: "agent", status: "Connected", confidence: 98 },
  { id: "3", name: "David Miller", phone: "+1 (555) 0192", text: "Hey! Yes, I was just setting up my pipeline. What's up?", role: "customer", status: "Connected", confidence: 94 },
  { id: "4", name: "David Miller", phone: "+1 (555) 0192", text: "I wanted to check if you prefer the ElevenLabs HD voice preset or your custom cloned voice?", role: "agent", status: "Connected", confidence: 97 },
  { id: "5", name: "David Miller", phone: "+1 (555) 0192", text: "Actually, let's go with the custom voice clone. It sounds incredibly realistic!", role: "customer", status: "Completed", confidence: 95 },
];

export const ActiveCallsVisual: React.FC = () => {
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [logIndex, setLogIndex] = useState(0);
  const [activePulse, setActivePulse] = useState(false);

  useEffect(() => {
    // Add logs one by one with simulated delays
    const interval = setInterval(() => {
      if (logIndex < mockConversations.length) {
        setLogs((prev) => [...prev.slice(-3), mockConversations[logIndex]]);
        setLogIndex((prev) => prev + 1);
        setActivePulse(true);
        setTimeout(() => setActivePulse(false), 800);
      } else {
        // Reset and repeat after completion
        setTimeout(() => {
          setLogs([]);
          setLogIndex(0);
        }, 3000);
      }
    }, 3500);

    // Initial setup
    setLogs([mockConversations[0]]);
    setLogIndex(1);

    return () => clearInterval(interval);
  }, [logIndex]);

  return (
    <div className="relative w-full h-[580px] rounded-2xl bg-white/[0.02] border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md overflow-hidden flex flex-col justify-between p-6">
      {/* Visual background gloss grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent opacity-60 pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,_transparent_1px),_linear-gradient(90deg,_rgba(255,255,255,0.01)_1px,_transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Header bar */}
      <div className="flex justify-between items-center z-10 border-b border-white/[0.08] pb-4">
        <div className="flex items-center space-x-2.5">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Voqly Engine Core</h4>
            <p className="text-[10px] text-slate-500">Active outbound lead dialing</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs bg-slate-950/80 px-3 py-1.5 rounded-full border border-white/[0.06]">
          <Disc className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
          <span className="text-slate-400">Model: <strong className="text-white font-medium">Voqly-Voice-v2</strong></span>
        </div>
      </div>

      {/* Center Dialing Hub Visualization */}
      <div className="relative flex-1 flex items-center justify-center py-6">
        {/* Core Node */}
        <div className="relative z-20">
          <motion.div 
            animate={{ 
              scale: activePulse ? [1, 1.15, 1] : 1,
              boxShadow: activePulse 
                ? ["0 0 20px rgba(99, 102, 241, 0.4)", "0 0 50px rgba(99, 102, 241, 0.7)", "0 0 20px rgba(99, 102, 241, 0.4)"]
                : "0 0 20px rgba(99, 102, 241, 0.3)"
            }}
            transition={{ duration: 0.8 }}
            className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 border-2 border-indigo-400 flex items-center justify-center cursor-pointer"
          >
            <Phone className="w-8 h-8 text-white animate-pulse" />
          </motion.div>

          {/* Radial Pulse Waves */}
          <div className="absolute inset-0 -m-10 pointer-events-none">
            <span className="absolute inset-0 rounded-full border border-indigo-500/20 animate-ping" style={{ animationDuration: "3s" }} />
            <span className="absolute inset-0 rounded-full border border-violet-500/10 animate-ping" style={{ animationDuration: "5s", animationDelay: "1s" }} />
          </div>
        </div>

        {/* Orbiting Lead Nodes */}
        <div className="absolute w-full h-full inset-0 flex items-center justify-center pointer-events-none z-10">
          {/* Customer Node Left */}
          <motion.div 
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="absolute left-8 top-1/4 p-3 bg-slate-950/90 rounded-xl border border-white/[0.08] flex items-center space-x-2.5 shadow-lg backdrop-blur-md"
          >
            <div className="w-7 h-7 rounded-full bg-violet-900/50 border border-violet-500/30 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-violet-400" />
            </div>
            <div>
              <p className="text-[10px] font-medium text-white">David M.</p>
              <p className="text-[9px] text-slate-500">Connected</p>
            </div>
          </motion.div>

          {/* Customer Node Right */}
          <motion.div 
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut", delay: 1 }}
            className="absolute right-8 bottom-1/4 p-3 bg-slate-950/90 rounded-xl border border-white/[0.08] flex items-center space-x-2.5 shadow-lg backdrop-blur-md"
          >
            <div className="w-7 h-7 rounded-full bg-blue-900/50 border border-blue-500/30 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] font-medium text-white">Sophia L.</p>
              <p className="text-[9px] text-emerald-400">Dialing...</p>
            </div>
          </motion.div>

          {/* Connecting SVG lines with moving dots */}
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            {/* Connection 1 */}
            <path d="M 64 140 Q 150 160 210 240" fill="none" stroke="rgba(139, 92, 246, 0.15)" strokeWidth="1.5" strokeDasharray="4" />
            <path d="M 370 240 Q 300 320 370 380" fill="none" stroke="rgba(59, 130, 246, 0.15)" strokeWidth="1.5" strokeDasharray="4" />
          </svg>
        </div>

        {/* Live Audio Waves Bottom Overlay */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-48 h-8 flex items-center justify-between pointer-events-none px-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((idx) => {
            const delay = idx * 0.1;
            return (
              <motion.div
                key={idx}
                animate={{ height: activePulse ? [4, 28, 4] : [4, 12, 4] }}
                transition={{ repeat: Infinity, duration: 0.6, delay, ease: "easeInOut" }}
                className="w-1 rounded-full bg-indigo-500/40"
              />
            );
          })}
        </div>
      </div>

      {/* Dynamic scrolling text dialogue bubbles */}
      <div className="z-10 bg-slate-950/80 rounded-xl border border-white/[0.08] p-4 flex flex-col space-y-3 min-h-[160px] max-h-[160px] overflow-hidden shadow-inner backdrop-blur-xl">
        <div className="flex justify-between items-center text-[10px] text-slate-500 border-b border-white/[0.06] pb-1.5">
          <span className="uppercase font-semibold tracking-wider flex items-center space-x-1"><Volume2 className="w-3 h-3 text-indigo-400 mr-0.5" /> Call Transcription Stream</span>
          <span className="font-semibold text-indigo-400">98% Avg Confidence</span>
        </div>

        <div className="flex-1 flex flex-col space-y-2 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {logs.map((log) => {
              const isAgent = log.role === "agent";
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4 }}
                  className={`flex flex-col max-w-[85%] rounded-lg p-2.5 text-xs ${
                    isAgent 
                      ? "self-start bg-indigo-600/10 border border-indigo-500/20 text-indigo-200" 
                      : "self-end bg-slate-900 border border-white/[0.06] text-slate-200"
                  }`}
                >
                  <div className="flex justify-between items-center text-[9px] text-slate-500 mb-1">
                    <span className={`font-semibold ${isAgent ? "text-indigo-400" : "text-slate-400"}`}>
                      {isAgent ? "Voqly AI Agent" : log.name}
                    </span>
                    <span>Conf: {log.confidence}%</span>
                  </div>
                  <p className="leading-relaxed">{log.text}</p>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
