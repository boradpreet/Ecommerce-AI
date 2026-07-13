"use client";

import React, { useState, useEffect, useRef } from "react";
import { useOnboardingStore } from "src/store/useOnboardingStore";
import { 
  FileUp, Globe, ClipboardSignature, FileText, CheckCircle2,
  Hourglass, Plus, Trash2, CheckCheck, Sparkles, X
} from "lucide-react";

// Shared progress calculation — also used by onboarding/page.tsx validator
export const computeKbProgress = (
  files: string[],
  urls: string[],
  faqs: string
): number => {
  let score = 0;
  // Files: first file = 35%, each additional = 10% (cap at 55%)
  if (files.length >= 1) score += 35;
  if (files.length >= 2) score += 10;
  if (files.length >= 3) score += 10;
  // URLs: first = 25%, each additional = 5% (cap at 35%)
  if (urls.length >= 1) score += 25;
  if (urls.length >= 2) score += 5;
  if (urls.length >= 3) score += 5;
  // FAQs text: 25% if >= 20 chars, +5% if >= 100 chars
  if (faqs.trim().length >= 20) score += 20;
  if (faqs.trim().length >= 100) score += 5;
  return Math.min(100, score);
};

interface InlineToast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

let toastId = 0;

export const StepKB: React.FC = () => {
  const { kbFiles, kbUrls, kbFaqs, addKbFile, addKbUrl, setKbFaqs, triggerToast } = useOnboardingStore();
  const [urlInput, setUrlInput] = useState("");
  const [localToasts, setLocalToasts] = useState<InlineToast[]>([]);
  const [animatingProgress, setAnimatingProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const targetProgress = computeKbProgress(kbFiles, kbUrls, kbFaqs);

  // Smoothly animate progress bar toward target
  useEffect(() => {
    if (animatingProgress === targetProgress) return;
    const step = targetProgress > animatingProgress ? 1 : -1;
    const timer = setTimeout(() => {
      setAnimatingProgress((prev) => {
        const next = prev + step;
        if (step > 0 && next >= targetProgress) return targetProgress;
        if (step < 0 && next <= targetProgress) return targetProgress;
        return next;
      });
    }, 12);
    return () => clearTimeout(timer);
  }, [animatingProgress, targetProgress]);

  const pushToast = (message: string, type: InlineToast["type"]) => {
    const id = ++toastId;
    setLocalToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setLocalToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      pushToast("File too large. Maximum size is 50MB.", "error");
      triggerToast("File too large. Maximum size is 50MB.", "error");
      return;
    }

    addKbFile(file.name);
    pushToast(`📄 "${file.name}" uploaded and queued for indexing.`, "success");
    triggerToast(`"${file.name}" added to knowledge base!`, "success");

    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUrlFetch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) {
      pushToast("Please enter a valid URL before fetching.", "error");
      return;
    }
    addKbUrl(urlInput.trim());
    pushToast(`🌐 "${urlInput.trim()}" queued for web crawl and indexing.`, "success");
    triggerToast(`URL "${urlInput.trim()}" added to knowledge base!`, "success");
    setUrlInput("");
  };

  const handleFaqChange = (value: string) => {
    setKbFaqs(value);
    if (value.trim().length === 20) {
      pushToast("✅ FAQ content saved and indexed.", "success");
      triggerToast("FAQ content added to knowledge base!", "success");
    }
  };

  const removeFile = (index: number) => {
    const name = kbFiles[index];
    // Directly mutate store state via setBusinessDetails workaround — remove by index
    const next = kbFiles.filter((_, i) => i !== index);
    useOnboardingStore.getState().setBusinessDetails({ kbFiles: next });
    pushToast(`🗑️ "${name}" removed from knowledge base.`, "info");
  };

  const removeUrl = (index: number) => {
    const url = kbUrls[index];
    const next = kbUrls.filter((_, i) => i !== index);
    useOnboardingStore.getState().setBusinessDetails({ kbUrls: next });
    pushToast(`🗑️ "${url}" removed from knowledge base.`, "info");
  };

  const isComplete = targetProgress >= 100;

  const progressColor = isComplete
    ? "bg-emerald-500"
    : animatingProgress >= 60
    ? "bg-blue-600"
    : "bg-blue-500";

  const totalSources = kbFiles.length + kbUrls.length + (kbFaqs.trim().length > 20 ? 1 : 0);

  return (
    <div className="w-full space-y-6 text-slate-800 text-left animate-fade-in">

      {/* Inline Toasts Stack */}
      <div className="fixed top-5 right-5 z-[9999] space-y-2 pointer-events-none">
        {localToasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center space-x-3 px-4 py-3 rounded-xl border shadow-xl text-xs font-semibold backdrop-blur-md animate-fade-in pointer-events-auto max-w-sm ${
              t.type === "success"
                ? "bg-white border-emerald-200 text-slate-800"
                : t.type === "error"
                ? "bg-white border-red-200 text-slate-800"
                : "bg-white border-blue-200 text-slate-800"
            }`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              t.type === "success" ? "bg-emerald-500" : t.type === "error" ? "bg-red-500" : "bg-blue-500"
            }`} />
            <span className="flex-1 leading-relaxed">{t.message}</span>
            <button
              onClick={() => setLocalToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="text-slate-400 hover:text-slate-700 cursor-pointer outline-none shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Title */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-slate-950 tracking-tight">Knowledge Base Upload</h2>
        <p className="text-xs text-slate-500 font-medium">
          Your AI will use this data to answer customer questions accurately. Add files, URLs, and FAQs to reach 100% indexing and unlock Continue.
        </p>
      </div>

      {/* 3 Columns Option Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Col 1: Upload Files */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <FileUp className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Upload Files</h4>
              {kbFiles.length > 0 && (
                <span className="ml-auto text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                  {kbFiles.length} file{kbFiles.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
              PDF, DOCX, or TXT files up to 50MB.
            </p>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-xl p-5 flex flex-col items-center justify-center bg-slate-50 hover:bg-blue-50/30 transition-all cursor-pointer text-center group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <FileUp className="w-6 h-6 text-slate-400 group-hover:text-blue-500 mb-1.5 transition-colors" />
            <span className="text-[10px] font-bold text-slate-600 group-hover:text-blue-700 transition-colors">
              Drag and drop files
            </span>
            <span className="text-[8px] text-slate-400 font-semibold mt-0.5">or click to browse</span>
          </div>
        </div>

        {/* Col 2: Website Crawl */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <Globe className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Website Crawl</h4>
              {kbUrls.length > 0 && (
                <span className="ml-auto text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                  {kbUrls.length} URL{kbUrls.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
              Sync data from your help center or site.
            </p>
          </div>

          <form onSubmit={handleUrlFetch} className="space-y-2">
            <input
              type="url"
              placeholder="https://docs.company.com"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[10px] text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 font-mono"
            />
            <button
              type="submit"
              className="w-full h-8 rounded-md bg-slate-100 hover:bg-blue-50 hover:border-blue-300 text-[10px] font-bold text-slate-700 hover:text-blue-700 transition-all flex items-center justify-center space-x-1 border border-slate-200 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Fetch URLs</span>
            </button>
          </form>
        </div>

        {/* Col 3: Paste FAQs */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <ClipboardSignature className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Paste FAQs</h4>
              {kbFaqs.trim().length >= 20 && (
                <span className="ml-auto text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                  Saved
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
              Directly input Q&A pairs for precision.
            </p>
          </div>

          <textarea
            rows={4}
            value={kbFaqs}
            onChange={(e) => handleFaqChange(e.target.value)}
            placeholder={"Q: What is your support mail?\nA: contact@company.com..."}
            className="flex w-full rounded-lg border border-slate-200 bg-white p-2.5 text-[9px] text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 resize-none font-mono min-h-[74px]"
          />
        </div>

      </div>

      {/* ─── Dynamic Indexing Progress Bar ─── */}
      <div className={`rounded-xl border p-5 space-y-3 transition-all duration-500 ${
        isComplete
          ? "bg-emerald-50/60 border-emerald-200 shadow-sm"
          : "bg-slate-50 border-slate-200 shadow-inner"
      }`}>
        <div className="flex justify-between items-center text-xs">
          <span className={`font-bold flex items-center space-x-2 ${isComplete ? "text-emerald-700" : "text-slate-900"}`}>
            {isComplete ? (
              <>
                <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Knowledge Base Fully Indexed!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-blue-500 animate-pulse shrink-0" />
                <span>Indexing Knowledge Base...</span>
              </>
            )}
          </span>
          <span className={`font-black text-sm tabular-nums ${isComplete ? "text-emerald-600" : "text-blue-600"}`}>
            {animatingProgress}%
          </span>
        </div>

        {/* Progress Track */}
        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${progressColor} ${isComplete ? "shadow-[0_0_8px_rgba(16,185,129,0.5)]" : ""}`}
            style={{ width: `${animatingProgress}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
            {totalSources > 0
              ? `Optimizing ${totalSources} source${totalSources > 1 ? "s" : ""} for AI inference`
              : "Add files, URLs, or FAQs to begin indexing"}
          </p>
          {!isComplete && (
            <p className="text-[9px] text-slate-400 font-bold">
              {100 - targetProgress}% remaining to unlock Continue
            </p>
          )}
          {isComplete && (
            <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-wide">
              ✓ Continue unlocked
            </p>
          )}
        </div>

        {/* Progress breakdown chips */}
        {totalSources > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {kbFiles.length > 0 && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700">
                {kbFiles.length} file{kbFiles.length > 1 ? "s" : ""} (+{Math.min(55, 35 + (kbFiles.length > 1 ? 10 : 0) + (kbFiles.length > 2 ? 10 : 0))}%)
              </span>
            )}
            {kbUrls.length > 0 && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700">
                {kbUrls.length} URL{kbUrls.length > 1 ? "s" : ""} (+{Math.min(35, 25 + (kbUrls.length > 1 ? 5 : 0) + (kbUrls.length > 2 ? 5 : 0))}%)
              </span>
            )}
            {kbFaqs.trim().length >= 20 && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                FAQs (+{kbFaqs.trim().length >= 100 ? 25 : 20}%)
              </span>
            )}
          </div>
        )}
      </div>

      {/* ─── Indexed Data Sources List ─── */}
      {(kbFiles.length > 0 || kbUrls.length > 0) && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Indexed Data Sources ({kbFiles.length + kbUrls.length})
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Uploaded Files */}
            {kbFiles.map((file, i) => (
              <div key={`file-${i}`} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between group">
                <div className="flex items-center space-x-2.5 truncate">
                  <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                  <div className="truncate text-left">
                    <p className="text-xs font-bold text-slate-900 truncate">{file}</p>
                    <p className="text-[9px] font-bold text-emerald-600 mt-0.5">INDEXED ✓</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="p-1 text-slate-300 hover:text-red-500 cursor-pointer outline-none transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Web Scrapes */}
            {kbUrls.map((url, i) => (
              <div key={`url-${i}`} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between group">
                <div className="flex items-center space-x-2.5 truncate">
                  <Globe className="w-4 h-4 text-blue-600 shrink-0" />
                  <div className="truncate text-left">
                    <p className="text-xs font-bold text-slate-900 truncate">{url}</p>
                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">WEB CRAWL • PENDING</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <Hourglass className="w-3.5 h-3.5 text-slate-400 animate-pulse" />
                  <button
                    type="button"
                    onClick={() => removeUrl(i)}
                    className="p-1 text-slate-300 hover:text-red-500 cursor-pointer outline-none transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state hint */}
      {kbFiles.length === 0 && kbUrls.length === 0 && kbFaqs.trim().length === 0 && (
        <div className="text-center py-4 text-[10px] text-slate-400 font-semibold">
          Upload at least one file, URL, or FAQ to begin building your knowledge base.
        </div>
      )}

    </div>
  );
};
