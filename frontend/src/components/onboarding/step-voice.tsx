"use client";

import React, { useState, useEffect } from "react";
import { useOnboardingStore } from "src/store/useOnboardingStore";
import { Volume2, Play, Pause, Check, Search, Sliders, Mic, User, Headphones } from "lucide-react";
import { motion } from "framer-motion";

interface Voice {
  id: string;
  name: string;
  desc: string;
  gender: "Male" | "Female";
  lang: string;
  accentGroup: "General American" | "British" | "Australian";
  accentLabel: string;
  soundHeights: number[];
}

const voicesList: Voice[] = [
  {
    id: "Evelyn",
    name: "Evelyn",
    desc: "Calm & Professional",
    gender: "Female",
    lang: "English (US)",
    accentGroup: "General American",
    accentLabel: "US Accent",
    soundHeights: [16, 28, 12, 36, 20, 44, 24, 14, 38, 20, 28, 10]
  },
  {
    id: "Marcus",
    name: "Marcus",
    desc: "Authoritative & Deep",
    gender: "Male",
    lang: "English (UK)",
    accentGroup: "British",
    accentLabel: "UK Accent",
    soundHeights: [10, 16, 12, 14, 18, 12, 16, 10, 12, 14, 16, 8]
  },
  {
    id: "Sophia",
    name: "Sophia",
    desc: "Friendly & Energetic",
    gender: "Female",
    lang: "English (AU)",
    accentGroup: "Australian",
    accentLabel: "AU Accent",
    soundHeights: [12, 18, 14, 22, 24, 18, 20, 14, 16, 18, 20, 10]
  },
  {
    id: "Liam",
    name: "Liam",
    desc: "Soft & Informative",
    gender: "Male",
    lang: "English (US)",
    accentGroup: "General American",
    accentLabel: "Mid-Atl Accent",
    soundHeights: [8, 14, 10, 12, 16, 12, 14, 10, 8, 12, 14, 6]
  }
];

