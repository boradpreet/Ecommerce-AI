"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useAuthStore } from "src/store/authStore";
import { useRouter, useParams } from "next/navigation";
import { apiFetch } from "src/lib/api";
import {
  ArrowLeft, Save, Loader2, Play, Pause, Check, X,
  ChevronRight, Sparkles, ShoppingBag, Heart, Coins,
  Megaphone, FileText, HelpCircle, Mic, Globe, User, MessageSquare, CreditCard,
  Plus,
  Home, Landmark, ShieldCheck, GraduationCap, Plane, UtensilsCrossed, Car, Users, Truck, RadioTower, Building2
} from "lucide-react";
import {
  CatalogCategory,
  CatalogOptionsResponse,
  getFirstSubcategory,
  getSubcategoriesForCategory,
} from "src/lib/agent-catalog";
import { useOnboardingStore } from "src/store/useOnboardingStore";
import { normalizeIndustry } from "src/components/onboarding/step-industry";

interface Agent {
  id: number;
  name: string;
  voice_id: string;
  voice_provider: string;
  prompt_system: string;
  temperature: number;
  lang?: string;
  first_message?: string;
  category?: string;
  subcategory?: string;
  status?: string;
}

const DEFAULT_AGENT_SETTINGS = {
  name: "New Voice Agent",
  first_message: "Hello! How can I assist you today?",
  category: "Ecommerce",
  subcategory: "Marketing Campaign",
  voice_id: "Kore",
  lang: "ENGLISH (US)",
  temperature: 0.7,
  voice_provider: "gemini"
};

const FEMALE_VOICES_EN = [
  { id: "Kore", name: "Kore", desc: "Balanced and crisp neural voice (Default)", sample: "/voices/kore.wav" },
  { id: "Aoede", name: "Aoede", desc: "Warm and expressive conversational voice", sample: "/voices/aoede.wav" },
  { id: "Leda", name: "Leda", desc: "Professional and direct clear voice", sample: "/voices/leda.wav" },
  { id: "Zephyr", name: "Zephyr", desc: "Warm and bright conversational voice", sample: "/voices/zephyr.wav" },
  { id: "Gemma", name: "Gemma", desc: "Clear and professional polished voice", sample: "/voices/kore.wav" },
  { id: "Katie", name: "Katie", desc: "Bright and cheerful energetic voice", sample: "/voices/aoede.wav" },
];

const MALE_VOICES_EN = [
  { id: "Charon", name: "Charon", desc: "Deep and steady neural voice (Default)", sample: "/voices/charon.wav" },
  { id: "Fenrir", name: "Fenrir", desc: "Strong and clear authoritative voice", sample: "/voices/fenrir.wav" },
  { id: "Puck", name: "Puck", desc: "Energetic and crisp friendly voice", sample: "/voices/puck.wav" },
  { id: "Achird", name: "Achird", desc: "Calm and smooth business voice", sample: "/voices/achird.wav" },
  { id: "Archie", name: "Archie", desc: "Strong and clear authoritative voice", sample: "/voices/fenrir.wav" },
  { id: "Corey", name: "Corey", desc: "Polished and friendly conversational voice", sample: "/voices/charon.wav" },
];

const FEMALE_VOICES_IN = [
  { id: "Raveena", name: "Raveena", desc: "Balanced and clear Indian voice (Default)", sample: "/voices/kore.wav" },
  { id: "Ananya", name: "Ananya", desc: "Warm and melodic conversational voice", sample: "/voices/aoede.wav" },
  { id: "Priya", name: "Priya", desc: "Professional and direct clear voice", sample: "/voices/leda.wav" },
  { id: "Kavita", name: "Kavita", desc: "Polished and steady friendly voice", sample: "/voices/kore.wav" },
  { id: "Zara", name: "Zara", desc: "Warm and bright conversational voice", sample: "/voices/zephyr.wav" },
  { id: "Diya", name: "Diya", desc: "Bright and cheerful expressive voice", sample: "/voices/leda.wav" },
];

