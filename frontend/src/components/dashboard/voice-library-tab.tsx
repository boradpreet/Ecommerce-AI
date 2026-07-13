"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Search, Loader2, Play, Square, Volume2, Copy, Check, MessageSquare, Mic, Sparkles } from "lucide-react";
import { apiFetch } from "src/lib/api";
import { FilterMenu } from "src/components/dashboard/filter-menu";

interface Voice {
  id: string;
  name: string;
  description: string;
  provider: string;
  language: string;
  flag: string;
  use_case: string;
  age: string;
  gender: string;
  voice_id: string;
  sample_url: string;
}

// Languages each neural voice can speak (matching the /voices/<voice>_<lang>.wav samples).
const VOICE_LANGUAGES = [
  { label: "English (US)", suffix: "english_us", locale: "en-US", flag: "🇺🇸" },
  { label: "Hindi", suffix: "hindi", locale: "hi-IN", flag: "🇮🇳" },
  { label: "Bengali", suffix: "bengali", locale: "bn-IN", flag: "🇮🇳" },
  { label: "Gujarati", suffix: "gujarati", locale: "gu-IN", flag: "🇮🇳" },
  { label: "Kannada", suffix: "kannada", locale: "kn-IN", flag: "🇮🇳" },
  { label: "Malayalam", suffix: "malayalam", locale: "ml-IN", flag: "🇮🇳" },
  { label: "Marathi", suffix: "marathi", locale: "mr-IN", flag: "🇮🇳" },
  { label: "Punjabi", suffix: "punjabi", locale: "pa-IN", flag: "🇮🇳" },
  { label: "Tamil", suffix: "tamil", locale: "ta-IN", flag: "🇮🇳" },
  { label: "Telugu", suffix: "telugu", locale: "te-IN", flag: "🇮🇳" },
];

interface VoiceLibraryTabProps {
  token: string;
  triggerSuccess: (msg: string) => void;
  triggerError: (msg: string) => void;
}

