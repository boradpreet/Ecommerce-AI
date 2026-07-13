"use client";

import React, { useState } from "react";
import { Sparkles, Send, Trash2, Download, Loader2, User, Bot, Check, ShieldAlert, UploadCloud } from "lucide-react";
import { apiFetch, apiUpload } from "src/lib/api";

interface ExtractedAgent {
  name: string;
  system_prompt: string;
  first_message: string;
  voice_name: string;
  config_mode: string;
}

interface ChatMessage {
  sender: "user" | "bot";
  text: string;
  extracted?: ExtractedAgent;
}

interface BuilderChatResponse {
  status: string;
  reply: string;
  extracted_agent?: ExtractedAgent;
}

interface CreateAgentResponse {
  status: string;
}

interface AiAgentBuilderTabProps {
  token: string;
  setActiveTab: (tab: string) => void;
  fetchAllData: (silent?: boolean) => Promise<void>;
  triggerSuccess: (msg: string) => void;
  triggerError: (msg: string) => void;
}

export const AiAgentBuilderTab: React.FC<AiAgentBuilderTabProps> = ({
  token,
  setActiveTab,
  fetchAllData,
  triggerSuccess,
  triggerError,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: "bot",
      text: "Hello! I am your AI Agent Architect. Tell me what kind of calling assistant you want to build (e.g. an inbound office receptionist or an outbound sales caller), and I'll generate the professional prompts and configurations for you instantly!"
    }
  ]);

  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [submittingAgent, setSubmittingAgent] = useState(false);

  // Currently active parsed agent state for the right preview panel
  const [previewAgent, setPreviewAgent] = useState<ExtractedAgent | null>(null);

  // RAG / Knowledge Base states
  const [kbFile, setKbFile] = useState<File | null>(null);

  // Selected language state
  const [selectedLang, setSelectedLang] = useState("ENGLISH (US)");

  // Count user messages
  const userMessageCount = messages.filter(m => m.sender === "user").length;

  // Submit chat message to FastAPI builder endpoint
  const handleSendMessage = async (textToSend: string) => {
    const msg = textToSend.trim();
    if (!msg) return;

    // Append user message
    const updatedMessages = [...messages, { sender: "user" as const, text: msg }];
    setMessages(updatedMessages);
    setInputText("");
    setLoading(true);

    try {
      const payload = {
        message: msg,
        history: messages.map(m => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.text
        }))
      };

      const res = await apiFetch<BuilderChatResponse>("/dashboard/ai-builder/chat", "POST", payload, token);

      if (res && res.status === "success") {
        const botReply: ChatMessage = {
          sender: "bot",
          text: res.reply,
          extracted: res.extracted_agent
        };
        setMessages([...updatedMessages, botReply]);

        // Populate current live preview state
        if (res.extracted_agent) {
          setPreviewAgent(res.extracted_agent);
        }
      } else {
        triggerError("Could not retrieve AI architecture parameters.");
      }
    } catch (err) {
      console.error(err);
      triggerError("Network pipeline failure during prompt synthesis.");
    } finally {
      setLoading(false);
    }
  };

  // Compile and Save the agent into SQLite db via FastAPI POST /dashboard/agents
  const handleSaveAndCreateAgent = async () => {
    if (!previewAgent) return;
    setSubmittingAgent(true);

    try {
      let finalKbId: number | null = null;

      // 1. Create a new Knowledge Base if a file was attached
      if (kbFile) {
        const kbName = `${previewAgent.name.trim()} KB`;
        const kbRes = await apiFetch<{ status: string; id: number; name: string }>(
          "/dashboard/knowledge-bases", "POST",
          { name: kbName, description: `Automatically created Knowledge Base for ${previewAgent.name}` },
          token
        );
        if (kbRes?.id) {
          finalKbId = kbRes.id;
          await apiUpload(
            `/dashboard/knowledge-bases/${kbRes.id}/documents/upload`,
            kbFile,
            token
          );
        }
      }

      // Map extracted neural voice names to DB-supported Voice IDs
      let voiceId = "female"; // Default voice ID mapping
      if (previewAgent.voice_name.toLowerCase().includes("corey") || previewAgent.voice_name.toLowerCase().includes("puck") || previewAgent.voice_name.toLowerCase().includes("daniel") || previewAgent.voice_name.toLowerCase().includes("male")) {
        voiceId = "male";
      }

      const payload = {
        name: previewAgent.name,
        voice_id: voiceId,
        voice_provider: "gemini",
        prompt_system: previewAgent.system_prompt,
        first_message: previewAgent.first_message,
        temperature: 0.7,
        lang: selectedLang,
        last_active: "Last active: Just now",
        performance_score: 95.0,
        performance_grade: "A",
        hubspot_connected: true,
        calendly_connected: false,
        kb_id: finalKbId
      };

      const res = await apiFetch<CreateAgentResponse>("/dashboard/agents", "POST", payload, token);
      if (res && res.status === "success") {
        triggerSuccess(`AI Agent "${previewAgent.name}" compiled and saved to database successfully!`);
        await fetchAllData(true);
        // Switch vendor side tab to AI Agents automatically
        setActiveTab("agents");
      } else {
        triggerError("FastAPI agent compiler refused payload.");
      }
    } catch (err) {
      console.error(err);
      triggerError("Failed to store calling agent in database.");
    } finally {
      setSubmittingAgent(false);
    }
  };

  // Export current extracted system prompt to clipboard
  const handleExportPrompt = () => {
    if (!previewAgent?.system_prompt) {
      triggerError("No prompt exists to export. Build one first.");
      return;
    }
    navigator.clipboard.writeText(previewAgent.system_prompt);
    triggerSuccess("System prompt instructions copied to clipboard!");
  };

  // Clear workspace history
  const handleClearWorkspace = () => {
    setMessages([
      {
        sender: "bot",
        text: "Hello! I am your AI Agent Architect. Tell me what kind of calling assistant you want to build (e.g. an inbound office receptionist or an outbound sales caller), and I'll generate the professional prompts and configurations for you instantly!"
      }
    ]);
    setPreviewAgent(null);
    setSelectedLang("ENGLISH (US)");
    setKbFile(null);
    triggerSuccess("Workspace conversation history cleared.");
  };

  const handleLoadDefault = () => {
    setPreviewAgent({
      name: "Default Assistant",
      system_prompt: "You are a helpful and professional customer service assistant. You will answer questions clearly and concisely.",
      first_message: "Hello! How can I help you today?",
      voice_name: "Sarah - Professional",
      config_mode: "INBOUND"
    });
    setSelectedLang("ENGLISH (US)");
    setKbFile(null);
    triggerSuccess("Loaded default configuration. You can now save the agent.");
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">

      {/* Top Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-950 tracking-tight flex items-center space-x-2.5">
            <Sparkles className="w-6 h-6 text-blue-600 animate-pulse" />
            <span>AI Agent Builder</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Tutor our AI builder progressively via conversation to generate complete system instructions, neural voices, and routing parameters.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleLoadDefault}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-extrabold rounded-xl transition cursor-pointer"
          >
            Default
          </button>
          <button
            onClick={handleSaveAndCreateAgent}
            disabled={submittingAgent || !previewAgent}
            className="px-8 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-450 text-white text-xs font-extrabold rounded-xl transition shadow-sm cursor-pointer disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {submittingAgent && <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />}
            <span>{submittingAgent ? "Saving..." : "Save"}</span>
          </button>
        </div>
      </div>

      {/* Grid Layout: Left Conversational Builder, Right Progressive Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT PANEL: LLM Chat Workspace (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden flex flex-col h-[650px] justify-between">

          {/* Workspace Header */}
          <div className="h-14 px-5 border-b border-slate-100 flex items-center justify-between select-none">
            <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
              <span>Create with AI</span>
            </span>

            <div className="flex items-center space-x-3.5">
              <button
                onClick={handleExportPrompt}
                className="text-[10px] font-bold text-slate-550 hover:text-blue-600 flex items-center space-x-1 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Prompt</span>
              </button>

              <button
                onClick={handleClearWorkspace}
                className="text-[10px] font-bold text-slate-550 hover:text-rose-600 flex items-center space-x-1 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Messages Stream Scroll Box */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/40">
            {messages.map((msg, index) => {
              const isUser = msg.sender === "user";
              return (
                <div key={index} className={`flex space-x-3 ${isUser ? "justify-end" : "justify-start"}`}>

                  {/* Avatar Icon */}
                  {!isUser && (
                    <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-150 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs select-none">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div className={`max-w-[80%] p-3.5 rounded-2xl text-xs font-semibold leading-relaxed shadow-3xs ${isUser
                      ? "bg-blue-600 text-white rounded-tr-none"
                      : "bg-white border border-slate-200 text-slate-800 rounded-tl-none"
                    }`}>
                    {msg.text}
                  </div>

                  {isUser && (
                    <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center shrink-0 shadow-2xs select-none">
                      <User className="w-4 h-4" />
                    </div>
                  )}

                </div>
              );
            })}

            {/* Simulated generation loading state */}
            {loading && (
              <div className="flex space-x-3 justify-start animate-pulse">
                <div className="w-7 h-7 rounded-full bg-blue-550/20 text-blue-650 flex items-center justify-center shrink-0">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-white border border-slate-200 text-slate-400 p-3.5 rounded-2xl rounded-tl-none text-xs font-bold font-mono">
                  AGENT ARCHITECT ANALYZING PROMPT SCHEMAS...
                </div>
              </div>
            )}
            {userMessageCount >= 3 && (
              <div className="p-3.5 bg-amber-50 border border-amber-250/70 rounded-xl text-amber-900 text-xs font-semibold flex items-start space-x-2.5 animate-fade-in select-none">
                <ShieldAlert className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-extrabold">Maximum Refinements Reached</p>
                  <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                    You have progressive-tapped our builder 3 times to construct this agent. Please inspect the extracted configuration on the right and click &quot;Save & Create Agent&quot; to compile.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Input Panel Footer */}
          <div className="border-t border-slate-100 p-4 select-none bg-white">

            {/* Input Row */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputText);
              }}
              className="flex items-center space-x-3.5"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={loading || userMessageCount >= 3}
                placeholder={userMessageCount >= 3 ? "Prompt limit reached. Save agent on the right." : "Ask a follow-up or refine your agent's system prompt..."}
                className="flex-1 h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-600 outline-none transition-all shadow-inner disabled:opacity-60 disabled:cursor-not-allowed"
              />

              <button
                type="submit"
                disabled={loading || !inputText.trim() || userMessageCount >= 3}
                className="w-11 h-11 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl flex items-center justify-center transition-all shadow-sm active:scale-95 cursor-pointer shrink-0 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT PANEL: Agent Progressive Preview Card (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between min-h-[480px]">

            {/* Box Header */}
            <div className="h-14 px-5 border-b border-slate-100 flex items-center justify-between select-none">
              <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Agent Live Preview
              </span>

              <span className="text-[10px] text-slate-400 font-bold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-sm uppercase font-mono">
                Extracted State
              </span>
            </div>

            {/* Progressive Card list */}
            <div className="p-5 space-y-4 flex-1">
              {previewAgent ? (
                <div className="space-y-4 animate-fade-in text-xs font-semibold text-slate-800">

                  {/* Name field */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5 text-left relative overflow-hidden group">
                    <label className="text-[9px] text-slate-455 font-extrabold uppercase tracking-widest font-mono block">
                      Agent Name
                    </label>
                    <input
                      type="text"
                      value={previewAgent.name}
                      onChange={(e) => setPreviewAgent({ ...previewAgent, name: e.target.value })}
                      className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-3xs"
                    />
                  </div>

                  {/* System Prompt Instructions */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5 text-left">
                    <label className="text-[9px] text-slate-455 font-extrabold uppercase tracking-widest font-mono block">
                      System instructions (Core LLM Prompt)
                    </label>
                    <textarea
                      value={previewAgent.system_prompt}
                      onChange={(e) => setPreviewAgent({ ...previewAgent, system_prompt: e.target.value })}
                      rows={6}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-3xs resize-y leading-relaxed"
                    />
                  </div>

                  {/* First Message Greeting */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5 text-left">
                    <label className="text-[9px] text-slate-455 font-extrabold uppercase tracking-widest font-mono block">
                      First Message (Greeting)
                    </label>
                    <textarea
                      value={previewAgent.first_message}
                      onChange={(e) => setPreviewAgent({ ...previewAgent, first_message: e.target.value })}
                      rows={2}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-3xs resize-none leading-relaxed"
                    />
                  </div>

                  {/* Knowledge Base / RAG Document */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2.5 text-left">
                    <span className="text-[9px] text-slate-455 font-extrabold uppercase tracking-widest font-mono block">
                      Upload RAG Document
                    </span>

                    <div className="space-y-1.5 text-xs">
                      <div className="relative border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-white cursor-pointer hover:bg-slate-50/50 transition">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.txt"
                          onChange={(e) => setKbFile(e.target.files?.[0] || null)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <UploadCloud className="w-6 h-6 text-slate-400 mb-1" />
                        {kbFile ? (
                          <p className="text-xs font-bold text-slate-800">{kbFile.name}</p>
                        ) : (
                          <p className="text-[10px] text-slate-450 font-normal">PDF, Word, or Text (10MB max)</p>
                        )}
                      </div>
                      <p className="text-[9px] text-slate-455 font-medium leading-relaxed">
                        Attach a document to inject custom knowledge/FAQ so your agent answers questions based on it.
                      </p>
                    </div>
                  </div>
                  {/* Primary Language */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5 text-left">
                    <label className="text-[9px] text-slate-455 font-extrabold uppercase tracking-widest font-mono block">
                      Agent Primary Language
                    </label>
                    <div className="relative">
                      <select
                        value={selectedLang}
                        onChange={(e) => setSelectedLang(e.target.value)}
                        className="w-full h-9 pl-3.5 pr-10 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-3xs cursor-pointer appearance-none animate-fade-in"
                      >
                        {["ENGLISH (US)", "HINDI", "BENGALI", "GUJARATI", "KANNADA", "MALAYALAM", "MARATHI", "PUNJABI", "TAMIL", "TELUGU"].map((l) => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                        <span className="text-[8px]">▼</span>
                      </div>
                    </div>
                    <p className="text-[9px] text-slate-400 font-medium leading-relaxed">
                      Select the primary language this agent will use for conversations.
                    </p>
                  </div>

                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-20 text-slate-400 select-none space-y-3">
                  <Bot className="w-12 h-12 text-slate-300 animate-pulse" />
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-500 block">Waiting for AI parameters...</span>
                    <span className="text-[10px] text-slate-400 block max-w-xs font-normal">
                      Initiate a request on the left workspace panel to compile prompt configurations.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Save CTA Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 select-none">
              <button
                onClick={handleSaveAndCreateAgent}
                disabled={submittingAgent || !previewAgent}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-450 text-xs font-extrabold text-white rounded-xl transition-all flex items-center justify-center space-x-2 active:scale-[0.98] cursor-pointer shadow-sm disabled:cursor-not-allowed"
              >
                {submittingAgent ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Compiling Agent Vectors...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save & Create AI Calling Agent</span>
                  </>
                )}
              </button>
            </div>

          </div>

          {/* Quality Safe-Guard Notice Card removed */}
        </div>

      </div>

    </div>
  );
};