export const StepVoice: React.FC = () => {
  const {
    selectedVoice,
    voiceSpeakingRate,
    voicePitchVariance,
    voiceOutputVolume,
    voiceTestScript,
    voiceGenderFilter,
    voiceLanguageFilter,
    voiceAccentFilter,
    voiceSearchQuery,
    setBusinessDetails
  } = useOnboardingStore();

  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Load voices and bind onvoiceschanged
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const updateVoices = () => {
        setBrowserVoices(window.speechSynthesis.getVoices());
      };
      updateVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = updateVoices;
      }
    }
  }, []);

  // Shared function to synthesize speech
  const speakVoice = (voiceId: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const textToSpeak = voiceTestScript || "Hello! I am your new Voqly AI agent. How can I assist you with your operations today?";
    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    const voices = browserVoices.length > 0 ? browserVoices : window.speechSynthesis.getVoices();
    let matchedVoice = null;

    if (voiceId === "Evelyn") {
      matchedVoice = voices.find(v => v.lang.includes("en-US") && (v.name.includes("Zira") || v.name.includes("Google US English") || v.name.includes("Samantha") || v.name.toLowerCase().includes("female")));
    } else if (voiceId === "Marcus") {
      matchedVoice = voices.find(v => v.lang.includes("en-GB") && (v.name.includes("Hazel") || v.name.includes("Google UK English Male") || v.name.toLowerCase().includes("male")));
    } else if (voiceId === "Sophia") {
      matchedVoice = voices.find(v => v.lang.includes("en-AU") || v.lang.includes("en-GB") && v.name.toLowerCase().includes("female"));
    } else if (voiceId === "Liam") {
      matchedVoice = voices.find(v => v.lang.includes("en-US") && (v.name.includes("David") || v.name.toLowerCase().includes("male")));
    }

    if (matchedVoice) {
      utterance.voice = matchedVoice;
    } else {
      // Fallback matching by gender
      const selectedConfig = voicesList.find(v => v.id === voiceId);
      if (selectedConfig) {
        const genderMatch = voices.find(v => 
          selectedConfig.gender === "Female" 
            ? v.name.toLowerCase().includes("female") || v.name.includes("Zira") || v.name.includes("Samantha")
            : v.name.toLowerCase().includes("male") || v.name.includes("David")
        );
        if (genderMatch) utterance.voice = genderMatch;
      }
    }

    utterance.rate = voiceSpeakingRate;
    utterance.volume = voiceOutputVolume / 100;
    utterance.pitch = 1.0 + (voicePitchVariance / 100);

    utterance.onend = () => {
      setPreviewingVoiceId(null);
    };
    utterance.onerror = () => {
      setPreviewingVoiceId(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handlePlayPreview = (voiceId: string) => {
    if (previewingVoiceId === voiceId) {
      // Stop playing
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setPreviewingVoiceId(null);
    } else {
      setPreviewingVoiceId(voiceId);
      if (typeof window !== "undefined" && window.speechSynthesis) {
        speakVoice(voiceId);
      } else {
        // Simple timer fallback for static audio mock if Synthesis isn't available
        setTimeout(() => {
          setPreviewingVoiceId((current) => current === voiceId ? null : current);
        }, 4000);
      }
    }
  };

  // Debounced speech synthesis trigger for settings changes
  useEffect(() => {
    if (!previewingVoiceId) return;

    // Set a debounce timer to avoid stuttering while dragging the slider
    const timer = setTimeout(() => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        speakVoice(previewingVoiceId);
      }
    }, 250); // 250ms debounce for smoother live changes

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceSpeakingRate, voicePitchVariance, voiceOutputVolume, voiceTestScript]);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const filteredVoices = voicesList.filter((voice) => {
    const matchesGender = voiceGenderFilter === "All Genders" || voice.gender === voiceGenderFilter;
    const matchesLanguage = voiceLanguageFilter === "All Languages" || voice.lang === voiceLanguageFilter;
    const matchesAccent = voiceAccentFilter === "All Accents" || voice.accentGroup === voiceAccentFilter;
                          
    const matchesSearch = voice.name.toLowerCase().includes(voiceSearchQuery.toLowerCase()) ||
                          voice.desc.toLowerCase().includes(voiceSearchQuery.toLowerCase()) ||
                          voice.accentLabel.toLowerCase().includes(voiceSearchQuery.toLowerCase());
                          
    return matchesGender && matchesLanguage && matchesAccent && matchesSearch;
  });

  return (
    <div className="w-full space-y-6 text-slate-800 text-left animate-fade-in">
      
      {/* Title */}
      <div className="space-y-1">
        <span className="text-blue-600 text-xs font-bold tracking-wider uppercase block mb-1">Step 2 of 15</span>
        <h2 className="text-2xl font-bold text-slate-950 tracking-tight">Voice Selection</h2>
        <p className="text-xs text-slate-500 font-medium">
          Choose the vocal signature for your AI agent from our neural library.
        </p>
      </div>

      {/* Horizontal Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap md:flex-nowrap gap-4 items-end shadow-sm">
        
        {/* Gender Filter */}
        <div className="flex-1 min-w-[130px] space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gender</label>
          <select
            value={voiceGenderFilter}
            onChange={(e) => setBusinessDetails({ voiceGenderFilter: e.target.value })}
            className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all font-semibold cursor-pointer"
          >
            <option value="All Genders">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>

        {/* Language Filter */}
        <div className="flex-1 min-w-[130px] space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Language</label>
          <select
            value={voiceLanguageFilter}
            onChange={(e) => setBusinessDetails({ voiceLanguageFilter: e.target.value })}
            className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all font-semibold cursor-pointer"
          >
            <option value="All Languages">All Languages</option>
            <option value="English (US)">English (US)</option>
            <option value="English (UK)">English (UK)</option>
            <option value="English (AU)">English (AU)</option>
          </select>
        </div>

        {/* Accent Filter */}
        <div className="flex-1 min-w-[150px] space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Accent</label>
          <select
            value={voiceAccentFilter}
            onChange={(e) => setBusinessDetails({ voiceAccentFilter: e.target.value })}
            className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all font-semibold cursor-pointer"
          >
            <option value="All Accents">All Accents</option>
            <option value="General American">General American</option>
            <option value="British">British</option>
            <option value="Australian">Australian</option>
          </select>
        </div>

        {/* Search voices query input */}
        <div className="flex-[2] min-w-[200px] space-y-1.5 relative">
          <input
            type="text"
            placeholder="Search voices..."
            value={voiceSearchQuery}
            onChange={(e) => setBusinessDetails({ voiceSearchQuery: e.target.value })}
            className="flex h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 py-2 text-xs text-slate-950 placeholder-slate-400 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all font-semibold"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 bottom-3" />
        </div>

      </div>

      {/* Grid Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* Left Side (Voice Cards Grid) */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredVoices.map((voice) => {
            const isSelected = selectedVoice === voice.id;
            const isPlaying = previewingVoiceId === voice.id;
            
            return (
              <div
                key={voice.id}
                onClick={() => setBusinessDetails({ selectedVoice: voice.id, agentName: voice.name })}
                className={`p-5 rounded-2xl border-2 transition-all duration-300 relative cursor-pointer flex flex-col justify-between h-[180px] group ${
                  isSelected
                    ? "border-blue-600 bg-white shadow-md ring-2 ring-blue-600/5"
                    : "border-slate-200 bg-white hover:border-slate-350 hover:shadow-xs"
                }`}
              >
                
                {/* Header Information inside Card */}
                <div className="flex items-center space-x-3">
                  
                  {/* Decorative Avatar / Neural Wave Circle */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 select-none transition-all duration-300 ${
                    isSelected
                      ? "bg-blue-900 text-blue-100"
                      : "bg-[#f1f5f9] text-slate-600 border border-slate-200 group-hover:border-slate-300"
                  }`}>
                    {voice.id === "Evelyn" ? (
                      <Volume2 className="w-4 h-4" />
                    ) : voice.id === "Marcus" ? (
                      <Mic className="w-4 h-4" />
                    ) : voice.id === "Sophia" ? (
                      <Headphones className="w-4 h-4" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{voice.name}</h4>
                    <p className="text-[10px] text-slate-500 font-semibold">{voice.desc}</p>
                  </div>
                </div>

                {/* Radio selection checkmark pill */}
                <div className="absolute top-5 right-5">
                  {isSelected ? (
                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center shadow-sm">
                      <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-slate-300 bg-white" />
                  )}
                </div>

                {/* Animated Vocal Soundwave Indicator */}
                <div className="h-7 flex items-end space-x-[3.5px] my-2 select-none">
                  {voice.soundHeights.map((height, i) => (
                    <motion.div
                      key={i}
                      animate={
                        isPlaying
                          ? { height: [height * 0.3, height * 1.3, height * 0.5, height] }
                          : { height: height }
                      }
                      transition={
                        isPlaying
                          ? {
                              duration: 0.7,
                              repeat: Infinity,
                              repeatType: "reverse",
                              delay: i * 0.04,
                              ease: "easeInOut"
                            }
                          : { duration: 0.2 }
                      }
                      className={`w-[3px] rounded-full transition-colors duration-300 ${
                        isSelected 
                          ? "bg-blue-600" 
                          : isPlaying 
                          ? "bg-blue-500" 
                          : "bg-slate-300 group-hover:bg-slate-400"
                      }`}
                      style={{ height: `${height}px` }}
                    />
                  ))}
                </div>

                {/* Card Bottom Controls */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1">
                  
                  {/* Local Sample Preview Action */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation(); // Stop parent bubble selection
                      handlePlayPreview(voice.id);
                    }}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-700 bg-white hover:bg-slate-50 transition-all select-none cursor-pointer active:scale-[0.97]"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-3 h-3 text-blue-600 fill-blue-600" />
                        <span className="text-blue-650">Stop</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 text-slate-500 fill-slate-500" />
                        <span>Preview</span>
                      </>
                    )}
                  </button>

                  <span className="text-[10px] font-bold text-slate-400 tracking-wide uppercase shrink-0">
                    {voice.accentLabel}
                  </span>

                </div>

              </div>
            );
          })}

          {filteredVoices.length === 0 && (
            <div className="col-span-2 border border-dashed border-slate-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-2 bg-white">
              <Headphones className="w-8 h-8 text-slate-400 animate-pulse" />
              <h5 className="text-xs font-bold text-slate-800">No vocal match found</h5>
              <p className="text-[10px] text-slate-500 font-medium">Try relaxing your search query or gender filter settings.</p>
            </div>
          )}

        </div>

        {/* Right Side (Voice Tuning Panel) */}
        <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[460px] gap-6 shrink-0">
          
          <div>
            {/* Header Title */}
            <div className="flex items-center space-x-2 pb-4 border-b border-slate-100 select-none">
              <Sliders className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-900 tracking-tight uppercase">Voice Tuning</h3>
            </div>

            {/* Sliders Container */}
            <div className="space-y-6 py-4">
              
              {/* Speaking Rate Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Speaking Rate</label>
                  <span className="text-[10px] font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                    {voiceSpeakingRate.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.1"
                  value={voiceSpeakingRate}
                  onChange={(e) => setBusinessDetails({ voiceSpeakingRate: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 outline-none transition-all hover:bg-slate-300"
                />
                <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Slow</span>
                  <span>Fast</span>
                </div>
              </div>

              {/* Pitch Variance Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pitch Variance</label>
                  <span className="text-[10px] font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                    {voicePitchVariance > 0 ? `+${voicePitchVariance}` : voicePitchVariance}%
                  </span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="5"
                  value={voicePitchVariance}
                  onChange={(e) => setBusinessDetails({ voicePitchVariance: parseInt(e.target.value) })}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 outline-none transition-all hover:bg-slate-300"
                />
                <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Deep</span>
                  <span>High</span>
                </div>
              </div>

              {/* Output Volume Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Output Volume</label>
                  <span className="text-[10px] font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                    {voiceOutputVolume}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={voiceOutputVolume}
                  onChange={(e) => setBusinessDetails({ voiceOutputVolume: parseInt(e.target.value) })}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 outline-none transition-all hover:bg-slate-300"
                />
                <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Quiet</span>
                  <span>Loud</span>
                </div>
              </div>

            </div>
          </div>

          {/* Live Test Script Box */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="text-[10px] font-bold text-slate-550 uppercase tracking-wider block">Live Test Script</label>
            <textarea
              value={voiceTestScript}
              onChange={(e) => setBusinessDetails({ voiceTestScript: e.target.value })}
              rows={3}
              className="w-full rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-[11px] font-semibold text-slate-800 focus:bg-white focus:border-blue-600 outline-none resize-none transition-all leading-relaxed shadow-inner"
              placeholder="Type something for the agent to say..."
            />
          </div>

        </div>

      </div>

    </div>
  );
};