const MALE_VOICES_IN = [
  { id: "Arvind", name: "Arvind", desc: "Deep and steady Indian voice (Default)", sample: "/voices/charon.wav" },
  { id: "Amit", name: "Amit", desc: "Strong and clear conversational voice", sample: "/voices/fenrir.wav" },
  { id: "Rohan", name: "Rohan", desc: "Energetic and friendly clear voice", sample: "/voices/puck.wav" },
  { id: "Rahul", name: "Rahul", desc: "Calm and smooth business voice", sample: "/voices/achird.wav" },
  { id: "Dev", name: "Dev", desc: "Warm and polished professional voice", sample: "/voices/fenrir.wav" },
  { id: "Kabir", name: "Kabir", desc: "Steady and deep conversational voice", sample: "/voices/charon.wav" },
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "E-commerce": <ShoppingBag className="w-5 h-5" />,
  "Ecommerce": <ShoppingBag className="w-5 h-5" />,
  "Healthcare": <Heart className="w-5 h-5" />,
  "Real Estate": <Home className="w-5 h-5" />,
  "Banking & Finance": <Landmark className="w-5 h-5" />,
  "Finance": <Coins className="w-5 h-5" />,
  "Insurance": <ShieldCheck className="w-5 h-5" />,
  "Education": <GraduationCap className="w-5 h-5" />,
  "Travel & Hospitality": <Plane className="w-5 h-5" />,
  "Restaurants": <UtensilsCrossed className="w-5 h-5" />,
  "Automotive": <Car className="w-5 h-5" />,
  "Recruitment & HR": <Users className="w-5 h-5" />,
  "Logistics": <Truck className="w-5 h-5" />,
  "Telecom": <RadioTower className="w-5 h-5" />,
};
const categoryIcon = (name: string): React.ReactNode => CATEGORY_ICONS[name] || <Building2 className="w-5 h-5" />;
const CATEGORY_DESC: Record<string, string> = {
  "E-commerce": "Orders, delivery & support",
  "Healthcare": "Appointments & patient care",
  "Real Estate": "Property leads & site visits",
  "Banking & Finance": "Loans, EMI & KYC",
  "Insurance": "Renewals, claims & leads",
  "Education": "Admissions & student support",
  "Travel & Hospitality": "Bookings & travel updates",
  "Restaurants": "Reservations & orders",
  "Automotive": "Service & sales follow-up",
  "Recruitment & HR": "Screening & scheduling",
  "Logistics": "Delivery & tracking",
  "Telecom": "Onboarding & retention",
};

function slugToId(slug: string): number | null {
  if (!slug) return null;
  const match = slug.match(/^vq_live_([0-9a-f]+)$/i);
  if (match) return parseInt(match[1], 16);
  const id = parseInt(slug, 10);
  return isNaN(id) ? null : id;
}

function agentSlug(id: number): string {
  return `vq_live_${id.toString(16).padStart(5, "0")}`;
}

