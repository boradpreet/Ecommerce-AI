"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Plus, Search, Loader2, X, Check, ArrowLeft, ArrowRight,
  UploadCloud, FileText, Square, Settings,
  Clock, BadgeInfo, Play, Trash2,
  Phone, Copy, Edit3, Sparkles, MessageSquare, Mic, Volume2, ShieldCheck,
  Building, Globe, FileSignature, CheckCircle,
  ChevronDown, ChevronUp
} from "lucide-react";
import { apiFetch, apiUpload } from "src/lib/api";
import { ConfirmModal } from "src/components/dashboard/confirm-modal";
import { TalkToAgentModal } from "src/components/dashboard/talk-to-agent-modal";

interface Agent {
  id: number;
  name: string;
  voice_provider: string;
  voice_id: string;
  prompt_system: string;
  temperature: number;
  created_at: string;
  status: string;
  lang?: string;
  last_active?: string;
  performance_score?: number;
  performance_grade?: string;
  hubspot_connected?: boolean;
  calendly_connected?: boolean;
  first_message?: string;
  llm_provider?: string;
  llm_model?: string;
  transcriber?: string;
  kb_id?: number | null;
  capabilities?: string;
  wait_seconds?: number;
  smart_endpointing?: string;
  silence_timeout?: number;
  max_duration_seconds?: number;
  stop_words?: number;
  voice_seconds?: number;
  backoff_seconds?: number;
  idle_messages?: string;
  background_sound_enabled?: boolean;
  forwarding_country_code?: string;
  forwarding_phone_number?: string;
  analysis_summary_prompt?: string;
  analysis_summary_timeout?: number;
  analysis_summary_trigger_messages?: number;
  analysis_structured_prompt?: string;
  analysis_structured_timeout?: number;
}

interface KnowledgeBase {
  id: number;
  name: string;
  description: string;
  created_at: string;
  documents: {
    id: number;
    file_name: string;
    content_text?: string;
    index_status?: string;
    chunk_count?: number;
    char_count?: number;
    index_error?: string | null;
    created_at: string;
  }[];
}

interface AgentsTabProps {
  token: string;
}