export const VoiceLibraryTab: React.FC<VoiceLibraryTabProps> = ({
  token,
  triggerSuccess,
  triggerError,
}) => {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Per-voice selected language (default English) — drives both Play and Try.
  const [voiceLang, setVoiceLang] = useState<Record<string, string>>({});
  const langFor = (voice: Voice) =>
    VOICE_LANGUAGES.find((l) => l.suffix === (voiceLang[voice.id] || "english_us")) || VOICE_LANGUAGES[0];
  const sampleFor = (voice: Voice) => {
    const base = voice.sample_url.replace(/^.*\//, "").replace(/\.wav$/i, "");
    return `/voices/${base}_${langFor(voice).suffix}.wav`;
  };
  
  // Filter States
  const [activeProvider, setActiveProvider] = useState<string>("ALL VOICES");
  const [genderFilter, setGenderFilter] = useState<string>("ALL GENDERS");
  const [langFilter, setLangFilter] = useState<string>("ALL LANGUAGES");
  const [searchQuery, setSearchQuery] = useState("");

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

  // Audio Playback States
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Copy Feedback state
  const [copiedVoiceId, setCopiedVoiceId] = useState<string | null>(null);

  // "Try Voice" Modal/Overlay States
  const [tryVoice, setTryVoice] = useState<Voice | null>(null);
  const [customText, setCustomText] = useState("");
  const [synthesizing, setSynthesizing] = useState(false);

  // Fetch voices from backend
  const fetchVoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/dashboard/voices", "GET", undefined, token);
      if (Array.isArray(res)) {
        setVoices(res);
      }
    } catch (err) {
      console.error("Error fetching voices:", err);
      // Fallback seeds if api fails
      setVoices([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchVoices();
    // Warm up speech-synthesis voices so per-voice selection has a populated list.
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
    return () => {
      // Stop audio on unmount
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [fetchVoices]);

  // Play pre-recorded preview sample
  const handlePlayPreview = (voice: Voice) => {
    if (playingVoiceId === voice.id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingVoiceId(null);
      return;
    }

    // Stop current playing audio
    if (audioRef.current) {
      audioRef.current.pause();
    }

    setPlayingVoiceId(voice.id);
    const audio = new Audio(sampleFor(voice));
    audioRef.current = audio;
    audio.play().catch((err) => {
      console.warn("Could not play audio sample:", err);
      // Web Audio API auto-play policy block fallback
      triggerError("Autoplay blocked. Please click again.");
      setPlayingVoiceId(null);
    });

    audio.onended = () => {
      setPlayingVoiceId(null);
    };
  };

  // Copy Voice ID to clipboard
  const handleCopyId = (voiceId: string) => {
    navigator.clipboard.writeText(voiceId);
    setCopiedVoiceId(voiceId);
    triggerSuccess("Voice ID copied to clipboard!");
    setTimeout(() => {
      setCopiedVoiceId(null);
    }, 2000);
  };

  // Speak custom text using Web Speech API (Synthesis) with micro-animation loaders
  const handleSpeakText = () => {
    if (!tryVoice || !customText.trim()) return;

    setSynthesizing(true);
    
    // Stop any sample audio playing
    if (audioRef.current) {
      audioRef.current.pause();
      setPlayingVoiceId(null);
    }

    // Stop existing SpeechSynthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // Simulate standard neural API latency to make it feel premium
    setTimeout(() => {
      if (!window.speechSynthesis) {
        triggerError("Web Speech synthesis is not supported on this browser.");
        setSynthesizing(false);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(customText);
      
      // Give every voice a DISTINCT sound signature so no two agents sound the same.
      const synthVoices = window.speechSynthesis.getVoices();
      const VOICE_PARAMS: Record<string, { pitch: number; rate: number }> = {
        Kore: { pitch: 1.12, rate: 1.0 }, Aoede: { pitch: 1.32, rate: 0.95 }, Leda: { pitch: 1.0, rate: 1.06 },
        Zephyr: { pitch: 1.24, rate: 1.1 }, Gemma: { pitch: 1.16, rate: 0.9 }, Katie: { pitch: 1.42, rate: 1.04 },
        Charon: { pitch: 0.8, rate: 0.96 }, Fenrir: { pitch: 0.7, rate: 1.02 }, Puck: { pitch: 1.0, rate: 1.12 },
        Achird: { pitch: 0.86, rate: 0.9 }, Archie: { pitch: 0.74, rate: 1.06 }, Corey: { pitch: 0.95, rate: 1.0 },
      };
      const isFemale = tryVoice.gender.toLowerCase() === "female";
      const params = VOICE_PARAMS[tryVoice.name] || { pitch: isFemale ? 1.15 : 0.9, rate: 1.0 };

      // Speak in the language the vendor selected for this voice.
      const lang = langFor(tryVoice);
      utterance.lang = lang.locale;

      // Prefer a system voice for that language; fall back to English; keep it distinct per name.
      const langPrefix = lang.locale.split("-")[0].toLowerCase();
      let pool = synthVoices.filter((v) => (v.lang || "").toLowerCase().startsWith(langPrefix));
      if (pool.length === 0) pool = synthVoices.filter((v) => (v.lang || "").toLowerCase().startsWith("en"));
      if (pool.length > 0) {
        let h = 0;
        for (let i = 0; i < tryVoice.name.length; i++) h = (h * 31 + tryVoice.name.charCodeAt(i)) >>> 0;
        utterance.voice = pool[h % pool.length];
      }
      utterance.rate = params.rate;
      utterance.pitch = params.pitch;

      utterance.onend = () => {
        setSynthesizing(false);
      };

      utterance.onerror = (e) => {
        console.error("Speech Synthesis error:", e);
        setSynthesizing(false);
      };

      window.speechSynthesis.speak(utterance);
    }, 1200); // 1.2s realistic neural network compilation delay
  };

  // Filter Logic
  const filteredVoices = voices.filter((voice) => {
    // 1. Provider Tab filter
    if (activeProvider !== "ALL VOICES" && voice.provider.toUpperCase() !== activeProvider.toUpperCase()) {
      return false;
    }
    // 2. Gender filter
    if (genderFilter !== "ALL GENDERS" && voice.gender.toUpperCase() !== genderFilter.toUpperCase()) {
      return false;
    }
    // 3. Language filter
    if (langFilter !== "ALL LANGUAGES") {
      if (langFilter === "ENGLISH" && !voice.language.toLowerCase().includes("english")) return false;
      if (langFilter === "NON-ENGLISH" && voice.language.toLowerCase().includes("english")) return false;
    }
    // 4. Search query
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchName = voice.name.toLowerCase().includes(q);
      const matchDesc = voice.description.toLowerCase().includes(q);
      const matchId = voice.voice_id.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchId) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in text-left">
      
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-950 tracking-tight flex items-center space-x-2">
            <Mic className="w-6 h-6 text-blue-600" />
            <span>Voice Library</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Browse, preview, and try out state-of-the-art neural voices from premium industry pipelines.
          </p>
        </div>
        
      </div>

      {/* Provider Header Navigation Bar */}
      <div className="flex flex-wrap border-b border-slate-200 gap-1 select-none">
        {["ALL VOICES"].map((prov) => (
          <button
            key={prov}
            onClick={() => setActiveProvider(prov)}
            className={`px-4 py-2.5 text-xs font-bold transition-all relative border-b-2 -mb-[2px] cursor-pointer ${
              activeProvider === prov
                ? "border-blue-600 text-blue-600 font-extrabold"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            {prov}
          </button>
        ))}
      </div>

      {/* Interactive Filters Grid Row */}
      <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-3xs grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by speaker or ID..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-blue-600 transition-all shadow-inner"
          />
        </div>

        {/* Filter menu (Gender + Language) */}
        <div className="flex items-center sm:justify-end">
          <FilterMenu
            align="right"
            groups={[
              { key: "gender", label: "Gender", options: [
                { value: "all", label: "All" },
                { value: "FEMALE", label: "Female" },
                { value: "MALE", label: "Male" },
              ] },
              { key: "lang", label: "Language", options: [
                { value: "all", label: "All" },
                { value: "ENGLISH", label: "English" },
                { value: "NON-ENGLISH", label: "Other" },
              ] },
            ]}
            value={{
              gender: genderFilter === "ALL GENDERS" ? "all" : genderFilter,
              lang: langFilter === "ALL LANGUAGES" ? "all" : langFilter,
            }}
            onChange={(k, v) => {
              if (k === "gender") setGenderFilter(v === "all" ? "ALL GENDERS" : v);
              else setLangFilter(v === "all" ? "ALL LANGUAGES" : v);
            }}
            onClear={() => { setGenderFilter("ALL GENDERS"); setLangFilter("ALL LANGUAGES"); }}
          />
        </div>

      </div>

      {/* Main Voices Grid Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-650 mb-3" />
            <p className="text-xs text-slate-450 font-bold uppercase tracking-wider">
              Loading voices…
            </p>
          </div>
        ) : filteredVoices.length === 0 ? (
          <div className="text-center text-slate-400 py-16 font-bold select-none">
            No matching voice profiles found in current selection.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse select-none text-xs font-semibold text-slate-700">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] text-slate-455 font-bold uppercase tracking-wider">
                  <th className="p-4 pl-6 w-16">PLAY</th>
                  <th className="p-4">SPEAKER & DESCRIPTION</th>
                  <th className="p-4">PROVIDER</th>
                  <th className="p-4">LANGUAGE</th>
                  <th className="p-4">GENDER</th>
                  <th className="p-4 pr-6 text-right w-24">SPEECH TEST</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVoices.map((voice) => {
                  const isPlaying = playingVoiceId === voice.id;
                  const isCopied = copiedVoiceId === voice.voice_id;
                  return (
                    <tr key={voice.id} className="hover:bg-slate-50/40 transition-all">
                      
                      {/* Play Button Action */}
                      <td className="p-4 pl-6">
                        <button
                          onClick={() => handlePlayPreview(voice)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                            isPlaying
                              ? "bg-rose-50 border border-rose-200 text-rose-600 animate-pulse"
                              : "bg-blue-50 border border-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white"
                          } cursor-pointer active:scale-90`}
                        >
                          {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                        </button>
                      </td>

                      {/* Name & Desc */}
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <span className="text-slate-950 font-extrabold block text-sm">{voice.name}</span>
                          <span className="text-[10px] text-slate-450 block leading-relaxed font-normal">{voice.description}</span>
                        </div>
                      </td>

                      {/* Provider Badge */}
                      <td className="p-4">
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-sm tracking-wider uppercase ${
                          voice.provider === "ELEVENLABS"
                            ? "text-purple-700 bg-purple-50 border border-purple-100"
                            : voice.provider === "AZURE"
                              ? "text-blue-700 bg-blue-50 border border-blue-100"
                              : "text-amber-800 bg-amber-50 border border-amber-200"
                        }`}>
                          {voice.provider}
                        </span>
                      </td>

                      {/* Language dropdown — vendor picks the language; drives Play + Try */}
                      <td className="p-4">
                        <select
                          value={voiceLang[voice.id] || "english_us"}
                          onChange={(e) => setVoiceLang((prev) => ({ ...prev, [voice.id]: e.target.value }))}
                          className="h-8 pl-2.5 pr-7 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white cursor-pointer appearance-none transition-colors"
                        >
                          {VOICE_LANGUAGES.map((l) => (
                            <option key={l.suffix} value={l.suffix}>{l.label}</option>
                          ))}
                        </select>
                      </td>

                      {/* Gender Badge */}
                      <td className="p-4">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${
                          voice.gender === "Female"
                            ? "text-rose-700 bg-rose-50/50"
                            : "text-indigo-700 bg-indigo-50/50"
                        }`}>
                          {voice.gender}
                        </span>
                      </td>

                      {/* Speak Custom Try Button */}
                      <td className="p-4 pr-6 text-right">
                        <button
                          onClick={() => {
                            setTryVoice(voice);
                            setCustomText(`Hello! I am ${voice.name.split("-")[0].trim()}. How does my neural voice clarity sound to you?`);
                          }}
                          className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-[10px] font-bold text-white rounded-md transition-all active:scale-[0.97] cursor-pointer flex items-center justify-center space-x-1 ml-auto"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Try</span>
                        </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* "TRY VOICE" INTERACTIVE TEXT-TO-SPEECH OVERLAY DRAWER */}
      {tryVoice && mounted && typeof window !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto flex items-center justify-center bg-black/50 backdrop-blur-md p-4 select-none animate-fade-in">
          <div className="w-full max-w-lg bg-white border border-slate-250 rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between animate-scale-up text-left">
            
            {/* Header */}
            <div className="bg-slate-50 h-14 px-6 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Sparkles className="w-4.5 h-4.5 text-blue-650 animate-pulse" />
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  Live Neural Test: {tryVoice.name}
                </h4>
              </div>
              <button
                onClick={() => {
                  setTryVoice(null);
                  if (window.speechSynthesis) window.speechSynthesis.cancel();
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-current text-slate-400 hover:text-slate-650" />
              </button>
            </div>

            {/* Inner try out form */}
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wide">
                  Type Testing Dialogue
                </label>
                <textarea
                  rows={4}
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  maxLength={250}
                  placeholder="Enter custom speech script..."
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-600 outline-none transition-all shadow-inner leading-relaxed"
                />
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold select-none">
                  <span>Simulated Synthesis Pipeline</span>
                  <span>{customText.length}/250 chars</span>
                </div>
              </div>

              {/* Loader during Simulated Generation */}
              {synthesizing && (
                <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center space-x-3 text-xs font-semibold text-blue-700 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-650 shrink-0" />
                  <span>Synthesizing voice waves via {tryVoice.provider.toLowerCase()} API...</span>
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between gap-3 select-none">
              <button
                onClick={() => {
                  setTryVoice(null);
                  if (window.speechSynthesis) window.speechSynthesis.cancel();
                }}
                className="h-9 px-4 border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-600 rounded-lg transition-all cursor-pointer"
              >
                Close Drawer
              </button>

              <button
                onClick={handleSpeakText}
                disabled={synthesizing || !customText.trim()}
                className="h-9 px-5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-xs font-bold text-white rounded-lg transition-all flex items-center justify-center space-x-1.5 active:scale-[0.98] cursor-pointer shadow-sm"
              >
                <Volume2 className="w-4 h-4" />
                <span>Speak Voice Script</span>
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