export default function AgentDetailPage() {
  const token = useAuthStore((s) => s.token);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const router = useRouter();
  const params = useParams();
  const agentIdSlug = params?.agentId as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Wizard active step
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  // ── Form State ──
  const [agentName, setAgentName] = useState(DEFAULT_AGENT_SETTINGS.name);
  const [category, setCategory] = useState<string>("Ecommerce");
  const [subcategory, setSubcategory] = useState("Marketing Campaign");
  const [voiceId, setVoiceId] = useState(DEFAULT_AGENT_SETTINGS.voice_id);
  const [lang, setLang] = useState(DEFAULT_AGENT_SETTINGS.lang);
  const [firstMessage, setFirstMessage] = useState(DEFAULT_AGENT_SETTINGS.first_message);

  const [catalogOptions, setCatalogOptions] = useState<CatalogCategory[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [defaultCategory, setDefaultCategory] = useState<string>("");
  const onboardedIndustry = useOnboardingStore((s) => s.selectedIndustry);
  const catalogResolvedRef = useRef(false);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addMode, setAddMode] = useState<"new_category" | "existing_category">("existing_category");
  const [addCategory, setAddCategory] = useState("");
  const [addSubcategory, setAddSubcategory] = useState("");
  const [addSystemPrompt, setAddSystemPrompt] = useState("");
  const [addSaving, setAddSaving] = useState(false);

  // Play/pause sample audio state
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const markChanged = () => {
    setHasChanges(true);
  };

  const hydrateForm = useCallback((a: Agent) => {
    setAgentName(a.name);
    setFirstMessage(a.first_message || DEFAULT_AGENT_SETTINGS.first_message);
    setLang(a.lang || DEFAULT_AGENT_SETTINGS.lang);
    
    // Normalize generic "female" or "male" voices to specific prebuilt voices based on language
    let initialVoiceId = a.voice_id || DEFAULT_AGENT_SETTINGS.voice_id;
    const isInd = ["HINDI", "BENGALI", "GUJARATI", "KANNADA", "MALAYALAM", "MARATHI", "PUNJABI", "TAMIL", "TELUGU"].includes((a.lang || "").toUpperCase());
    if (initialVoiceId.toLowerCase() === "female") {
      initialVoiceId = isInd ? "Raveena" : "Kore";
    } else if (initialVoiceId.toLowerCase() === "male") {
      initialVoiceId = isInd ? "Arvind" : "Charon";
    }
    setVoiceId(initialVoiceId);
    
    const catVal = a.category || "Ecommerce";
    setCategory(catVal);
    setSubcategory(a.subcategory || "Marketing Campaign");
    
    setHasChanges(agentIdSlug === "new");
  }, [agentIdSlug]);

  // Once the catalog is loaded, ensure a valid category is selected. Map legacy
  // names (Ecommerce -> E-commerce, Finance -> Banking & Finance); otherwise
  // prefer the vendor's onboarded industry, else fall back to the first industry.
  useEffect(() => {
    if (catalogLoading || catalogOptions.length === 0 || catalogResolvedRef.current) return;
    const names = new Set(catalogOptions.map((c) => c.name));
    if (names.has(category)) { catalogResolvedRef.current = true; return; }
    const legacy: Record<string, string> = {
      "Ecommerce": "E-commerce", "E-Commerce": "E-commerce",
      "Finance": "Banking & Finance", "FinTech": "Banking & Finance",
    };
    const mapped = legacy[category];
    const onboarded = normalizeIndustry(onboardedIndustry || "");
    // Prefer the vendor's onboarded industry (server-resolved) so a Healthcare
    // vendor lands on Healthcare — not the meaningless "Ecommerce" blank default.
    const target =
      (defaultCategory && names.has(defaultCategory)) ? defaultCategory :
      (onboarded && names.has(onboarded)) ? onboarded :
      (mapped && names.has(mapped)) ? mapped :
      catalogOptions[0]?.name;
    if (target) {
      setCategory(target);
      setSubcategory(getFirstSubcategory(catalogOptions, target));
    }
    catalogResolvedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogLoading, catalogOptions]);

  const fetchCatalogOptions = useCallback(async () => {
    if (!token) return;
    setCatalogLoading(true);
    try {
      const data = await apiFetch<CatalogOptionsResponse>(
        "/dashboard/agent-catalog/options",
        "GET",
        undefined,
        token
      );
      if (data?.categories) {
        setCatalogOptions(data.categories);
        setDefaultCategory(data.default_category || "");
      }
    } catch {
      showToast("Could not load category options.", "error");
    } finally {
      setCatalogLoading(false);
    }
  }, [token]);

  const fetchAgent = useCallback(async () => {
    if (!token || !agentIdSlug) return;
    if (agentIdSlug === "new") {
      const placeholder: Agent = {
        id: 0,
        name: "New Voice Agent",
        voice_id: "Kore",
        voice_provider: "gemini",
        prompt_system: "# IDENTITY\nYou are a professional voice representative.",
        temperature: 0.7,
        lang: "ENGLISH (US)",
        first_message: "Hello! How can I assist you today?",
        category: "Ecommerce",
        subcategory: "Marketing Campaign",
        status: "ACTIVE"
      };
      setAgent(placeholder);
      hydrateForm(placeholder);
      setLoading(false);
      return;
    }
    const numId = slugToId(agentIdSlug);
    setLoading(true);
    try {
      const data = await apiFetch<Agent[]>("/dashboard/agents", "GET", undefined, token);
      if (Array.isArray(data)) {
        const found = numId ? data.find((a) => a.id === numId) : null;
        if (found) {
          setAgent(found);
          hydrateForm(found);
        } else {
          showToast("Agent not found.", "error");
          router.replace("/dashboard/agents");
        }
      }
    } catch {
      showToast("Could not load agent. Backend may be offline.", "error");
    } finally {
      setLoading(false);
    }
  }, [token, agentIdSlug, router, hydrateForm]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!token) { router.replace("/"); return; }
    fetchCatalogOptions();
    fetchAgent();
  }, [hasHydrated, token, router, fetchAgent, fetchCatalogOptions]);

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  // Play audio sample
  const handlePlayVoice = (id: string, url: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card selection
    if (typeof playingId !== "undefined" && playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.play().catch(() => setPlayingId(null));
    audio.onended = () => setPlayingId(null);
    setPlayingId(id);
  };

  const isIndianLanguage = (l: string) => {
    return ["HINDI", "BENGALI", "GUJARATI", "KANNADA", "MALAYALAM", "MARATHI", "PUNJABI", "TAMIL", "TELUGU"].includes((l || "").toUpperCase());
  };

  const getVoiceSampleUrl = (voiceId: string, currentLang: string) => {
    const voiceMap: Record<string, string> = {
      kore: "kore",
      aoede: "aoede",
      leda: "leda",
      zephyr: "zephyr",
      gemma: "kore",
      katie: "aoede",
      charon: "charon",
      fenrir: "fenrir",
      puck: "puck",
      achird: "achird",
      archie: "fenrir",
      corey: "charon",
      raveena: "kore",
      ananya: "aoede",
      priya: "leda",
      kavita: "kore",
      zara: "zephyr",
      diya: "leda",
      arvind: "charon",
      amit: "fenrir",
      rohan: "puck",
      rahul: "achird",
      dev: "fenrir",
      kabir: "charon",
    };
    const underlyingVoice = voiceMap[voiceId.toLowerCase()] || "kore";
    const langLower = (currentLang || "").toLowerCase();
    let langSuffix = "english_us";
    if (langLower.includes("hindi")) langSuffix = "hindi";
    else if (langLower.includes("bengali")) langSuffix = "bengali";
    else if (langLower.includes("gujarati")) langSuffix = "gujarati";
    else if (langLower.includes("kannada")) langSuffix = "kannada";
    else if (langLower.includes("malayalam")) langSuffix = "malayalam";
    else if (langLower.includes("marathi")) langSuffix = "marathi";
    else if (langLower.includes("punjabi")) langSuffix = "punjabi";
    else if (langLower.includes("tamil")) langSuffix = "tamil";
    else if (langLower.includes("telugu")) langSuffix = "telugu";
    return `/voices/${underlyingVoice}_${langSuffix}.wav`;
  };

  const handleLangChange = (newLang: string) => {
    setLang(newLang);
    markChanged();
    
    const currentIsInd = isIndianLanguage(lang);
    const newIsInd = isIndianLanguage(newLang);
    
    if (currentIsInd !== newIsInd) {
      const voiceLower = (voiceId || "").toLowerCase();
      const femaleIds = ["female", "aoede", "kore", "leda", "zephyr", "gemma", "katie", "raveena", "ananya", "priya", "kavita", "zara", "diya"];
      const isFemale = femaleIds.includes(voiceLower);
      
      const mapping: Record<string, string> = {
        kore: "Raveena",
        aoede: "Ananya",
        leda: "Priya",
        zephyr: "Zara",
        gemma: "Kavita",
        katie: "Diya",
        charon: "Arvind",
        fenrir: "Amit",
        puck: "Rohan",
        achird: "Rahul",
        archie: "Dev",
        corey: "Kabir",
        raveena: "Kore",
        ananya: "Aoede",
        priya: "Leda",
        kavita: "Gemma",
        zara: "Zephyr",
        diya: "Katie",
        arvind: "Charon",
        amit: "Fenrir",
        rohan: "Puck",
        rahul: "Achird",
        dev: "Archie",
        kabir: "Corey",
      };
      
      if (mapping[voiceLower]) {
        setVoiceId(mapping[voiceLower]);
      } else if (newIsInd) {
        setVoiceId(isFemale ? "Raveena" : "Arvind");
      } else {
        setVoiceId(isFemale ? "Kore" : "Charon");
      }
    }
  };

  const selectCategory = (catName: string) => {
    setCategory(catName);
    setSubcategory(getFirstSubcategory(catalogOptions, catName));
    markChanged();
  };

  const openAddModal = (mode: "new_category" | "existing_category") => {
    setAddMode(mode);
    setAddCategory(mode === "existing_category" ? category : "");
    setAddSubcategory("");
    setAddSystemPrompt("");
    setAddModalOpen(true);
  };

  const handleAddCatalogOption = async () => {
    if (!token) return;
    setAddSaving(true);
    try {
      const res = await apiFetch<{
        status: string;
        message: string;
      }>(
        "/dashboard/agent-catalog/requests",
        "POST",
        {
          category: addCategory.trim(),
          subcategory: addSubcategory.trim(),
        },
        token
      );
      setAddModalOpen(false);
      showToast(res?.message || "Category/subcategory request submitted to admin for approval.", "success");
    } catch (err) {
      showToast((err as Error)?.message || "Failed to submit category request.", "error");
    } finally {
      setAddSaving(false);
    }
  };

  const currentSubcategories = getSubcategoriesForCategory(catalogOptions, category);
  const customCategories = catalogOptions.filter((c) => c.is_custom);
  // Built-in industries come from the backend catalog (all 12), not a hardcoded list.
  const globalCategories = catalogOptions.filter((c) => !c.is_custom);
  // Vendors only see the industry they picked at onboarding (default_category);
  // fall back to all if it isn't resolved yet.
  const myIndustry = globalCategories.find((c) => c.name === defaultCategory);
  const shownCategories = myIndustry ? [myIndustry] : globalCategories;
  const buildPayload = () => ({
    name: agentName,
    first_message: firstMessage,
    lang,
    voice_id: voiceId,
    category,
    subcategory,
    voice_provider: "gemini"
  });

  const handleSave = async () => {
    if (!agent) return;
    setSaving(true);
    try {
      if (agentIdSlug === "new") {
        const payload = {
          ...buildPayload(),
          prompt_system: "# IDENTITY\nYou are a professional voice representative.",
          temperature: 0.7,
          llm_provider: "Groq",
          llm_model: "openai/gpt-oss-120b",
          transcriber: "Deepgram/Flux General Multi/English",
          capabilities: "Customer Support / General FAQ"
        };
        const res = await apiFetch<{ status: string; agent: Agent }>(
          "/dashboard/agents", "POST", payload, token
        );
        if (res?.agent) {
          showToast("Voice Agent created successfully!", "success");
          setTimeout(() => {
            router.push("/dashboard/agents");
          }, 1500);
        } else {
          showToast("Failed to create agent.", "error");
        }
      } else {
        const res = await apiFetch<{ status: string; agent: Agent }>(
          `/dashboard/agents/${agent.id}`, "PUT", buildPayload(), token
        );
        if (res?.agent) {
          setAgent(res.agent);
          hydrateForm(res.agent);
          showToast("Voice Agent settings updated successfully!", "success");
          // Redirect to agent overview after a small delay
          setTimeout(() => {
            router.push("/dashboard/agents");
          }, 1500);
        } else {
          setHasChanges(false);
          showToast("Agent saved!", "success");
        }
      }
    } catch (err) {
      showToast((err as Error)?.message || "Failed to save agent.", "error");
    } finally {
      setSaving(false);
    }
  };

  const getSubcategoryIcon = (sub: string) => {
    if (sub === "Marketing Campaign") return <Megaphone className="w-5 h-5" />;
    if (sub === "Project Overview") return <FileText className="w-5 h-5" />;
    if (sub === "Gold Loan") return <Coins className="w-5 h-5" />;
    if (sub === "Credit Card") return <CreditCard className="w-5 h-5" />;
    if (sub === "Booking Agent") return <Sparkles className="w-5 h-5" />;
    return <HelpCircle className="w-5 h-5" />; // Inquiry Support
  };

  if (!hasHydrated || !token) return null;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mr-3 text-slate-900" /> Loading voice agent profile...
      </div>
    );
  }

  if (!agent) return null;

  const slug = agentSlug(agent.id);

  return (
    <div className="space-y-6 w-full pb-12 animate-fade-in text-left">
      
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] flex items-center space-x-2.5 px-5 py-3 rounded-xl shadow-xl text-xs font-bold text-white transition-all ${
          toast.type === "success" ? "bg-slate-900 border border-slate-800" : "bg-red-650 border border-red-500"
        }`}>
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 text-white ${
            toast.type === "success" ? "bg-emerald-500" : "bg-red-450"
          }`}>
            {toast.type === "success" ? "✓" : "✕"}
          </span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200/50 flex-wrap gap-4 select-none">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push("/dashboard/agents")}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">{agentName || agent.name}</h2>
            <div className="flex items-center space-x-2 mt-0.5">
              <span className="text-[11px] text-slate-400 font-mono font-semibold">{slug}</span>
              <span className="text-[9px] font-black uppercase text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full tracking-wider">
                {agent.status || "ACTIVE"}
              </span>
            </div>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`h-10 px-6 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center space-x-2 cursor-pointer shadow-sm relative ${
              hasChanges
                ? "bg-slate-900 hover:bg-slate-950 shadow-md"
                : "bg-slate-350 cursor-not-allowed text-slate-500"
            }`}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saving ? "Saving..." : "Save Agent"}</span>
          </button>
        </div>
      </div>

      {/* Stepper Header (Charcoal Slate design instead of Blue) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs flex items-center justify-between select-none w-full">
        <div className="flex items-center space-x-8 w-full justify-around text-xs font-bold">
          
          <button 
            type="button"
            onClick={() => setActiveStep(1)}
            className={`flex items-center space-x-2 transition cursor-pointer ${
              activeStep === 1 ? "text-slate-900 font-extrabold" : "text-slate-400 hover:text-slate-650"
            }`}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition ${
              activeStep === 1 ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"
            }`}>1</span>
            <span>Identity & Category</span>
          </button>

          <ChevronRight className="w-4 h-4 text-slate-300" />

          <button 
            type="button"
            disabled={!category}
            onClick={() => setActiveStep(2)}
            className={`flex items-center space-x-2 transition ${
              !category ? "cursor-not-allowed text-slate-350" : activeStep === 2 ? "cursor-pointer text-slate-900 font-extrabold" : "cursor-pointer text-slate-400 hover:text-slate-650"
            }`}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition ${
              activeStep === 2 ? "bg-slate-900 text-white" : activeStep > 2 ? "bg-slate-100 text-slate-600" : "bg-slate-150 text-slate-400"
            }`}>2</span>
            <span>Choose Use Case</span>
          </button>

          <ChevronRight className="w-4 h-4 text-slate-300" />

          <button
            type="button"
            onClick={() => {
              if (category && subcategory) setActiveStep(3);
            }}
            disabled={!category || !subcategory}
            className={`flex items-center space-x-2 transition ${
              !subcategory ? "cursor-not-allowed text-slate-350" : activeStep === 3 ? "cursor-pointer text-slate-900 font-extrabold" : "cursor-pointer text-slate-400 hover:text-slate-650"
            }`}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition ${
              activeStep === 3 ? "bg-slate-900 text-white" : "bg-slate-150 text-slate-400"
            }`}>3</span>
            <span>Voice & Language</span>
          </button>

        </div>
      </div>

      {/* STEP 1: IDENTITY & VERTICAL */}
      {activeStep === 1 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-3xs space-y-6 animate-fade-in">
          
          <div className="border-b border-slate-100 pb-4 select-none">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <User className="w-4 h-4 text-slate-800" />
              <span>Step 1: Agent Identity & Vertical Sector</span>
            </h3>
            <p className="text-xs text-slate-450 mt-1 font-medium">Specify your agent&apos;s name and choose the main business category vertical.</p>
          </div>

          {/* Agent Name input */}
          <div className="space-y-2 max-w-lg">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Agent Name *</label>
            <input
              value={agentName}
              onChange={(e) => { setAgentName(e.target.value); markChanged(); }}
              className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-500/10 transition"
              placeholder="e.g. Sales Agent (Rhea)"
            />
          </div>

          {/* Category selection */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Select Business Category Vertical *</label>
            </div>

            {catalogLoading ? (
              <div className="flex items-center text-slate-400 text-xs py-6">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading categories...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {shownCategories.map((cat) => {
                  const catName = cat.name;
                  return (
                    <button
                      key={catName}
                      type="button"
                      onClick={() => selectCategory(catName)}
                      className={`p-5 rounded-2xl border text-left transition transform hover:-translate-y-0.5 cursor-pointer relative overflow-hidden group ${
                        category === catName
                          ? "border-slate-800 bg-slate-50 shadow-sm font-bold"
                          : "border-slate-200 bg-white hover:border-slate-350"
                      }`}
                    >
                      <div className="flex items-center space-x-3.5">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition shrink-0 ${
                          category === catName ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                        }`}>
                          {categoryIcon(catName)}
                        </div>
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-900">{catName}</h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">{CATEGORY_DESC[catName] || `${cat.subcategories.length} agents`}</p>
                        </div>
                      </div>
                      {category === catName && (
                        <div className="absolute top-0 right-0 w-1.5 h-full bg-slate-900" />
                      )}
                    </button>
                  );
                })}

                {customCategories.map((cat) => (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => selectCategory(cat.name)}
                    className={`p-5 rounded-2xl border text-left transition transform hover:-translate-y-0.5 cursor-pointer relative overflow-hidden group ${
                      category === cat.name
                        ? "border-indigo-700 bg-indigo-50/40 shadow-sm font-bold"
                        : "border-indigo-200 bg-white hover:border-indigo-350"
                    }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
                        category === cat.name ? "bg-indigo-700 text-white" : "bg-indigo-50 text-indigo-500 group-hover:bg-indigo-100"
                      }`}>
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900">{cat.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Custom vertical</p>
                        <p className="text-[9px] text-indigo-600 font-bold mt-1 uppercase tracking-wide">Your account only</p>
                      </div>
                    </div>
                    {category === cat.name && (
                      <div className="absolute top-0 right-0 w-1.5 h-full bg-indigo-700" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={() => setActiveStep(2)}
              className="h-10 px-6 bg-slate-900 hover:bg-slate-950 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
            >
              <span>Next: Choose Use Case</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

      {/* STEP 2: USE CASE SUBCATEGORY */}
      {activeStep === 2 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-3xs space-y-6 animate-fade-in">
          
          <div className="border-b border-slate-100 pb-4 select-none">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-slate-800" />
                  <span>Step 2: Choose Use Case Subcategory</span>
                </h3>
                <p className="text-xs text-slate-455 mt-1 font-medium">
                  Shared options appear for all users. Custom options you add are visible only in your account.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openAddModal("existing_category")}
                className="h-8 px-3 border border-dashed border-slate-300 hover:border-slate-500 hover:bg-slate-50 text-slate-600 text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Subcategory</span>
              </button>
            </div>
          </div>

          {/* Subcategory selection grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
            {currentSubcategories.map((sub) => (
              <button
                key={sub.name}
                type="button"
                onClick={() => { setSubcategory(sub.name); markChanged(); }}
                className={`p-5 rounded-2xl border text-left transition transform hover:-translate-y-0.5 cursor-pointer relative overflow-hidden group flex flex-col justify-between h-36 ${
                  subcategory === sub.name
                    ? sub.is_custom
                      ? "border-indigo-700 bg-indigo-50/40 shadow-sm font-bold"
                      : "border-slate-800 bg-slate-50 shadow-sm font-bold"
                    : "border-slate-200 bg-white hover:border-slate-350"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
                  subcategory === sub.name
                    ? sub.is_custom ? "bg-indigo-700 text-white" : "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                }`}>
                  {getSubcategoryIcon(sub.name)}
                </div>

                <div>
                  <h4 className="text-xs font-extrabold text-slate-900">{sub.name}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {sub.is_custom ? "Your account only" : "Shared · All users"}
                  </p>
                </div>
                {subcategory === sub.name && (
                  <div className={`absolute top-0 right-0 w-1.5 h-full ${sub.is_custom ? "bg-indigo-700" : "bg-slate-900"}`} />
                )}
              </button>
            ))}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-50">
            <button
              type="button"
              onClick={() => setActiveStep(1)}
              className="h-10 px-5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveStep(3)}
              className="h-10 px-6 bg-slate-900 hover:bg-slate-950 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
            >
              <span>Next: Voice & Language</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

      {/* STEP 3: VOICE & LANGUAGE */}
      {activeStep === 3 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-3xs space-y-6 animate-fade-in">
          
          <div className="border-b border-slate-100 pb-4 select-none">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Mic className="w-4 h-4 text-slate-800" />
              <span>Step 3: Voice Selection & Language</span>
            </h3>
            <p className="text-xs text-slate-455 mt-1 font-medium">Select a vocal signature gender and set the primary language.</p>
          </div>

          {/* Voice Gender Selection */}
          {(() => {
            const voiceIdLower = (voiceId || "").toLowerCase();
            const femaleIds = ["female", "aoede", "kore", "leda", "zephyr", "gemma", "katie", "raveena", "ananya", "priya", "kavita", "zara", "diya"];
            const maleIds = ["male", "charon", "fenrir", "puck", "achird", "archie", "corey", "arvind", "amit", "rohan", "rahul", "dev", "kabir"];
            const isFemaleSelected = femaleIds.includes(voiceIdLower);
            const isMaleSelected = maleIds.includes(voiceIdLower);
            
            const isInd = isIndianLanguage(lang);
            const femaleVoices = isInd ? FEMALE_VOICES_IN : FEMALE_VOICES_EN;
            const maleVoices = isInd ? MALE_VOICES_IN : MALE_VOICES_EN;
            
            return (
              <>
                <div className="space-y-3 pt-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Select Neural Voice Gender</label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { id: "female", name: "Female Voice", desc: isInd ? "Female neural voices (Raveena, Ananya, Priya...)" : "Female neural voices (Kore, Aoede, Leda...)" },
                      { id: "male", name: "Male Voice", desc: isInd ? "Male neural voices (Arvind, Amit, Rohan...)" : "Male neural voices (Charon, Fenrir, Puck...)" }
                    ].map((genderCard) => {
                      const isSelected = genderCard.id === "female" ? isFemaleSelected : isMaleSelected;
                      
                      return (
                        <div
                          key={genderCard.id}
                          onClick={() => {
                            if (genderCard.id === "female" && !isFemaleSelected) {
                              setVoiceId(isInd ? "Raveena" : "Kore");
                              markChanged();
                            } else if (genderCard.id === "male" && !isMaleSelected) {
                              setVoiceId(isInd ? "Arvind" : "Charon");
                              markChanged();
                            }
                          }}
                          className={`p-4 border rounded-2xl cursor-pointer transition flex items-center justify-between relative group ${
                            isSelected ? "border-slate-800 bg-slate-50 shadow-sm font-bold" : "border-slate-200 hover:border-slate-350 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition border ${
                              isSelected ? "bg-slate-900 text-white border-slate-900" : "bg-slate-50 text-slate-500 border-slate-200"
                            }`}>
                              <Mic className="w-4 h-4" />
                            </div>

                            <div>
                              <p className="text-xs font-bold text-slate-900">{genderCard.name}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{genderCard.desc}</p>
                            </div>
                          </div>

                          {isSelected && <Check className="w-4 h-4 text-slate-800 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Specific Neural Voice Signature List */}
                {isFemaleSelected && (
                  <div className="space-y-3 pt-3 select-none animate-fade-in">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                      Select Specific Female Voice Signature
                    </label>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {femaleVoices.map((v) => {
                        const isSelected = voiceIdLower === v.id.toLowerCase();
                                                const isPlaying = typeof playingId !== "undefined" && playingId === v.id;
                        return (
                          <div
                            key={v.id}
                            onClick={() => { setVoiceId(v.id); markChanged(); }}
                            className={`p-4 border rounded-2xl cursor-pointer transition flex flex-col justify-between h-28 relative group ${
                              isSelected ? "border-slate-800 bg-slate-50 shadow-3xs font-bold" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-xs font-extrabold text-slate-900">{v.name}</p>
                                <p className="text-[9px] text-slate-400 font-semibold leading-relaxed mt-0.5">{v.desc}</p>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => handlePlayVoice(v.id, getVoiceSampleUrl(v.id, lang), e)}
                                className={`p-1.5 rounded-lg border flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                                  isPlaying ? "bg-red-50 border-red-200 text-red-650 hover:bg-red-100" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                }`}
                              >
                                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                              </button>
                            </div>

                            <div className="flex justify-between items-center mt-3">
                              <span className="text-[9px] font-extrabold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                Neural Voice
                              </span>
                              {isSelected && (
                                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">
                                  ✓
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {isMaleSelected && (
                  <div className="space-y-3 pt-3 select-none animate-fade-in">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                      Select Specific Male Voice Signature
                    </label>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {maleVoices.map((v) => {
                        const isSelected = voiceIdLower === v.id.toLowerCase();
                                                const isPlaying = typeof playingId !== "undefined" && playingId === v.id;
                        return (
                          <div
                            key={v.id}
                            onClick={() => { setVoiceId(v.id); markChanged(); }}
                            className={`p-4 border rounded-2xl cursor-pointer transition flex flex-col justify-between h-28 relative group ${
                              isSelected ? "border-slate-800 bg-slate-50 shadow-3xs font-bold" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-xs font-extrabold text-slate-900">{v.name}</p>
                                <p className="text-[9px] text-slate-400 font-semibold leading-relaxed mt-0.5">{v.desc}</p>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => handlePlayVoice(v.id, getVoiceSampleUrl(v.id, lang), e)}
                                className={`p-1.5 rounded-lg border flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                                  isPlaying ? "bg-red-50 border-red-200 text-red-650 hover:bg-red-100" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                }`}
                              >
                                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                              </button>
                            </div>

                            <div className="flex justify-between items-center mt-3">
                              <span className="text-[9px] font-extrabold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                Neural Voice
                              </span>
                              {isSelected && (
                                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">
                                  ✓
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            );
          })()}


          {/* Language dropdown */}
          <div className="space-y-1.5 max-w-sm pt-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Language</label>
            <div className="relative">
              <select
                value={lang}
                onChange={(e) => handleLangChange(e.target.value)}
                className="w-full h-11 pl-4 pr-10 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-slate-500 transition cursor-pointer appearance-none"
              >
                {["ENGLISH (US)", "HINDI", "BENGALI", "GUJARATI", "KANNADA", "MALAYALAM", "MARATHI", "PUNJABI", "TAMIL", "TELUGU"].map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-450">
                <Globe className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-50">
            <button
              type="button"
              onClick={() => setActiveStep(2)}
              className="h-10 px-5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            
            <button
              onClick={handleSave}
              disabled={saving}
              className={`h-10 px-8 text-white text-xs font-bold rounded-xl transition flex items-center space-x-2 cursor-pointer shadow-md hover:shadow-lg ${
                hasChanges
                  ? "bg-slate-900 hover:bg-slate-950"
                  : "bg-slate-400 cursor-not-allowed text-slate-500"
              }`}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{saving ? "Saving..." : "Save Agent"}</span>
            </button>
          </div>

        </div>
      )}

      {/* Add Category / Subcategory Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-5 animate-fade-in">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  {addMode === "new_category" ? "Add New Category" : "Add Subcategory"}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Custom entries are saved to your account only and appear in your AI agent setup.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setAddMode("existing_category");
                  setAddCategory(category);
                }}
                className={`flex-1 h-9 rounded-lg text-[10px] font-bold border transition ${
                  addMode === "existing_category"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                Existing Category
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddMode("new_category");
                  setAddCategory("");
                }}
                className={`flex-1 h-9 rounded-lg text-[10px] font-bold border transition ${
                  addMode === "new_category"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                New Category
              </button>
            </div>

            {addMode === "existing_category" ? (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Category</label>
                <select
                  value={addCategory}
                  onChange={(e) => setAddCategory(e.target.value)}
                  className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-slate-500"
                >
                  <option value="">Select category</option>
                  {globalCategories.map((c) => (
                    <option key={c.name} value={c.name}>{c.name} (shared)</option>
                  ))}
                  {customCategories.map((c) => (
                    <option key={c.name} value={c.name}>{c.name} (your account)</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">New Category Name</label>
                <input
                  value={addCategory}
                  onChange={(e) => setAddCategory(e.target.value)}
                  className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:border-slate-500"
                  placeholder="e.g. Real Estate, Education"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Subcategory Name</label>
              <input
                value={addSubcategory}
                onChange={(e) => setAddSubcategory(e.target.value)}
                className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:border-slate-500"
                placeholder="e.g. Lead Qualification, Appointment Booking"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="h-10 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCatalogOption}
                disabled={addSaving || !addCategory.trim() || !addSubcategory.trim()}
                className="h-10 px-5 bg-slate-900 hover:bg-slate-950 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2"
              >
                {addSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{addSaving ? "Submitting..." : "Submit Request"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