export const AgentsTab: React.FC<AgentsTabProps> = ({ token }) => {
  // Navigation: "list" | "edit"
  const [activeView, setActiveView] = useState<"list" | "edit">("list");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [talkAgent, setTalkAgent] = useState<Agent | null>(null);

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

  // Search in List View
  const [searchQuery, setSearchQuery] = useState("");
  
  // Selected agent for edit view
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [newlyCreatedAgentId, setNewlyCreatedAgentId] = useState<number | null>(null);
  const [hasPublished, setHasPublished] = useState<boolean>(false);
  
  // Left sidebar active tab in edit view
  const [activeSettingsTab, setActiveSettingsTab] = useState<string>("prompt");

  // Prompt Settings states
  const [firstMessage, setFirstMessage] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [agentNameInput, setAgentNameInput] = useState("");
  const [capabilitiesInput, setCapabilitiesInput] = useState("");

  // Ask AI to Refine prompt
  const [aiRefineQuery, setAiRefineQuery] = useState("");
  const [refiningPrompt, setRefiningPrompt] = useState(false);

  // Voice Tab search/filters
  const [voiceProviderFilter, setVoiceProviderFilter] = useState<string>("ALL");
  const [voiceGenderFilter, setVoiceGenderFilter] = useState<string>("ALL");
  const [voiceSearchQuery, setVoiceSearchQuery] = useState("");
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Model & Transcriber States
  const [showLlmModal, setShowLlmModal] = useState(false);
  const [selectedLlmProvider, setSelectedLlmProvider] = useState("Groq");
  const [selectedLlmModel, setSelectedLlmModel] = useState("openai/gpt-oss-120b");
  const [selectedTranscriber, setSelectedTranscriber] = useState("Deepgram/Flux General Multi/English");

  // Knowledge Base States
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loadingKbs, setLoadingKbs] = useState(false);
  const [showKbCreator, setShowKbCreator] = useState(false);
  
  // Knowledge Base Form States
  const [newKbName, setNewKbName] = useState("");
  const [newKbDescription, setNewKbDescription] = useState("");
  const [kbUploadProgress, setKbUploadProgress] = useState(0);
  const [kbUploadingFile, setKbUploadingFile] = useState<string | null>(null);
  const [kbSelectedFile, setKbSelectedFile] = useState<File | null>(null);
  const [kbIndexing, setKbIndexing] = useState(false);

  // Business Onboarding Profile States (15-step)
  const [businessName, setBusinessName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [industry, setIndustry] = useState("");
  const [taxId, setTaxId] = useState("");
  const [businessType, setBusinessType] = useState("Select Type");
  const [companySize, setCompanySize] = useState("1-10 Employees");
  const [streetAddress, setStreetAddress] = useState("");
  const [country, setCountry] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [complianceHipaa, setComplianceHipaa] = useState(false);
  const [savingBusinessDetails, setSavingBusinessDetails] = useState(false);

  // Call Settings States
  const [waitSeconds, setWaitSeconds] = useState(2.1);
  const [smartEndpointing, setSmartEndpointing] = useState("LiveKit");
  const [silenceTimeout, setSilenceTimeout] = useState(30);
  const [maxDurationSeconds, setMaxDurationSeconds] = useState(300);
  const [stopWords, setStopWords] = useState(5);
  const [voiceSeconds, setVoiceSeconds] = useState(0.3);
  const [backoffSeconds, setBackoffSeconds] = useState(4.0);
  const [idleMessages, setIdleMessages] = useState<string[]>(["Are you there?", "Can you hear me?", "Should I continue?"]);
  const [backgroundSoundEnabled, setBackgroundSoundEnabled] = useState(false);
  const [forwardingCountryCode, setForwardingCountryCode] = useState("+1");
  const [forwardingPhoneNumber, setForwardingPhoneNumber] = useState("");
  const [savingCallSettings, setSavingCallSettings] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>("startSpeaking");

  // Analysis Tab States
  const [analysisSummaryPrompt, setAnalysisSummaryPrompt] = useState("");
  const [analysisSummaryTimeout, setAnalysisSummaryTimeout] = useState(30);
  const [analysisSummaryTriggerMessages, setAnalysisSummaryTriggerMessages] = useState(3);
  const [analysisStructuredPrompt, setAnalysisStructuredPrompt] = useState("");
  const [analysisStructuredTimeout, setAnalysisStructuredTimeout] = useState(30);
  const [savingAnalysisSettings, setSavingAnalysisSettings] = useState(false);

  // Actions dropdown states
  const [activeActionsMenuId, setActiveActionsMenuId] = useState<number | null>(null);

  // General submitting / toast states
  const [savingAgent, setSavingAgent] = useState(false);
  const [successToast, setSuccessToast] = useState("");
  const [errorToast, setErrorToast] = useState("");

  const triggerSuccess = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(""), 3000);
  };

  const triggerError = (msg: string) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(""), 3000);
  };

  // Show the backend's message for client errors (e.g. 409 duplicate name); generic fallback otherwise.
  const errMessage = (err: unknown, fallback: string) => {
    const e = err as { status?: number; message?: string };
    if (e?.status && e.status >= 400 && e.status < 500 && e.message) return e.message;
    return fallback;
  };

  // Seed default visual capabilities on list load
  const seedCapabilities = (agentName: string) => {
    const lower = agentName.toLowerCase();
    if (lower.includes("hr") || lower.includes("screen") || lower.includes("recruit")) {
      return "Recruitment / Applicant Screening";
    }
    if (lower.includes("hospitality") || lower.includes("reservation") || lower.includes("booking")) {
      return "Hospitality / Spa Reservations";
    }
    if (lower.includes("health") || lower.includes("feedback") || lower.includes("visit")) {
      return "Healthcare / Post-visit Feedback";
    }
    return "Customer Support / General FAQ";
  };

  // Fetch agents from database
  const fetchAgents = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<any>("/dashboard/agents", "GET", undefined, token);
      if (Array.isArray(data)) {
        // Hydrate default values if missing
        const hydrated = data.map((ag) => ({
          ...ag,
          capabilities: ag.capabilities || seedCapabilities(ag.name),
          first_message: ag.first_message || "Hi, this is Rhea from NovaEdge Global. Thanks for calling in to apply for the Sales Lead.",
          llm_provider: ag.llm_provider || "Groq",
          llm_model: ag.llm_model || "openai/gpt-oss-120b",
          transcriber: ag.transcriber || "Deepgram/Flux General Multi/English"
        }));
        setAgents(hydrated);
      }
    } catch (err) {
      console.error(err);
      triggerError("Failed to fetch calling agents.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Knowledge Bases
  const fetchKnowledgeBases = async () => {
    setLoadingKbs(true);
    try {
      const res = await apiFetch<any>("/dashboard/knowledge-bases", "GET", undefined, token);
      if (Array.isArray(res)) {
        setKnowledgeBases(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingKbs(false);
    }
  };

  // Fetch Business Profile Details
  const fetchBusinessDetails = async () => {
    try {
      // Also get organization name from general settings
      const settingsRes = await apiFetch<any>("/dashboard/organization/settings", "GET", undefined, token);
      if (settingsRes) {
        setBusinessName(settingsRes.name || "");
      }
      
      const res = await apiFetch<any>("/dashboard/organization/business-details", "GET", undefined, token);
      if (res) {
        setWebsiteUrl(res.website_url || "");
        setIndustry(res.industry || "");
        setTaxId(res.tax_id || "");
        setBusinessType(res.business_type || "Select Type");
        setCompanySize(res.company_size || "1-10 Employees");
        setStreetAddress(res.street_address || "");
        setCountry(res.country || "");
        setStateProvince(res.state_province || "");
        setComplianceHipaa(!!res.compliance_hipaa);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAgents();
      fetchKnowledgeBases();
      fetchBusinessDetails();
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [token]);

  // Navigate to edit view and initialize editor inputs
  const handleStartEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setAgentNameInput(agent.name);
    setFirstMessage(agent.first_message || "Hi, this is Rhea. How can I help you?");
    setSystemPrompt(agent.prompt_system || "You are Rhea, a senior assistant.");
    setSelectedLlmProvider(agent.llm_provider || "Groq");
    setSelectedLlmModel(agent.llm_model || "openai/gpt-oss-120b");
    setSelectedTranscriber(agent.transcriber || "Deepgram/Flux General Multi/English");
    setCapabilitiesInput(agent.capabilities || "Customer Support / General FAQ");

    // Hydrate call settings fields
    setWaitSeconds(agent.wait_seconds !== undefined ? agent.wait_seconds : 2.1);
    setSmartEndpointing(agent.smart_endpointing || "LiveKit");
    setSilenceTimeout(agent.silence_timeout !== undefined ? agent.silence_timeout : 30);
    setMaxDurationSeconds(agent.max_duration_seconds !== undefined ? agent.max_duration_seconds : 300);
    setStopWords(agent.stop_words !== undefined ? agent.stop_words : 5);
    setVoiceSeconds(agent.voice_seconds !== undefined ? agent.voice_seconds : 0.3);
    setBackoffSeconds(agent.backoff_seconds !== undefined ? agent.backoff_seconds : 4.0);
    
    let parsedIdle = ["Are you there?", "Can you hear me?", "Should I continue?"];
    if (agent.idle_messages) {
      try {
        const parsed = JSON.parse(agent.idle_messages);
        if (Array.isArray(parsed)) {
          parsedIdle = parsed;
        }
      } catch (e) {
        console.error("Failed to parse idle_messages", e);
      }
    }
    setIdleMessages(parsedIdle);
    setBackgroundSoundEnabled(!!agent.background_sound_enabled);
    setForwardingCountryCode(agent.forwarding_country_code || "+1");
    setForwardingPhoneNumber(agent.forwarding_phone_number || "");

    // Hydrate analysis fields
    setAnalysisSummaryPrompt(agent.analysis_summary_prompt !== undefined ? agent.analysis_summary_prompt : "You are an expert call summarizer for an event invitation campaign.\nYou will be given the transcript of a call.\nCreate a summary and structured details based ONLY on the customer's responses.\nIgnore anything said by the assistant/agent unless the customer repeats, confirms, or explicitly reacts to it.\n\n### Summary\nDo exactly 2 lines (2 sentences)");
    setAnalysisSummaryTimeout(agent.analysis_summary_timeout !== undefined ? agent.analysis_summary_timeout : 30);
    setAnalysisSummaryTriggerMessages(agent.analysis_summary_trigger_messages !== undefined ? agent.analysis_summary_trigger_messages : 3);
    setAnalysisStructuredPrompt(agent.analysis_structured_prompt !== undefined ? agent.analysis_structured_prompt : "Prompt for extracting structured data");
    setAnalysisStructuredTimeout(agent.analysis_structured_timeout !== undefined ? agent.analysis_structured_timeout : 30);

    setActiveSettingsTab("prompt");
    setActiveView("edit");
  };

  // Trigger Save Updates to agent via PUT `/dashboard/agents/{id}`
  const handleSaveAgentSettings = async () => {
    if (!editingAgent) return;
    setSavingAgent(true);

    const payload = {
      name: agentNameInput,
      first_message: firstMessage,
      prompt_system: systemPrompt,
      llm_provider: selectedLlmProvider,
      llm_model: selectedLlmModel,
      transcriber: selectedTranscriber,
      capabilities: capabilitiesInput,
      kb_id: editingAgent.kb_id
    };

    try {
      const res = await apiFetch<any>(`/dashboard/agents/${editingAgent.id}`, "PUT", payload, token);
      if (res && res.status === "success") {
        triggerSuccess(`Agent settings saved successfully!`);
        setHasPublished(true);
        
        // Update local agent representation
        const updatedAgent = { ...editingAgent, ...payload };
        setEditingAgent(updatedAgent);
        
        await fetchAgents();
      } else {
        triggerError("Failed to deploy changes.");
      }
    } catch (err) {
      console.error(err);
      triggerError(errMessage(err, "Network failure committing changes to SQLite."));
    } finally {
      setSavingAgent(false);
    }
  };

  // Trigger Save Updates to agent's Call Settings via PUT `/dashboard/agents/{id}`
  const handleSaveCallSettings = async () => {
    if (!editingAgent) return;
    setSavingCallSettings(true);

    const payload = {
      wait_seconds: waitSeconds,
      smart_endpointing: smartEndpointing,
      silence_timeout: silenceTimeout,
      max_duration_seconds: maxDurationSeconds,
      stop_words: stopWords,
      voice_seconds: voiceSeconds,
      backoff_seconds: backoffSeconds,
      idle_messages: JSON.stringify(idleMessages),
      background_sound_enabled: backgroundSoundEnabled,
      forwarding_country_code: forwardingCountryCode,
      forwarding_phone_number: forwardingPhoneNumber
    };

    try {
      const res = await apiFetch<any>(`/dashboard/agents/${editingAgent.id}`, "PUT", payload, token);
      if (res && res.status === "success") {
        triggerSuccess(`Call settings saved successfully!`);
        
        // Update local agent representation
        const updatedAgent = { ...editingAgent, ...res.agent };
        setEditingAgent(updatedAgent);
        
        await fetchAgents();
      } else {
        triggerError("Failed to save call settings.");
      }
    } catch (err) {
      console.error(err);
      triggerError("Network failure committing call settings to SQLite.");
    } finally {
      setSavingCallSettings(false);
    }
  };

  // Trigger Save Updates to agent's Analysis Settings via PUT `/dashboard/agents/{id}`
  const handleSaveAnalysisSettings = async () => {
    if (!editingAgent) return;
    setSavingAnalysisSettings(true);

    const payload = {
      analysis_summary_prompt: analysisSummaryPrompt,
      analysis_summary_timeout: analysisSummaryTimeout,
      analysis_summary_trigger_messages: analysisSummaryTriggerMessages,
      analysis_structured_prompt: analysisStructuredPrompt,
      analysis_structured_timeout: analysisStructuredTimeout
    };

    try {
      const res = await apiFetch<any>(`/dashboard/agents/${editingAgent.id}`, "PUT", payload, token);
      if (res && res.status === "success") {
        triggerSuccess(`Analysis settings saved successfully!`);
        
        // Update local agent representation
        const updatedAgent = { ...editingAgent, ...res.agent };
        setEditingAgent(updatedAgent);
        
        await fetchAgents();
      } else {
        triggerError("Failed to save analysis settings.");
      }
    } catch (err) {
      console.error(err);
      triggerError("Network failure committing analysis settings to SQLite.");
    } finally {
      setSavingAnalysisSettings(false);
    }
  };

  // Duplicate an Agent in SQLite DB
  const handleDuplicateAgent = async (agent: Agent) => {
    try {
      // Ensure the copy's name is unique so it doesn't collide with an existing agent.
      const existing = new Set(agents.map((a) => (a.name || "").trim().toLowerCase()));
      let dupName = `${agent.name} (Copy)`;
      let n = 2;
      while (existing.has(dupName.toLowerCase())) { dupName = `${agent.name} (Copy ${n})`; n++; }
      const payload = {
        name: dupName,
        voice_id: agent.voice_id,
        voice_provider: agent.voice_provider,
        prompt_system: agent.prompt_system,
        temperature: agent.temperature,
        lang: agent.lang,
        first_message: agent.first_message,
        llm_provider: agent.llm_provider,
        llm_model: agent.llm_model,
        transcriber: agent.transcriber,
        kb_id: agent.kb_id,
        capabilities: agent.capabilities
      };

      const res = await apiFetch<any>("/dashboard/agents", "POST", payload, token);
      if (res && res.status === "success") {
        triggerSuccess(`Duplicated agent: "${agent.name}"`);
        await fetchAgents();
      }
    } catch (err) {
      console.error(err);
      triggerError(errMessage(err, "Failed to duplicate agent."));
    }
  };

  // Archive (Delete) an Agent
  const handleArchiveAgent = async (agentId: number) => {
    setConfirmModal({
      isOpen: true,
      title: "Archive AI Agent",
      message: "Are you sure you want to archive this calling agent? This removes it from the SQL database.",
      onConfirm: async () => {
        try {
          const res = await apiFetch<any>(`/dashboard/agents/${agentId}`, "DELETE", undefined, token);
          if (res) {
            triggerSuccess("Agent archived successfully.");
            await fetchAgents();
          }
        } catch (err) {
          console.error(err);
          triggerError("Failed to archive agent.");
        }
      }
    });
  };

  // Create a Blank Agent (Start from Scratch)
  const handleCreateBlankAgent = async () => {
    try {
      // Generate a unique default name so two blank agents never collide.
      const base = "New Voice Agent";
      const existing = new Set(agents.map((a) => (a.name || "").trim().toLowerCase()));
      let name = base;
      let n = 2;
      while (existing.has(name.toLowerCase())) { name = `${base} ${n}`; n++; }
      const payload = {
        name,
        voice_id: "female",
        voice_provider: "gemini",
        prompt_system: "# IDENTITY\nYou are a professional voice representative.",
        temperature: 0.7,
        lang: "ENGLISH (US)",
        first_message: "Hello! This is a blank voice agent. How can I help you?",
        llm_provider: "Groq",
        llm_model: "openai/gpt-oss-120b",
        transcriber: "Deepgram/Flux General Multi/English",
        capabilities: "Customer Support / General FAQ"
      };

      const res = await apiFetch<any>("/dashboard/agents", "POST", payload, token);
      if (res && res.status === "success") {
        triggerSuccess("Blank agent created successfully!");
        setNewlyCreatedAgentId(res.agent.id);
        setHasPublished(false);
        await fetchAgents();
        // Redirect directly to editing it!
        handleStartEdit(res.agent);
      }
    } catch (err) {
      console.error(err);
      triggerError(errMessage(err, "Failed to create blank agent."));
    }
  };

  const handleBackClick = async () => {
    if (newlyCreatedAgentId && !hasPublished) {
      try {
        await apiFetch(`/dashboard/agents/${newlyCreatedAgentId}`, "DELETE", undefined, token);
        await fetchAgents();
        triggerSuccess("Draft agent discarded.");
      } catch (err) {
        console.error("Failed to discard draft agent", err);
      }
    }
    setActiveView("list");
    setEditingAgent(null);
    setNewlyCreatedAgentId(null);
    setHasPublished(false);
  };

  // Save 15-Step Business details
  const handleSaveBusinessDetails = async () => {
    setSavingBusinessDetails(true);
    try {
      // 1. Save general org name
      await apiFetch<any>("/dashboard/organization/settings", "PUT", {
        name: businessName,
        timezone: "Coordinated Universal Time (UTC)",
        log_retention_days: 90
      }, token);

      // 2. Save business onboarding profile
      const payload = {
        website_url: websiteUrl,
        industry: industry,
        tax_id: taxId,
        business_type: businessType,
        company_size: companySize,
        street_address: streetAddress,
        country: country,
        state_province: stateProvince,
        compliance_hipaa: complianceHipaa
      };

      const res = await apiFetch<any>("/dashboard/organization/business-details", "PUT", payload, token);
      if (res && res.status === "success") {
        triggerSuccess("Business details and profile saved in SQLite!");
        await fetchBusinessDetails();
      } else {
        triggerError("Failed to commit company profile.");
      }
    } catch (err) {
      console.error(err);
      triggerError("Failed to save profile details.");
    } finally {
      setSavingBusinessDetails(false);
    }
  };

  // AI Prompt Refinement Simulator (Image 2 right card action)
  const handleRefinePromptWithAI = async () => {
    if (!aiRefineQuery.trim()) return;
    setRefiningPrompt(true);

    try {
      // Call standard extractor but tweak prompt specifically for refinement
      const payload = {
        message: `Tweak prompt: ${aiRefineQuery}`,
        history: [{ role: "system", content: systemPrompt }]
      };
      
      const res = await apiFetch<any>("/dashboard/ai-builder/chat", "POST", payload, token);
      if (res && res.status === "success" && res.extracted_agent) {
        setSystemPrompt(res.extracted_agent.system_prompt);
        if (res.extracted_agent.first_message) {
          setFirstMessage(res.extracted_agent.first_message);
        }
        triggerSuccess("Prompt refined successfully via AI Architect!");
        setAiRefineQuery("");
      } else {
        // Simulated local fallback refinement if backend is busy
        setTimeout(() => {
          setSystemPrompt(prev => `${prev}\n\n# AI REFINEMENT REQUEST\n- Refined for: ${aiRefineQuery}\n- Tone adjustment: Calm and highly authoritative.`);
          triggerSuccess("Prompt refined locally with authority rules!");
          setAiRefineQuery("");
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      triggerError("AI refinement timed out.");
    } finally {
      setRefiningPrompt(false);
    }
  };

  // Voice Library selection support
  const voiceLibrarySeeds = [
    { id: "female", name: "Female Voice", provider: "GEMINI", language: "Indian English / Hindi", flag: "🇮🇳", gender: "Female", sample_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
    { id: "male", name: "Male Voice", provider: "GEMINI", language: "English (Standard)", flag: "🇮🇳", gender: "Male", sample_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" }
  ];

  const handlePlayVoicePreview = (voiceId: string, sampleUrl: string) => {
    if (playingVoiceId === voiceId) {
      if (audioRef.current) audioRef.current.pause();
      setPlayingVoiceId(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();

    setPlayingVoiceId(voiceId);
    const audio = new Audio(sampleUrl);
    audioRef.current = audio;
    audio.play().catch(() => setPlayingVoiceId(null));
    audio.onended = () => setPlayingVoiceId(null);
  };

  const handleSelectAgentVoice = async (voiceName: string) => {
    if (!editingAgent) return;
    try {
      const payload = { ...editingAgent, voice_id: voiceName };
      const res = await apiFetch<any>(`/dashboard/agents/${editingAgent.id}`, "PUT", payload, token);
      if (res && res.status === "success") {
        setEditingAgent(res.agent);
        triggerSuccess(`Switched agent voice to ${voiceName}!`);
        await fetchAgents();
      }
    } catch (err) {
      console.error(err);
      triggerError("Failed to update voice choice.");
    }
  };

  // LLM Configurations Popup Save
  const handleSaveLlmConfiguration = async () => {
    if (!editingAgent) return;
    setSelectedLlmProvider(selectedLlmProvider);
    setSelectedLlmModel(selectedLlmModel);
    setShowLlmModal(false);
    
    // Auto PUT update to SQLite immediately
    try {
      const payload = {
        ...editingAgent,
        llm_provider: selectedLlmProvider,
        llm_model: selectedLlmModel
      };
      const res = await apiFetch<any>(`/dashboard/agents/${editingAgent.id}`, "PUT", payload, token);
      if (res && res.status === "success") {
        setEditingAgent(res.agent);
        triggerSuccess("LLM configuration applied successfully!");
        await fetchAgents();
      }
    } catch (err) {
      console.error(err);
      triggerError("Failed to persist model choices.");
    }
  };

  const handleChooseKbFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      triggerError("File size exceeds the 10MB limit!");
      return;
    }

    setKbSelectedFile(file);
    setKbUploadingFile(file.name);
    setKbUploadProgress(100);
  };

  const uploadFileToKb = async (kbId: number, file: File) => {
    setKbIndexing(true);
    setKbUploadProgress(30);
    try {
      const res = await apiUpload<any>(
        `/dashboard/knowledge-bases/${kbId}/documents/upload`,
        file,
        token
      );
      setKbUploadProgress(100);
      if (res?.index_result?.status === "ready") {
        triggerSuccess(`"${file.name}" indexed with ${res.index_result.chunk_count || 0} vector chunks.`);
      } else if (res?.index_result?.status === "failed") {
        triggerError(`Upload saved but indexing failed: ${res.index_result.message || "unknown error"}`);
      } else {
        triggerSuccess(`"${file.name}" uploaded successfully.`);
      }
      await fetchKnowledgeBases();
      return res;
    } finally {
      setKbIndexing(false);
    }
  };

  const handleReindexDocument = async (kbId: number, docId: number) => {
    try {
      setKbIndexing(true);
      await apiFetch(`/dashboard/knowledge-bases/${kbId}/documents/${docId}/reindex`, "POST", {}, token);
      triggerSuccess("Document re-indexed successfully.");
      await fetchKnowledgeBases();
    } catch (err) {
      console.error(err);
      triggerError("Failed to re-index document.");
    } finally {
      setKbIndexing(false);
    }
  };

  const handleCreateKnowledgeBase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKbName.trim()) return;

    try {
      const kbPayload = {
        name: newKbName,
        description: newKbDescription
      };

      const kbRes = await apiFetch<any>("/dashboard/knowledge-bases", "POST", kbPayload, token);
      if (kbRes && kbRes.status === "success" && kbRes.id) {
        if (kbSelectedFile) {
          await uploadFileToKb(kbRes.id, kbSelectedFile);
        }

        triggerSuccess(`Knowledge Base "${newKbName}" created successfully!`);

        if (editingAgent) {
          const agentPayload = { ...editingAgent, kb_id: kbRes.id };
          const agentRes = await apiFetch<any>(`/dashboard/agents/${editingAgent.id}`, "PUT", agentPayload, token);
          if (agentRes && agentRes.status === "success") {
            setEditingAgent(agentRes.agent);
          }
        }

        setNewKbName("");
        setNewKbDescription("");
        setKbUploadingFile(null);
        setKbSelectedFile(null);
        setKbUploadProgress(0);
        setShowKbCreator(false);

        await fetchKnowledgeBases();
        await fetchAgents();
      }
    } catch (err) {
      console.error(err);
      triggerError("Failed to compile knowledge base.");
    }
  };

  // Associate existing knowledge base to current agent
  const handleAssociateKb = async (kbId: number) => {
    if (!editingAgent) return;
    try {
      const payload = { ...editingAgent, kb_id: kbId };
      const res = await apiFetch<any>(`/dashboard/agents/${editingAgent.id}`, "PUT", payload, token);
      if (res && res.status === "success") {
        setEditingAgent(res.agent);
        triggerSuccess("Knowledge Base linked successfully.");
        await fetchAgents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // De-associate knowledge base
  const handleDeassociateKb = async () => {
    if (!editingAgent) return;
    try {
      const payload = { ...editingAgent, kb_id: 0 }; // Signals null in backend update router
      const res = await apiFetch<any>(`/dashboard/agents/${editingAgent.id}`, "PUT", payload, token);
      if (res && res.status === "success") {
        setEditingAgent(res.agent);
        triggerSuccess("Knowledge base unlinked from agent.");
        await fetchAgents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter Voice seeds
  const filteredVoiceSeeds = voiceLibrarySeeds.filter((v) => {
    if (voiceProviderFilter !== "ALL" && v.provider !== voiceProviderFilter) return false;
    if (voiceGenderFilter !== "ALL" && v.gender.toUpperCase() !== voiceGenderFilter) return false;
    if (voiceSearchQuery.trim() !== "") {
      return v.name.toLowerCase().includes(voiceSearchQuery.toLowerCase());
    }
    return true;
  });

  const filteredAgents = agents.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.capabilities && a.capabilities.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in text-left">
      
      {/* Toast Notifier Panels */}
      {successToast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 border border-slate-800 text-white px-5 py-3 rounded-xl shadow-xl flex items-center space-x-2.5 text-xs font-bold font-sans">
          <span className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white">✓</span>
          <span>{successToast}</span>
        </div>
      )}
      {errorToast && (
        <div className="fixed top-6 right-6 z-50 bg-rose-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center space-x-2.5 text-xs font-bold font-sans">
          <span className="w-5 h-5 bg-white text-rose-650 rounded-full flex items-center justify-center font-bold">!</span>
          <span>{errorToast}</span>
        </div>
      )}

      {activeView === "list" ? (
        /* ==================== VIEW A: AGENTS LIST (Mockup Image 1) ==================== */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Main Agents table (9 columns width) */}
          <div className="lg:col-span-9 space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-slate-950 tracking-tight">Agents</h2>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Build and deploy fully functional calling agents powered by neural voice networks.
              </p>
            </div>

            {/* List Table Container */}
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
              <div className="h-14 px-6 border-b border-slate-100 flex items-center justify-between">
                
                {/* Search */}
                <div className="relative flex items-center w-full max-w-xs">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3" />
                  <input
                    type="text"
                    placeholder="Search agents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg pl-9 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-blue-600 transition-all shadow-inner"
                  />
                </div>
                
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider select-none">
                  {filteredAgents.length} Agents active
                </span>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse select-none text-xs font-semibold text-slate-700">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] text-slate-455 font-bold uppercase tracking-wider">
                      <th className="p-4 pl-6">NAME</th>
                      <th className="p-4">CAPABILITIES</th>
                      <th className="p-4 pr-6 text-right w-52">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {loading ? (
                      <tr>
                        <td colSpan={3} className="p-10 text-center">
                          <Loader2 className="w-6 h-6 animate-spin text-blue-650 mx-auto mb-2" />
                          <span className="text-xs text-slate-450 font-bold uppercase">Fetching databases...</span>
                        </td>
                      </tr>
                    ) : filteredAgents.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-10 text-center text-slate-400 font-bold">
                          No active agents found in database.
                        </td>
                      </tr>
                    ) : (
                      filteredAgents.map((agent) => {
                        const isSarah = agent.name.toLowerCase().includes("sarah") || agent.name.toLowerCase().includes("screening");
                        const isHospitality = agent.name.toLowerCase().includes("hospitality");
                        const avatarBg = isSarah ? "bg-emerald-500" : isHospitality ? "bg-teal-500" : "bg-orange-400";
                        const showActionsMenu = activeActionsMenuId === agent.id;

                        return (
                          <tr key={agent.id} className="hover:bg-slate-50/40 transition-all cursor-pointer" onClick={() => handleStartEdit(agent)}>
                            
                            {/* Name */}
                            <td className="p-4 pl-6">
                              <div className="flex items-center space-x-3 text-left">
                                <div className={`w-9 h-9 rounded-full ${avatarBg} text-white flex items-center justify-center font-extrabold text-sm shadow-xs overflow-hidden shrink-0`}>
                                  {agent.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="space-y-0.5">
                                  <span className="text-slate-900 font-extrabold block text-sm group-hover:text-blue-600 transition-colors">
                                    {agent.name}
                                  </span>
                                  <span className="text-[10px] text-slate-450 font-mono block font-normal">
                                    ID: vq_live_{agent.id * 1827}b
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Capabilities */}
                            <td className="p-4">
                              <div className="space-y-0.5 text-left">
                                <span className="text-slate-800 font-extrabold block text-[11px]">
                                  {agent.capabilities?.split("/")[0]?.trim() || "Customer Care"}
                                </span>
                                <span className="text-[10px] text-slate-450 block font-normal">
                                  {agent.capabilities?.split("/")?.[1]?.trim() || "Applicant Triage"}
                                </span>
                              </div>
                            </td>

                            {/* Actions button & dropdown */}
                            <td className="p-4 pr-6 text-right w-52 relative" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => setTalkAgent(agent)}
                                  className="h-7 px-4 border border-orange-200 hover:border-orange-300 text-orange-600 hover:bg-orange-50/20 text-[10px] font-bold rounded-full transition-all cursor-pointer shadow-3xs"
                                >
                                  Talk to Agent
                                </button>

                                <div className="relative">
                                  <button
                                    onClick={() => setActiveActionsMenuId(showActionsMenu ? null : agent.id)}
                                    className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-700 cursor-pointer"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                    </svg>
                                  </button>

                                  {/* Dropdown Menu */}
                                  {showActionsMenu && (
                                    <div className="absolute right-0 top-8 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-40 w-44 animate-fade-in text-left">
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(`vq_live_${agent.id * 1827}b`);
                                          triggerSuccess("Agent ID copied to clipboard!");
                                          setActiveActionsMenuId(null);
                                        }}
                                        className="w-full px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center space-x-2.5 transition-all text-left cursor-pointer"
                                      >
                                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                                        <span>Copy Agent ID</span>
                                      </button>
                                      
                                      <button
                                        onClick={() => {
                                          handleDuplicateAgent(agent);
                                          setActiveActionsMenuId(null);
                                        }}
                                        className="w-full px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center space-x-2.5 transition-all text-left cursor-pointer"
                                      >
                                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                                        <span>Duplicate</span>
                                      </button>

                                      <button
                                        onClick={() => setActiveActionsMenuId(null)}
                                        className="w-full px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center space-x-2.5 transition-all text-left cursor-pointer"
                                      >
                                        <Plus className="w-3.5 h-3.5 text-slate-400" />
                                        <span>Add to Folder</span>
                                      </button>

                                      <hr className="my-1 border-slate-100" />

                                      <button
                                        onClick={() => {
                                          handleArchiveAgent(agent.id);
                                          setActiveActionsMenuId(null);
                                        }}
                                        className="w-full px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center space-x-2.5 transition-all text-left cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                        <span>Archive</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination footer */}
              <div className="h-12 px-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between select-none">
                <span className="text-[10px] text-slate-455 font-bold font-mono">
                  1-{filteredAgents.length} of {filteredAgents.length}
                </span>
                <div className="flex space-x-2">
                  <button className="h-7 px-3 border border-slate-200 rounded-md bg-white text-[10px] font-bold text-slate-400 cursor-not-allowed">Prev</button>
                  <button className="h-7 px-3 border border-slate-200 rounded-md bg-white text-[10px] font-bold text-slate-400 cursor-not-allowed">Next</button>
                </div>
              </div>

            </div>
          </div>

          {/* Right sidebar quick action columns (3 columns width) */}
          <div className="lg:col-span-3 space-y-5 select-none">
            
            {/* Create with AI Card */}
            <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-3xs space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-extrabold text-slate-900 block flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-orange-500" />
                  <span>Create with AI</span>
                </span>
                <span className="text-[10px] text-slate-450 block font-normal leading-relaxed">
                  Describe what you need and AI builds it for you.
                </span>
              </div>
              <button 
                onClick={() => {
                  triggerSuccess("Redirecting to conversational chatbot...");
                  // Link directly to AI Builder Tab inside dashboard page switcher!
                  // In our page.tsx, tab switching works by calling hook state.
                  // We can prompt the user to use AI Agent Builder tab in the left sidebar!
                }}
                className="w-full h-9 bg-white border border-orange-550 hover:bg-orange-50/10 text-[10px] font-extrabold text-orange-600 rounded-lg transition-all active:scale-[0.98] cursor-pointer shadow-3xs"
              >
                Get Started
              </button>
            </div>

            {/* Pre-built Templates List Card */}
            <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-3xs space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-extrabold text-slate-950 block flex items-center space-x-1.5">
                  <BadgeInfo className="w-4 h-4 text-indigo-500" />
                  <span>Pre-built Agents</span>
                </span>
              </div>
              
              <div className="space-y-2">
                {[
                  { name: "Furniture - Customer feedback - revisit", type: "Sales" },
                  { name: "Education - Outbound call - course promo", type: "Support" },
                  { name: "Homecare - Outbound festive promotion", type: "Faq" }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={async () => {
                      try {
                        const payload = {
                          name: item.name,
                          voice_id: "female",
                          voice_provider: "gemini",
                          prompt_system: `# IDENTITY\nYou are a pre-built agent configured for ${item.name}.`,
                          temperature: 0.7,
                          lang: "ENGLISH (US)",
                          first_message: `Hello, thanks for connecting. This is the pre-built ${item.name} agent.`,
                          llm_provider: "Groq",
                          llm_model: "openai/gpt-oss-120b",
                          transcriber: "Deepgram/Flux General Multi/English",
                          capabilities: `${item.type} / Pre-built Workflow`
                        };
                        const res = await apiFetch<any>("/dashboard/agents", "POST", payload, token);
                        if (res && res.status === "success") {
                          triggerSuccess(`Pre-built agent "${item.name}" loaded!`);
                          setNewlyCreatedAgentId(res.agent.id);
                          setHasPublished(false);
                          await fetchAgents();
                          handleStartEdit(res.agent);
                        }
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-left text-[10px] font-bold text-slate-650 hover:text-slate-900 border border-slate-200/40 truncate block transition-all cursor-pointer shadow-3xs"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
              
              <button className="w-full h-8 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10px] font-extrabold text-slate-600 rounded-lg transition-all cursor-pointer">
                Browse All
              </button>
            </div>

            {/* Start from scratch Card */}
            <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-3xs space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-extrabold text-slate-900 block flex items-center space-x-1.5">
                  <Edit3 className="w-4 h-4 text-emerald-500" />
                  <span>Start from Scratch</span>
                </span>
                <span className="text-[10px] text-slate-450 block font-normal leading-relaxed">
                  Build an agent manually with full control.
                </span>
              </div>
              <button
                onClick={handleCreateBlankAgent}
                className="w-full h-9 bg-white border border-slate-200 hover:bg-slate-50 text-[10px] font-extrabold text-slate-700 rounded-lg transition-all active:scale-[0.98] cursor-pointer shadow-3xs"
              >
                Create Blank Agent
              </button>
            </div>

            {/* Import Agents Card */}
            <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-3xs space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-extrabold text-slate-950 block flex items-center space-x-1.5">
                  <UploadCloud className="w-4 h-4 text-blue-500" />
                  <span>Import Agents</span>
                </span>
                <span className="text-[10px] text-slate-450 block font-normal leading-relaxed">
                  Bring existing agents into your workspace.
                </span>
              </div>
              <button className="w-full h-9 bg-white border border-slate-200 hover:bg-slate-50 text-[10px] font-extrabold text-slate-700 rounded-lg transition-all active:scale-[0.98] cursor-pointer shadow-3xs">
                Import Agents
              </button>
            </div>

          </div>

        </div>
      ) : (
        /* ==================== VIEW B: AGENT DETAIL EDITOR (Mockup Image 2, 3, 4, 5) ==================== */
        <div className="space-y-6">
          
          {/* Top Bar Navigation & Actions info */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackClick}
                className="p-2 hover:bg-slate-150 rounded-full text-slate-450 hover:text-slate-800 transition-all border border-slate-200 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-3 text-left">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-extrabold text-base overflow-hidden shrink-0 shadow-2xs">
                  {agentNameInput.charAt(0).toUpperCase()}
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={agentNameInput}
                      onChange={(e) => setAgentNameInput(e.target.value)}
                      className="text-slate-950 font-extrabold text-base bg-transparent border-b border-transparent focus:border-blue-600 outline-none w-56 font-sans transition-all py-0.5"
                    />
                    <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px] font-bold bg-slate-100 border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full select-none font-mono">v1.0.0</span>
                  </div>
                  
                  <div className="flex items-center space-x-3 text-[10px] text-slate-400 font-bold font-sans">
                    <span className="flex items-center space-x-1">
                      <span>Agent ID:</span>
                      <code className="text-[9px] font-mono text-slate-550 bg-slate-50 border border-slate-100 px-1 rounded">vq_live_{(editingAgent?.id || 1) * 1827}b</code>
                    </span>
                    <span className="h-3 w-px bg-slate-200" />
                    <span className="flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-emerald-700">TOTAL LATENCY: ~380 ms</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Right Action CTA bar */}
            <div className="flex items-center space-x-3 shrink-0">
              <button
                disabled={savingAgent}
                onClick={handleSaveAgentSettings}
                className="h-9 px-4 border border-blue-200 hover:border-blue-300 text-blue-600 hover:bg-blue-50/20 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1 shadow-3xs cursor-pointer"
              >
                {savingAgent ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <CheckCircle className="w-3.5 h-3.5 mr-1.5" />}
                <span>Publish</span>
              </button>

              <button
                onClick={() => editingAgent && setTalkAgent(editingAgent)}
                disabled={!editingAgent}
                className="h-9 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold text-white rounded-lg transition-all flex items-center justify-center space-x-1.5 active:scale-[0.98] shadow-sm cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                <span>Talk to Agent</span>
              </button>

              <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 border border-slate-200 cursor-pointer">
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Core Edit Area Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT EDITOR NAVIGATION PANEL (3 columns) */}
            <div className="lg:col-span-3 bg-white border border-slate-200 p-4 rounded-2xl shadow-3xs space-y-5 select-none text-left">
              
              {/* Assistant settings */}
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block px-3">
                  ASSISTANT SETTINGS
                </span>
                
                <div className="space-y-1">
                  {[
                    { id: "prompt", label: "Prompt", icon: FileSignature },
                    { id: "voice", label: "Voice", icon: Mic },
                    { id: "model", label: "Model & Transcriber", icon: Settings },
                    { id: "kb", label: "Knowledge Base", icon: FileText },
                    { id: "business", label: "Business Profile", icon: Building },
                  ].map((subTab) => {
                    const Icon = subTab.icon;
                    const active = activeSettingsTab === subTab.id;
                    return (
                      <button
                        key={subTab.id}
                        onClick={() => setActiveSettingsTab(subTab.id)}
                        className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                          active 
                            ? "bg-slate-100 text-[#0b1931] font-extrabold"
                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${active ? "text-blue-600" : "text-slate-400"}`} />
                        <span>{subTab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Advanced settings */}
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block px-3">
                  ADVANCED SETTINGS
                </span>
                
                <div className="space-y-1">
                  {[
                    { id: "callsettings", label: "Call Settings", icon: Phone },
                    { id: "analysis", label: "Analysis", icon: BadgeInfo },
                  ].map((subTab) => {
                    const Icon = subTab.icon;
                    const active = activeSettingsTab === subTab.id;
                    return (
                      <button
                        key={subTab.id}
                        onClick={() => setActiveSettingsTab(subTab.id)}
                        className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                          active 
                            ? "bg-slate-100 text-[#0b1931]"
                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${active ? "text-blue-600" : "text-slate-400"}`} />
                        <span>{subTab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* RIGHT PANEL CONTENT CONTAINER (9 columns) */}
            <div className="lg:col-span-9 bg-white border border-slate-200 p-6 rounded-2xl shadow-xs min-h-[500px]">
              
              {/* 1. PROMPT TAB (Image 2) */}
              {activeSettingsTab === "prompt" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left part (Fields) - 8 cols */}
                  <div className="lg:col-span-8 space-y-6 text-left">
                    {/* First Message */}
                    <div className="space-y-2">
                      <label className="text-xs font-extrabold text-slate-900 block">
                        First message <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-slate-450 block font-normal leading-relaxed">
                        The first message the agent will say. If empty, the agent will wait for the user to start the conversation.
                      </span>
                      <textarea
                        rows={2}
                        value={firstMessage}
                        onChange={(e) => setFirstMessage(e.target.value)}
                        placeholder="Enter the welcoming greeting..."
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-600 outline-none transition-all shadow-inner leading-relaxed"
                      />
                    </div>

                    {/* System Prompt */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-baseline">
                        <label className="text-xs font-extrabold text-slate-900 block">
                          System Prompt <span className="text-rose-500">*</span>
                        </label>
                        <a href="#prompt-tips" className="text-[10px] font-bold text-blue-600 hover:underline">Here&apos;s how to write a prompt</a>
                      </div>
                      <span className="text-[10px] text-slate-450 block font-normal leading-relaxed">
                        The system prompt is used to determine the persona of the agent and the context of the conversation.
                      </span>
                      <textarea
                        rows={10}
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        placeholder="Enter full system prompt identity and mission..."
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-750 placeholder-slate-400 focus:bg-white focus:border-blue-600 outline-none transition-all shadow-inner leading-relaxed"
                      />
                    </div>
                  </div>

                  {/* Right part (AI Refine & Actions) - 4 cols */}
                  <div className="lg:col-span-4 space-y-4 text-left select-none">
                    
                    {/* Ask AI to Refine card */}
                    <div className="p-4 bg-purple-50/30 border border-purple-100 rounded-2xl shadow-3xs space-y-3">
                      <span className="text-xs font-extrabold text-slate-900 block flex items-center space-x-1.5">
                        <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
                        <span>Ask AI to Refine</span>
                      </span>
                      <span className="text-[10px] text-slate-450 block font-normal leading-relaxed">
                        Describe what you need and AI will generate or refine the prompt.
                      </span>
                      <div className="relative">
                        <input
                          type="text"
                          value={aiRefineQuery}
                          onChange={(e) => setAiRefineQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRefinePromptWithAI();
                          }}
                          disabled={refiningPrompt}
                          placeholder="e.g., make it more concise..."
                          className="w-full h-9 bg-white border border-slate-200 rounded-lg pl-3.5 pr-8 text-[11px] font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-purple-500 shadow-3xs"
                        />
                        <button
                          onClick={handleRefinePromptWithAI}
                          disabled={refiningPrompt}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-500 hover:text-purple-700 cursor-pointer"
                        >
                          {refiningPrompt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Launch Campaign */}
                    <div className="p-4 bg-slate-50 hover:bg-slate-100/60 border border-slate-200/80 rounded-2xl shadow-3xs flex items-center justify-between cursor-pointer transition-all">
                      <div className="flex items-center space-x-3 text-left">
                        <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                          <Phone className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[11px] font-extrabold text-slate-900 block">Launch Campaign</span>
                          <span className="text-[9px] text-slate-400 block font-normal">Send batch outbound calls</span>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>

                    {/* Connect Number */}
                    <div className="p-4 bg-slate-50 hover:bg-slate-100/60 border border-slate-200/80 rounded-2xl shadow-3xs flex items-center justify-between cursor-pointer transition-all">
                      <div className="flex items-center space-x-3 text-left">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                          <Phone className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[11px] font-extrabold text-slate-900 block">Connect Number</span>
                          <span className="text-[9px] text-slate-400 block font-normal">Assign an inbound phone number</span>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>

                  </div>

                </div>
              )}

              {/* 2. VOICE TAB */}
              {activeSettingsTab === "voice" && (
                <div className="space-y-5 text-left select-none">
                  <div className="space-y-1">
                    <h3 className="text-sm font-extrabold text-slate-950 uppercase tracking-wide">Select Agent Voice</h3>
                    <p className="text-[10px] text-slate-450 font-normal">Select a voice option for this agent.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {voiceLibrarySeeds.map((v) => {
                      const isSelected = editingAgent?.voice_id?.toLowerCase() === v.id || 
                                         editingAgent?.voice_id?.toLowerCase() === v.name.toLowerCase();
                      return (
                        <div
                          key={v.id}
                          onClick={() => handleSelectAgentVoice(v.id)}
                          className={`p-4 border rounded-xl cursor-pointer transition-all flex items-center justify-between ${
                            isSelected ? "border-blue-500 bg-blue-50/50 shadow-sm" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex flex-col space-y-1">
                            <span className="text-xs font-extrabold text-slate-900">{v.name}</span>
                            <span className="text-[10px] text-slate-400">{v.gender} Voice Option</span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. MODEL & TRANSCRIBER TAB (Image 4 & 5) */}
              {activeSettingsTab === "model" && (
                <div className="space-y-6 text-left select-none">
                  <div className="space-y-1">
                    <h3 className="text-sm font-extrabold text-slate-950 uppercase tracking-wide">Model & Transcriber</h3>
                    <p className="text-[10px] text-slate-450 font-normal">
                      Keep the default settings if you&apos;re unsure. Transcriber is automatically configured based on language & voice selection.
                    </p>
                  </div>

                  {/* LLM Model Card */}
                  <div className="p-5 border border-slate-200/90 rounded-2xl space-y-3.5 text-left">
                    <div className="space-y-1">
                      <span className="text-xs font-extrabold text-slate-950 block">LLM Model</span>
                      <span className="text-[9px] text-slate-450 block leading-relaxed font-normal">
                        Select the primary intelligence engine responsible for call synthesis and text extraction.
                      </span>
                    </div>

                    <div
                      onClick={() => setShowLlmModal(true)}
                      className="w-full max-w-sm h-11 px-4 border border-slate-200 rounded-xl flex items-center justify-between hover:bg-slate-50 cursor-pointer shadow-3xs group transition-all"
                    >
                      <div className="flex items-center space-x-3 text-xs font-bold text-slate-800">
                        <span className="w-5 h-5 bg-orange-500 rounded text-white flex items-center justify-center text-[10px] font-black font-sans shrink-0 shadow-3xs">9</span>
                        <span>{selectedLlmModel}</span>
                      </div>
                      <Edit3 className="w-3.5 h-3.5 text-slate-450 group-hover:text-slate-700 transition-colors" />
                    </div>

                    <span className="text-[10px] text-slate-400 block font-normal leading-relaxed">
                      Adjust for performance and latency.
                    </span>
                  </div>

                  {/* Transcriber Card */}
                  <div className="p-5 border border-slate-200/90 rounded-2xl space-y-3.5 text-left">
                    <div className="space-y-1">
                      <span className="text-xs font-extrabold text-slate-950 block">Transcriber</span>
                      <span className="text-[9px] text-slate-455 block leading-relaxed font-normal">
                        Select the speech-to-text algorithm. Transcribers translate caller audio into script text.
                      </span>
                    </div>

                    <div>
                      <select
                        value={selectedTranscriber}
                        onChange={(e) => setSelectedTranscriber(e.target.value)}
                        className="w-full max-w-sm h-11 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-600 shadow-3xs cursor-pointer"
                      >
                        <option value="Deepgram/Flux General Multi/English">🇺🇸 Deepgram/Flux General Multi/English</option>
                        <option value="Whisper-Large-v3/Multi-lingual">🌐 Whisper-Large-v3/Multi-lingual</option>
                        <option value="AssemblyAI/Conformer-2-US">🇺🇸 AssemblyAI/Conformer-2-US</option>
                        <option value="Nova-2/English-Telephony">🇺🇸 Nova-2/English-Telephony</option>
                      </select>
                    </div>
                  </div>

                </div>
              )}

              {/* 4. KNOWLEDGE BASE TAB */}
              {activeSettingsTab === "kb" && (
                <div className="space-y-5 text-left">
                  
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 select-none">
                    <div className="space-y-1">
                      <h3 className="text-sm font-extrabold text-slate-950 uppercase tracking-wide">Knowledge Base</h3>
                      <p className="text-[10px] text-slate-450 font-normal">
                        Upload documents or databases — they are chunked, embedded, and retrieved during live calls.
                      </p>
                    </div>

                    {!showKbCreator && (
                      <button
                        onClick={() => {
                          setNewKbName("");
                          setNewKbDescription("");
                          setKbUploadingFile(null);
                          setKbUploadProgress(0);
                          setShowKbCreator(true);
                        }}
                        className="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-[10px] font-bold text-white rounded-lg transition-all flex items-center justify-center space-x-1 cursor-pointer select-none"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Build Knowledge Base</span>
                      </button>
                    )}
                  </div>

                  {showKbCreator ? (
                    /* Creator Panel */
                    <form onSubmit={handleCreateKnowledgeBase} className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4 shadow-3xs">
                      <div className="space-y-1 select-none">
                        <span className="text-xs font-extrabold text-slate-900 block flex items-center space-x-1.5">
                          <Sparkles className="w-4 h-4 text-blue-650" />
                          <span>Build New Knowledge Base</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5 text-left">
                          <label className="text-[9px] text-slate-450 font-bold uppercase tracking-wider block">
                            Knowledge Base Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Inbound Support FAQ"
                            value={newKbName}
                            onChange={(e) => setNewKbName(e.target.value)}
                            className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-blue-600 shadow-3xs"
                          />
                        </div>

                        <div className="space-y-1.5 text-left">
                          <label className="text-[9px] text-slate-450 font-bold uppercase tracking-wider block">
                            Description
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Policies and customer guides"
                            value={newKbDescription}
                            onChange={(e) => setNewKbDescription(e.target.value)}
                            className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-blue-600 shadow-3xs"
                          />
                        </div>
                      </div>

                      {/* Interactive Drag & Drop Box (10MB text uploader) */}
                      <div className="space-y-2 text-left">
                        <span className="text-[9px] text-slate-455 font-bold uppercase tracking-wider block">
                          Upload Document <span className="text-slate-400 font-normal lowercase">(max 10MB — PDF, DOCX, CSV, JSON, XLSX, SQLite, TXT)</span>
                        </span>

                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 bg-white flex flex-col items-center justify-center text-center space-y-2 select-none relative hover:bg-slate-50 transition-colors cursor-pointer group">
                          <input
                            type="file"
                            accept=".txt,.json,.csv,.md,.pdf,.docx,.xlsx,.xls,.db,.sqlite,.sqlite3"
                            onChange={handleChooseKbFile}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                          <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-blue-600 transition-colors" />
                          <div className="space-y-0.5">
                            <span className="text-[11px] font-extrabold text-slate-800 block">Click or drag files here</span>
                            <span className="text-[9px] text-slate-400 block font-normal">Parsed, chunked, and vector-indexed automatically</span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        {kbUploadingFile && (
                          <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 animate-fade-in shadow-3xs flex flex-col">
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-650">
                              <span className="flex items-center space-x-1.5 truncate">
                                <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span className="truncate">{kbUploadingFile}</span>
                              </span>
                              <span>{kbIndexing ? "Indexing..." : "Ready"}</span>
                            </div>
                            {kbIndexing && (
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-650 rounded-full animate-pulse w-2/3" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* CTA Buttons */}
                      <div className="flex justify-end space-x-3 select-none">
                        <button
                          type="button"
                          onClick={() => setShowKbCreator(false)}
                          className="h-9 px-4 border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-600 rounded-lg transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        
                        <button
                          type="submit"
                          disabled={!newKbName.trim() || kbIndexing}
                          className="h-9 px-5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-xs font-bold text-white rounded-lg transition-all flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Create Knowledge Base</span>
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* Associated KB Info / Dropdown Selector */
                    <div className="space-y-5 text-left">
                      {editingAgent?.kb_id ? (
                        /* Loaded Associated Knowledge Base Info */
                        (() => {
                          const currentKb = knowledgeBases.find(k => k.id === editingAgent.kb_id);
                          if (!currentKb) return null;
                          return (
                            <div className="border border-slate-200 rounded-2xl p-5 space-y-4 shadow-3xs bg-slate-50/30">
                              <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                  <span className="text-sm font-extrabold text-slate-900 block flex items-center space-x-1.5">
                                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                                    <span>Active: {currentKb.name}</span>
                                  </span>
                                  <span className="text-[10px] text-slate-500 block leading-relaxed font-normal">{currentKb.description || "No description provided."}</span>
                                </div>
                                <button
                                  onClick={handleDeassociateKb}
                                  className="text-[10px] font-bold text-slate-450 hover:text-rose-600 flex items-center space-x-1 transition-colors border border-slate-200 px-2.5 py-1 rounded-md bg-white cursor-pointer shadow-3xs"
                                >
                                  <Trash2 className="w-3 h-3 text-slate-400 hover:text-rose-500" />
                                  <span>Unlink</span>
                                </button>
                              </div>

                              <hr className="border-slate-200" />

                              {/* Document Table */}
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-[9px] font-extrabold text-slate-450 uppercase tracking-wider block">Uploaded Documents</span>
                                  <label className="text-[9px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer flex items-center space-x-1">
                                    <Plus className="w-3 h-3" />
                                    <span>Add file</span>
                                    <input
                                      type="file"
                                      accept=".txt,.json,.csv,.md,.pdf,.docx,.xlsx,.xls,.db,.sqlite,.sqlite3"
                                      className="hidden"
                                      disabled={kbIndexing}
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file || !currentKb) return;
                                        try {
                                          await uploadFileToKb(currentKb.id, file);
                                        } catch (err) {
                                          console.error(err);
                                          triggerError("Failed to upload document.");
                                        }
                                        e.target.value = "";
                                      }}
                                    />
                                  </label>
                                </div>
                                {currentKb.documents && currentKb.documents.length > 0 ? (
                                  <div className="space-y-2">
                                    {currentKb.documents.map((doc) => (
                                      <div key={doc.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-3xs text-xs font-semibold">
                                        <div className="flex items-center space-x-2.5 min-w-0">
                                          <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                                          <div className="min-w-0">
                                            <span className="text-slate-800 block truncate">{doc.file_name}</span>
                                            <span className={`text-[9px] font-bold uppercase tracking-wide ${
                                              doc.index_status === "ready" ? "text-emerald-600" :
                                              doc.index_status === "processing" ? "text-amber-600" :
                                              doc.index_status === "failed" ? "text-rose-600" :
                                              "text-slate-400"
                                            }`}>
                                              {doc.index_status === "ready"
                                                ? `${doc.chunk_count || 0} vector chunks indexed`
                                                : doc.index_status === "failed"
                                                ? `Index failed${doc.index_error ? `: ${doc.index_error.slice(0, 40)}` : ""}`
                                                : doc.index_status || "pending"}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex items-center space-x-1 shrink-0">
                                          {(doc.index_status === "failed" || doc.index_status === "pending") && (
                                            <button
                                              onClick={() => handleReindexDocument(currentKb.id, doc.id)}
                                              disabled={kbIndexing}
                                              className="text-[9px] font-bold text-blue-600 hover:text-blue-700 px-2 py-1 rounded border border-blue-100"
                                            >
                                              Reindex
                                            </button>
                                          )}
                                          <button
                                            onClick={async () => {
                                              try {
                                                await apiFetch(`/dashboard/knowledge-bases/documents/${doc.id}`, "DELETE", undefined, token);
                                                triggerSuccess("Document deleted!");
                                                await fetchKnowledgeBases();
                                              } catch (err) {
                                                console.error(err);
                                              }
                                            }}
                                            className="text-slate-400 hover:text-rose-600 transition-colors p-1 hover:bg-slate-50 rounded"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-slate-400 italic">No files uploaded in this knowledge base.</div>
                                )}
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        /* Selector if none associated */
                        <div className="border border-slate-200 border-dashed rounded-2xl p-10 text-center flex flex-col items-center justify-center space-y-4 select-none">
                          <BadgeInfo className="w-10 h-10 text-slate-350" />
                          <div className="space-y-1">
                            <span className="text-xs font-extrabold text-slate-700 block">No associated Knowledge Base</span>
                            <span className="text-[9px] text-slate-400 block font-normal max-w-sm leading-relaxed">
                              Choose an existing Knowledge Base below or click &quot;Build Knowledge Base&quot; at the top to import policies.
                            </span>
                          </div>

                          {knowledgeBases.length > 0 && (
                            <div className="flex items-center space-x-3.5 pt-2">
                              <select
                                defaultValue=""
                                onChange={(e) => {
                                  if (e.target.value) handleAssociateKb(parseInt(e.target.value));
                                }}
                                className="h-8 px-3 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 outline-none cursor-pointer shadow-3xs"
                              >
                                <option value="" disabled>Link existing base...</option>
                                {knowledgeBases.map((kb) => (
                                  <option key={kb.id} value={kb.id}>{kb.name}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}

              {/* 5. BUSINESS PROFILE TAB */}
              {activeSettingsTab === "business" && (
                <div className="space-y-6 text-left">
                  
                  <div className="space-y-1 select-none">
                    <h3 className="text-sm font-extrabold text-slate-950 uppercase tracking-wide">Business Profile</h3>
                    <p className="text-[10px] text-slate-450 font-normal">
                      Update your 15-step onboarding business profile. These details are stored in SQLite and loaded into agent prompts dynamically.
                    </p>
                  </div>

                  {/* Onboarding fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Business Name */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-slate-450 font-bold uppercase tracking-wider block">
                        Business Name
                      </label>
                      <input
                        type="text"
                        placeholder="Voqly Enterprise"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-600 transition-all shadow-3xs"
                      />
                    </div>

                    {/* Website URL */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-slate-450 font-bold uppercase tracking-wider block">
                        Website URL
                      </label>
                      <div className="relative">
                        <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="https://company.com"
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                          className="w-full h-10 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-600 transition-all shadow-3xs"
                        />
                      </div>
                    </div>

                    {/* Industry */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-slate-450 font-bold uppercase tracking-wider block">
                        Industry Sector
                      </label>
                      <input
                        type="text"
                        placeholder="Solar Outreach, Hospitality"
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-600 transition-all shadow-3xs"
                      />
                    </div>

                    {/* Tax ID */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-slate-450 font-bold uppercase tracking-wider block">
                        Tax ID / EIN
                      </label>
                      <input
                        type="text"
                        placeholder="XX-XXXXXXX"
                        value={taxId}
                        onChange={(e) => setTaxId(e.target.value)}
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-600 transition-all shadow-3xs"
                      />
                    </div>

                    {/* Company Size */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-slate-455 font-bold uppercase tracking-wider block">
                        Company Size
                      </label>
                      <select
                        value={companySize}
                        onChange={(e) => setCompanySize(e.target.value)}
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-600 transition-all cursor-pointer shadow-3xs"
                      >
                        <option value="1-10 Employees">1-10 Employees</option>
                        <option value="11-50 Employees">11-50 Employees</option>
                        <option value="51-200 Employees">51-200 Employees</option>
                        <option value="201+ Employees">201+ Employees</option>
                      </select>
                    </div>

                    {/* Address */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-slate-455 font-bold uppercase tracking-wider block">
                        Street Address
                      </label>
                      <input
                        type="text"
                        placeholder="123 Corporate Way"
                        value={streetAddress}
                        onChange={(e) => setStreetAddress(e.target.value)}
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-600 transition-all shadow-3xs"
                      />
                    </div>

                    {/* State/Province */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-slate-455 font-bold uppercase tracking-wider block">
                        State / Province
                      </label>
                      <input
                        type="text"
                        placeholder="California"
                        value={stateProvince}
                        onChange={(e) => setStateProvince(e.target.value)}
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-600 transition-all shadow-3xs"
                      />
                    </div>

                    {/* Country */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-slate-455 font-bold uppercase tracking-wider block">
                        Country
                      </label>
                      <input
                        type="text"
                        placeholder="United States"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-600 transition-all shadow-3xs"
                      />
                    </div>

                  </div>

                  {/* HIPAA compliance check switch */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between select-none shadow-3xs">
                    <div className="space-y-0.5 text-left">
                      <span className="text-xs font-extrabold text-slate-900 block flex items-center space-x-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span>HIPAA / HITECH Compliance Shield</span>
                      </span>
                      <span className="text-[9px] text-slate-400 block font-normal leading-relaxed">
                        Encrypt calling dialog logs and audio records according to high HIPAA patient protection regulations.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={complianceHipaa}
                        onChange={(e) => setComplianceHipaa(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                    </label>
                  </div>

                  {/* Save button */}
                  <div className="flex justify-end select-none">
                    <button
                      onClick={handleSaveBusinessDetails}
                      disabled={savingBusinessDetails}
                      className="h-10 px-5 bg-blue-650 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-xs font-extrabold text-white rounded-lg transition-all flex items-center justify-center space-x-1.5 shadow-sm active:scale-[0.98] cursor-pointer"
                    >
                      {savingBusinessDetails ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                          <span>Saving Profile...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1.5" />
                          <span>Save Business Details</span>
                        </>
                      )}
                    </button>
                  </div>

                </div>
              )}

              {/* 6. CALL SETTINGS TAB (Collapsible Accordion Suite) */}
              {activeSettingsTab === "callsettings" && (
                <div className="space-y-5 text-left select-none max-w-3xl">
                  <div className="space-y-1">
                    <h3 className="text-sm font-extrabold text-slate-950 uppercase tracking-wide">Call Settings</h3>
                    <p className="text-[10px] text-slate-455 font-normal">Configure voice plan thresholds, guardrails, background office simulators, and dynamic endpoint rules.</p>
                  </div>

                  <div className="space-y-3.5">
                    
                    {/* Accordion 1: Start Speaking Plan */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-3xs">
                      <button
                        onClick={() => setOpenAccordion(openAccordion === "startSpeaking" ? null : "startSpeaking")}
                        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/75 transition-colors text-left"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                            <Mic className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-extrabold text-slate-900 block">Start Speaking Plan</span>
                            <span className="text-[9px] text-slate-455 block font-normal mt-0.5">Configure how fast the agent responds and endpoint settings.</span>
                          </div>
                        </div>
                        {openAccordion === "startSpeaking" ? (
                          <ChevronUp className="w-4 h-4 text-slate-455" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-455" />
                        )}
                      </button>
                      
                      {openAccordion === "startSpeaking" && (
                        <div className="p-5 border-t border-slate-150 bg-white space-y-4">
                          {/* Slider for Wait Seconds */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Wait Seconds</label>
                              <span className="text-xs font-extrabold text-blue-650 bg-blue-50 px-2.5 py-0.5 rounded-full">{waitSeconds.toFixed(1)}s</span>
                            </div>
                            <input
                              type="range"
                              min={0.0}
                              max={5.0}
                              step={0.1}
                              value={waitSeconds}
                              onChange={(e) => setWaitSeconds(parseFloat(e.target.value))}
                              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                            <span className="text-[9px] text-slate-400 block font-normal leading-relaxed">
                              The delay seconds the agent waits after the customer stops speaking before starting to formulate a response.
                            </span>
                          </div>

                          {/* Select for Smart Endpointing */}
                          <div className="space-y-2 pt-2">
                            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Smart Endpointing Provider</label>
                            <select
                              value={smartEndpointing}
                              onChange={(e) => setSmartEndpointing(e.target.value)}
                              className="w-full max-w-md h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-blue-600 shadow-3xs cursor-pointer"
                            >
                              <option value="LiveKit">LiveKit Engine (Ultra Low-latency)</option>
                              <option value="ElevenLabs">ElevenLabs Webhook</option>
                              <option value="Vapi">Vapi Gateway</option>
                            </select>
                            <span className="text-[9px] text-slate-400 block font-normal leading-relaxed">
                              Select who controls the silence detection boundaries.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Accordion 2: Call Timeout Settings */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-3xs">
                      <button
                        onClick={() => setOpenAccordion(openAccordion === "callTimeout" ? null : "callTimeout")}
                        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/75 transition-colors text-left"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-extrabold text-slate-900 block">Call Timeout Settings</span>
                            <span className="text-[9px] text-slate-455 block font-normal mt-0.5">Manage maximum call boundaries and silence drop limits.</span>
                          </div>
                        </div>
                        {openAccordion === "callTimeout" ? (
                          <ChevronUp className="w-4 h-4 text-slate-455" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-455" />
                        )}
                      </button>
                      
                      {openAccordion === "callTimeout" && (
                        <div className="p-5 border-t border-slate-150 bg-white space-y-4">
                          {/* Slider for Silence Timeout */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Silence Timeout</label>
                              <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">{silenceTimeout}s</span>
                            </div>
                            <input
                              type="range"
                              min={5}
                              max={120}
                              step={1}
                              value={silenceTimeout}
                              onChange={(e) => setSilenceTimeout(parseInt(e.target.value))}
                              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <span className="text-[9px] text-slate-400 block font-normal leading-relaxed">
                              If the customer remains silent for this many seconds, the call will terminate automatically.
                            </span>
                          </div>

                          {/* Slider for Max Duration */}
                          <div className="space-y-2 pt-2">
                            <div className="flex justify-between items-center">
                              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Maximum Duration</label>
                              <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                                {Math.round(maxDurationSeconds / 60)}m
                              </span>
                            </div>
                            <input
                              type="range"
                              min={1}
                              max={60}
                              step={1}
                              value={Math.round(maxDurationSeconds / 60)}
                              onChange={(e) => setMaxDurationSeconds(parseInt(e.target.value) * 60)}
                              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <span className="text-[9px] text-slate-400 block font-normal leading-relaxed">
                              The absolute threshold boundary for a single call in minutes before hard teardown.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Accordion 3: Stop Speaking Plan */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-3xs">
                      <button
                        onClick={() => setOpenAccordion(openAccordion === "stopSpeaking" ? null : "stopSpeaking")}
                        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/75 transition-colors text-left"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                            <Volume2 className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-extrabold text-slate-900 block">Stop Speaking Plan (Barge-In)</span>
                            <span className="text-[9px] text-slate-455 block font-normal mt-0.5">Determine how easily caller interruptions cut off the agent.</span>
                          </div>
                        </div>
                        {openAccordion === "stopSpeaking" ? (
                          <ChevronUp className="w-4 h-4 text-slate-455" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-455" />
                        )}
                      </button>
                      
                      {openAccordion === "stopSpeaking" && (
                        <div className="p-5 border-t border-slate-150 bg-white space-y-4">
                          {/* Slider for Number of words */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Number of Words Threshold</label>
                              <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">{stopWords} words</span>
                            </div>
                            <input
                              type="range"
                              min={1}
                              max={20}
                              step={1}
                              value={stopWords}
                              onChange={(e) => setStopWords(parseInt(e.target.value))}
                              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-650"
                            />
                            <span className="text-[9px] text-slate-400 block font-normal leading-relaxed">
                              The number of words the user must speak continuously before the agent pauses to listen.
                            </span>
                          </div>

                          {/* Slider for Voice Seconds */}
                          <div className="space-y-2 pt-2">
                            <div className="flex justify-between items-center">
                              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Voice Seconds Threshold</label>
                              <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">{voiceSeconds.toFixed(1)}s</span>
                            </div>
                            <input
                              type="range"
                              min={0.1}
                              max={5.0}
                              step={0.1}
                              value={voiceSeconds}
                              onChange={(e) => setVoiceSeconds(parseFloat(e.target.value))}
                              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-650"
                            />
                            <span className="text-[9px] text-slate-400 block font-normal leading-relaxed">
                              Minimum duration of human sound detected to trigger a barge-in cut.
                            </span>
                          </div>

                          {/* Slider for Backoff Seconds */}
                          <div className="space-y-2 pt-2">
                            <div className="flex justify-between items-center">
                              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Backoff Seconds (Resume Delay)</label>
                              <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">{backoffSeconds.toFixed(1)}s</span>
                            </div>
                            <input
                              type="range"
                              min={0.5}
                              max={10.0}
                              step={0.1}
                              value={backoffSeconds}
                              onChange={(e) => setBackoffSeconds(parseFloat(e.target.value))}
                              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-650"
                            />
                            <span className="text-[9px] text-slate-400 block font-normal leading-relaxed">
                              How long the agent stays silent before trying to finish their sentence if the interruption was brief.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Accordion 4: Idle Messages Plan */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-3xs">
                      <button
                        onClick={() => setOpenAccordion(openAccordion === "idleMessages" ? null : "idleMessages")}
                        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/75 transition-colors text-left"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                            <MessageSquare className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-extrabold text-slate-900 block">Idle Messages Plan</span>
                            <span className="text-[9px] text-slate-455 block font-normal mt-0.5">Manage what the agent says during silences to keep callers engaged.</span>
                          </div>
                        </div>
                        {openAccordion === "idleMessages" ? (
                          <ChevronUp className="w-4 h-4 text-slate-455" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-455" />
                        )}
                      </button>
                      
                      {openAccordion === "idleMessages" && (
                        <div className="p-5 border-t border-slate-150 bg-white space-y-4">
                          <span className="text-[10px] text-slate-455 font-bold uppercase tracking-wider block">Silence Re-Engagement Prompts</span>
                          
                          <div className="space-y-2">
                            {idleMessages.map((msg, idx) => (
                              <div key={idx} className="flex items-center space-x-2">
                                <input
                                  type="text"
                                  value={msg}
                                  onChange={(e) => {
                                    const updated = [...idleMessages];
                                    updated[idx] = e.target.value;
                                    setIdleMessages(updated);
                                  }}
                                  placeholder={`Idle message ${idx + 1}`}
                                  className="flex-1 h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-purple-650 shadow-3xs"
                                />
                                <button
                                  onClick={() => {
                                    const updated = idleMessages.filter((_, i) => i !== idx);
                                    setIdleMessages(updated);
                                  }}
                                  disabled={idleMessages.length <= 1}
                                  className="p-2 text-slate-400 hover:text-red-500 disabled:text-slate-200 disabled:hover:text-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>

                          <button
                            onClick={() => setIdleMessages([...idleMessages, ""])}
                            className="h-8 px-4 border border-dashed border-slate-350 hover:border-slate-400 text-[10px] font-bold text-slate-600 hover:text-slate-800 rounded-lg transition-all flex items-center justify-center space-x-1 hover:bg-slate-50/50 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            <span>Add Message</span>
                          </button>
                          
                          <span className="text-[9px] text-slate-400 block font-normal leading-relaxed">
                            These phrases will be triggered in sequence if a caller pauses or stops speaking for a prolonged time without hanging up.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Accordion 5: Background Sound */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-3xs">
                      <button
                        onClick={() => setOpenAccordion(openAccordion === "backgroundSound" ? null : "backgroundSound")}
                        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/75 transition-colors text-left"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
                            <Volume2 className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-extrabold text-slate-900 block">Background Sound</span>
                            <span className="text-[9px] text-slate-455 block font-normal mt-0.5">Toggle realistic hums to make calls feel more human-centric.</span>
                          </div>
                        </div>
                        {openAccordion === "backgroundSound" ? (
                          <ChevronUp className="w-4 h-4 text-slate-455" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-455" />
                        )}
                      </button>
                      
                      {openAccordion === "backgroundSound" && (
                        <div className="p-5 border-t border-slate-150 bg-white flex items-center justify-between select-none">
                          <div className="space-y-0.5 text-left max-w-md">
                            <span className="text-xs font-extrabold text-slate-900 block">Simulate Office Noise</span>
                            <span className="text-[9px] text-slate-400 block font-normal leading-relaxed">
                              Play realistic, ultra-quiet low-frequency background office hums and typing audio over the call.
                            </span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={backgroundSoundEnabled}
                              onChange={(e) => setBackgroundSoundEnabled(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600" />
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Accordion 6: Call Forwarding */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-3xs">
                      <button
                        onClick={() => setOpenAccordion(openAccordion === "callForwarding" ? null : "callForwarding")}
                        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/75 transition-colors text-left"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
                            <Phone className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-extrabold text-slate-900 block">Call Forwarding Plan</span>
                            <span className="text-[9px] text-slate-455 block font-normal mt-0.5">Route calls to physical phone lines if escalation is requested.</span>
                          </div>
                        </div>
                        {openAccordion === "callForwarding" ? (
                          <ChevronUp className="w-4 h-4 text-slate-455" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-455" />
                        )}
                      </button>
                      
                      {openAccordion === "callForwarding" && (
                        <div className="p-5 border-t border-slate-150 bg-white space-y-4">
                          <div className="grid grid-cols-3 gap-3.5">
                            <div className="col-span-1 space-y-1">
                              <label className="text-[9px] text-slate-455 font-bold uppercase tracking-wider block">Country Code</label>
                              <input
                                type="text"
                                value={forwardingCountryCode}
                                onChange={(e) => setForwardingCountryCode(e.target.value)}
                                placeholder="+1"
                                className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-teal-600 shadow-3xs"
                              />
                            </div>
                            <div className="col-span-2 space-y-1">
                              <label className="text-[9px] text-slate-455 font-bold uppercase tracking-wider block">Phone Number</label>
                              <input
                                type="text"
                                value={forwardingPhoneNumber}
                                onChange={(e) => setForwardingPhoneNumber(e.target.value)}
                                placeholder="(555) 000-0000"
                                className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-teal-600 shadow-3xs"
                              />
                            </div>
                          </div>
                          <span className="text-[9px] text-slate-400 block font-normal leading-relaxed">
                            If the customer asks to &quot;speak to a human&quot; or triggers the prompt transfer criteria, the call will forward to this number.
                          </span>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Save button */}
                  <div className="flex justify-end pt-3 select-none">
                    <button
                      onClick={handleSaveCallSettings}
                      disabled={savingCallSettings}
                      className="h-10 px-5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-xs font-extrabold text-white rounded-lg transition-all flex items-center justify-center space-x-1.5 shadow-sm active:scale-[0.98] cursor-pointer"
                    >
                      {savingCallSettings ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                          <span>Saving Settings...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1.5" />
                          <span>Publish Call Settings</span>
                        </>
                      )}
                    </button>
                  </div>

                </div>
              )}

              {/* 7. ANALYSIS TAB */}
              {activeSettingsTab === "analysis" && (
                <div className="space-y-6 text-left select-none max-w-3xl">
                  <div className="space-y-1">
                    <h3 className="text-sm font-extrabold text-slate-950 uppercase tracking-wide">Call Summary & Analysis Settings</h3>
                    <p className="text-[10px] text-slate-455 font-normal">Configure artificial intelligence summarization plans and structured extraction guidelines.</p>
                  </div>

                  {/* Section 1: Call Summary */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider block">Call Summary</span>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] text-slate-455 font-bold uppercase tracking-wider block">Summary Prompt</label>
                      <div className="relative">
                        <textarea
                          rows={6}
                          value={analysisSummaryPrompt}
                          onChange={(e) => setAnalysisSummaryPrompt(e.target.value)}
                          placeholder="You are an expert call summarizer..."
                          className="w-full p-4 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-blue-600 shadow-3xs resize-y"
                        />
                        <div className="absolute bottom-3 right-3 text-slate-350 cursor-pointer pointer-events-none">
                          <Edit3 className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>

                    {/* Timeout slider */}
                    <div className="grid grid-cols-5 items-center gap-4 py-1">
                      <div className="col-span-2">
                        <span className="text-xs font-extrabold text-slate-750 block">Timeout</span>
                      </div>
                      <div className="col-span-2 flex items-center">
                        <input
                          type="range"
                          min={10}
                          max={120}
                          step={1}
                          value={analysisSummaryTimeout}
                          onChange={(e) => setAnalysisSummaryTimeout(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>
                      <div className="col-span-1 text-right">
                        <span className="text-xs font-extrabold text-slate-800">{analysisSummaryTimeout}s</span>
                      </div>
                    </div>

                    {/* Trigger after messages slider */}
                    <div className="grid grid-cols-5 items-center gap-4 py-1">
                      <div className="col-span-2">
                        <span className="text-xs font-extrabold text-slate-750 block">Trigger after messages</span>
                      </div>
                      <div className="col-span-2 flex items-center">
                        <input
                          type="range"
                          min={1}
                          max={20}
                          step={1}
                          value={analysisSummaryTriggerMessages}
                          onChange={(e) => setAnalysisSummaryTriggerMessages(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>
                      <div className="col-span-1 text-right">
                        <span className="text-xs font-extrabold text-slate-800">{analysisSummaryTriggerMessages}</span>
                      </div>
                    </div>
                  </div>

                  <hr className="border-slate-150" />

                  {/* Section 2: Structured Data */}
                  <div className="space-y-4 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider block">Structured Data</span>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] text-slate-455 font-bold uppercase tracking-wider block">Extraction Prompt</label>
                      <div className="relative">
                        <textarea
                          rows={5}
                          value={analysisStructuredPrompt}
                          onChange={(e) => setAnalysisStructuredPrompt(e.target.value)}
                          placeholder="Prompt for extracting structured data..."
                          className="w-full p-4 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-blue-600 shadow-3xs resize-y"
                        />
                        <div className="absolute bottom-3 right-3 text-slate-350 cursor-pointer pointer-events-none">
                          <Edit3 className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <span className="text-[9px] text-slate-400 block font-normal leading-relaxed">
                        This prompt is used to extract structured data from the transcript.
                      </span>
                    </div>

                    {/* Timeout slider */}
                    <div className="grid grid-cols-5 items-center gap-4 py-1">
                      <div className="col-span-2">
                        <span className="text-xs font-extrabold text-slate-750 block">Timeout</span>
                      </div>
                      <div className="col-span-2 flex items-center">
                        <input
                          type="range"
                          min={10}
                          max={120}
                          step={1}
                          value={analysisStructuredTimeout}
                          onChange={(e) => setAnalysisStructuredTimeout(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>
                      <div className="col-span-1 text-right">
                        <span className="text-xs font-extrabold text-slate-800">{analysisStructuredTimeout}s</span>
                      </div>
                    </div>
                  </div>

                  {/* Save button */}
                  <div className="flex justify-end pt-4 select-none">
                    <button
                      onClick={handleSaveAnalysisSettings}
                      disabled={savingAnalysisSettings}
                      className="h-10 px-5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-xs font-extrabold text-white rounded-lg transition-all flex items-center justify-center space-x-1.5 shadow-sm active:scale-[0.98] cursor-pointer"
                    >
                      {savingAnalysisSettings ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                          <span>Saving Analysis Settings...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1.5" />
                          <span>Publish Analysis Settings</span>
                        </>
                      )}
                    </button>
                  </div>

                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* ==================== LLM CONFIGURATION POPUP MODAL (Mockup Image 5) ==================== */}
      {showLlmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 select-none animate-fade-in text-left">
          <div className="w-full max-w-lg bg-white border border-slate-250 rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between animate-scale-up">
            
            {/* Modal Header */}
            <div className="h-14 px-6 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-950 uppercase tracking-wider">
                LLM Configuration
              </span>
              <button
                onClick={() => setShowLlmModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Inner Fields */}
            <div className="p-6 space-y-4">
              <span className="text-[10px] text-slate-500 block leading-relaxed font-normal -mt-2">
                Select the AI provider and model for your agent
              </span>

              {/* Provider Dropdown */}
              <div className="space-y-1.5">
                <label className="text-[9px] text-slate-455 font-bold uppercase tracking-wider block">
                  Provider
                </label>
                <select
                  value={selectedLlmProvider}
                  onChange={(e) => setSelectedLlmProvider(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-blue-600 shadow-3xs cursor-pointer"
                >
                  <option value="Groq">Groq (Ultra Latency)</option>
                  <option value="OpenAI">OpenAI (Advanced Intelligence)</option>
                  <option value="Anthropic">Anthropic (Context reasoning)</option>
                </select>
              </div>

              {/* Model Dropdown based on Provider */}
              <div className="space-y-1.5">
                <label className="text-[9px] text-slate-455 font-bold uppercase tracking-wider block">
                  Model
                </label>
                <select
                  value={selectedLlmModel}
                  onChange={(e) => setSelectedLlmModel(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-blue-600 shadow-3xs cursor-pointer"
                >
                  {selectedLlmProvider === "Groq" ? (
                    <>
                      <option value="openai/gpt-oss-120b">openai/gpt-oss-120b (~280 ms) [oss]</option>
                      <option value="meta-llama/llama3-70b">meta-llama/llama3-70b (~180 ms) [oss]</option>
                      <option value="groq/mixtral-8x7b">groq/mixtral-8x7b (~110 ms) [oss]</option>
                    </>
                  ) : selectedLlmProvider === "OpenAI" ? (
                    <>
                      <option value="gpt-4o">gpt-4o (~450 ms) [gpt-4o]</option>
                      <option value="gpt-4-turbo">gpt-4-turbo (~610 ms) [gpt-4]</option>
                      <option value="gpt-3.5-turbo">gpt-3.5-turbo (~220 ms) [gpt-3.5]</option>
                    </>
                  ) : (
                    <>
                      <option value="claude-3-5-sonnet">claude-3-5-sonnet (~480 ms) [claude-3.5]</option>
                      <option value="claude-3-opus">claude-3-opus (~950 ms) [claude-3]</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end gap-3 select-none">
              <button
                onClick={() => setShowLlmModal(false)}
                className="h-9 px-4 border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-650 rounded-lg transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleSaveLlmConfiguration}
                className="h-9 px-5 bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white rounded-lg transition-all flex items-center justify-center space-x-1 shadow-sm cursor-pointer"
              >
                Save
              </button>
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

      {talkAgent && (
        <TalkToAgentModal agent={talkAgent} token={token} onClose={() => setTalkAgent(null)} />
      )}

    </div>
  );
};
