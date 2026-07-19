"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Search, FileUp, Users, CheckCircle2, AlertCircle, X, Check, Loader2, Phone, Target, ChevronRight, Database, Link2, FileSpreadsheet, FileJson, ChevronDown, Mail } from "lucide-react";
import { apiFetch } from "src/lib/api";
import { FilterMenu } from "src/components/dashboard/filter-menu";
import * as XLSX from "xlsx";
import { formatPhone } from "src/lib/format";
import { LeadListManagerModal } from "src/components/dashboard/lead-list-manager-modal";

interface LeadList {
  id: number;
  campaign_name: string;
  total_leads: number;
  pending_leads: number;
  called_leads: number;
  dnc_leads: number;
  last_called: string;
  created_at: string;
}

interface LeadsTabProps {
  leads: LeadList[];
  token: string;
  fetchAllData: (silent?: boolean) => Promise<void>;
  triggerSuccess: (msg: string) => void;
  triggerError: (msg: string) => void;
}

const formatOptions = [
  { value: "google_sheet", label: "Google Sheet Link", icon: Link2, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
  { value: "sqlite", label: "SQLite Database (.db)", icon: Database, color: "text-blue-600 bg-blue-50 border-blue-100" },
  { value: "csv", label: "CSV Spreadsheet (.csv)", icon: FileSpreadsheet, color: "text-amber-600 bg-amber-50 border-amber-100" },
  { value: "excel", label: "Excel Document (.xlsx)", icon: FileSpreadsheet, color: "text-green-600 bg-green-50 border-green-100" },
  { value: "json", label: "JSON Data (.json)", icon: FileJson, color: "text-purple-600 bg-purple-50 border-purple-100" },
  { value: "pdf_docx", label: "PDF / Word Document (.pdf, .docx, .txt)", icon: FileUp, color: "text-rose-600 bg-rose-50 border-rose-100" }
];

export const LeadsTab: React.FC<LeadsTabProps> = ({
  leads,
  token,
  fetchAllData,
  triggerSuccess,
  triggerError,
}) => {
  const [mounted, setMounted] = useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [leadFilters, setLeadFilters] = useState<Record<string, string>>({ status: "all" });
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadPhone, setNewLeadPhone] = useState("");
  const [newLeadEmail, setNewLeadEmail] = useState("");
  const [leadStatus, setLeadStatus] = useState("PENDING");
  const [leadCampaign, setLeadCampaign] = useState("Solar Outreach Q3");
  const [submitting, setSubmitting] = useState(false);

  // Initialize the search box from the URL "search" param once on mount.
  // (No polling — a setInterval here would overwrite what the user types.)
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search).get("search") || "";
    if (q) setSearchQuery(q);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (val) params.set("search", val);
      else params.delete("search");
      const qs = params.toString();
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${qs ? "?" + qs : ""}`);
    }
  };

  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);

  // Edit list states
  const [editList, setEditList] = useState<LeadList | null>(null);
  const [manageList, setManageList] = useState<LeadList | null>(null);
  const [editCampaignName, setEditCampaignName] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete list states
  const [deleteListId, setDeleteListId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Import list states
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [rawParsedLeads, setRawParsedLeads] = useState<any[]>([]);
  const [defaultCountryCode, setDefaultCountryCode] = useState("");

  const parsedLeads = React.useMemo(() => {
    return rawParsedLeads.map((l) => {
      let phone = (l.phone_number || "").toString().trim().replace(/[\s-()]/g, "");
      if (defaultCountryCode && defaultCountryCode !== "none" && !phone.startsWith("+")) {
        const codeDigits = defaultCountryCode.replace("+", "");
        let hasCountryCode = false;
        if (phone.startsWith(codeDigits)) {
          const remainingLength = phone.length - codeDigits.length;
          if (codeDigits === "91") {
            // For India, a valid national mobile number is 10 digits.
            // If the remaining length is 10 digits or more, the input already contains the country code prefix.
            hasCountryCode = remainingLength >= 10;
          } else if (codeDigits === "1") {
            // For US/Canada, a valid national number is 10 digits.
            hasCountryCode = remainingLength >= 10;
          } else {
            // Generic fallback: if remaining length is 8 or more, it likely has the country code prefix.
            hasCountryCode = remainingLength >= 8;
          }
        }

        if (hasCountryCode) {
          phone = "+" + phone;
        } else {
          phone = defaultCountryCode + phone;
        }
      }
      return { ...l, phone_number: phone };
    });
  }, [rawParsedLeads, defaultCountryCode]);

  const [importFileName, setImportFileName] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [customCampaignName, setCustomCampaignName] = useState("");

  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);
  const [catalogCategories, setCatalogCategories] = useState<any[]>([]);
  const [leadDefaultCategory, setLeadDefaultCategory] = useState<string>("");
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [importCategory, setImportCategory] = useState("");
  const [importSubcategory, setImportSubcategory] = useState("");
  const [dbFiles, setDbFiles] = useState<File[]>([]);
  const [uploadingDb, setUploadingDb] = useState(false);
  const [dbUploaded, setDbUploaded] = useState(false);

  // Database checks & format states
  const [dbExists, setDbExists] = useState(false);
  const [existingDbFiles, setExistingDbFiles] = useState<string[]>([]);
  const [checkingDb, setCheckingDb] = useState(false);
  const [dbProcessing, setDbProcessing] = useState<{
    status: string;
    row_count?: number;
    vector_chunks?: number;
    index_status?: string;
  } | null>(null);
  const [dbUploadStage, setDbUploadStage] = useState<string>("");
  const [selectedDbFormat, setSelectedDbFormat] = useState("google_sheet");
  const [googleSheetUrl, setGoogleSheetUrl] = useState("");
  const [showUploadUI, setShowUploadUI] = useState(false);
  const [formatDropdownOpen, setFormatDropdownOpen] = useState(false);
  const [dbImportMode, setDbImportMode] = useState<"upload" | "link">("link");

  const checkExistingDatabase = async (cat: string, sub: string) => {
    setCheckingDb(true);
    setImportError(null);
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5011/api/v1";
      const url = `${API_BASE_URL}/dashboard/leads/check-database?category=${encodeURIComponent(cat)}&subcategory=${encodeURIComponent(sub)}`;
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(url, { headers });
      if (response.ok) {
        const data = await response.json();
        setDbExists(data.exists);
        setExistingDbFiles(data.files || []);
        setDbProcessing(data.processing || null);
        setShowUploadUI(!data.exists);
        setDbUploaded(data.exists);
      } else {
        setDbExists(false);
        setExistingDbFiles([]);
        setDbProcessing(null);
        setShowUploadUI(true);
        setDbUploaded(false);
      }
    } catch (err) {
      console.error("Error checking database", err);
      setDbExists(false);
      setExistingDbFiles([]);
      setDbProcessing(null);
      setShowUploadUI(true);
      setDbUploaded(false);
    } finally {
      setCheckingDb(false);
    }
  };

  const fetchCatalogCategories = async () => {
    if (!token) return;
    setLoadingCategories(true);
    try {
      const data = await apiFetch<any>("/dashboard/agent-catalog/options", "GET", undefined, token);
      if (data?.categories) {
        setCatalogCategories(data.categories);
      }
      // Vendors only see the industry they picked at onboarding — pre-select it.
      if (data?.default_category) {
        setLeadDefaultCategory(data.default_category);
        setImportCategory((prev) => prev || data.default_category);
      }
    } catch (err) {
      console.error("Failed to load catalog categories", err);
    } finally {
      setLoadingCategories(false);
    }
  };

  React.useEffect(() => {
    if (importModalOpen) {
      fetchCatalogCategories();
      setImportStep(1);
      setImportCategory("");
      setImportSubcategory("");
      setDbFiles([]);
      setDbUploaded(false);
      setRawParsedLeads([]);
      setDefaultCountryCode("");
      setImportFileName("");
      setImportError(null);
      setCustomCampaignName("");
      setDbExists(false);
      setExistingDbFiles([]);
      setSelectedDbFormat("google_sheet");
      setGoogleSheetUrl("");
      setDbImportMode("link");
      setShowUploadUI(false);
      setFormatDropdownOpen(false);
    }
  }, [importModalOpen]);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName || !newLeadPhone) return;
    setSubmitting(true);

    const payload = {
      name: newLeadName,
      phone_number: newLeadPhone,
      email: newLeadEmail || null,
      status: leadStatus,
      campaign: leadCampaign
    };

    try {
      const res = await apiFetch("/dashboard/leads", "POST", payload, token);
      if (res) {
        setNewLeadName("");
        setNewLeadPhone("");
        setNewLeadEmail("");
        setDrawerOpen(false);
        triggerSuccess(`Lead "${payload.name}" committed to list "${payload.campaign}" successfully!`);
        fetchAllData(true);
      }
    } catch (err) {
      console.error(err);
      triggerError("Failed to commit lead into dialer database.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editList || !editCampaignName) return;
    setEditSubmitting(true);

    const payload = {
      campaign: editCampaignName,
    };

    try {
      const res = await apiFetch(`/dashboard/leads/${editList.id}`, "PUT", payload, token);
      if (res) {
        setEditList(null);
        triggerSuccess(`Lead list renamed to "${payload.campaign}" successfully!`);
        fetchAllData(true);
      }
    } catch (err) {
      console.error(err);
      triggerError("Failed to rename lead list.");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteList = async () => {
    if (!deleteListId) return;
    setDeleting(true);

    try {
      await apiFetch(`/dashboard/leads/${deleteListId}`, "DELETE", undefined, token);
      setDeleteListId(null);
      triggerSuccess("Lead list deleted successfully!");
      fetchAllData(true);
    } catch (err) {
      console.error(err);
      triggerError("Failed to delete lead list.");
    } finally {
      setDeleting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportError(null);

    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    setCustomCampaignName(baseName);

    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        if (isExcel) {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

          if (jsonData.length < 2) {
            throw new Error("Excel file must have a header row and at least one data row");
          }

          // Headers are the first row
          const headers = jsonData[0].map((h: any) => String(h ?? "").trim().toLowerCase());
          const nameIdx = headers.findIndex(h =>
            h.includes("name") ||
            h.includes("customer") ||
            h.includes("client") ||
            h.includes("lead") ||
            h.includes("person") ||
            h.includes("first") ||
            h.includes("last") ||
            h.includes("contact")
          );
          const phoneIdx = headers.findIndex((h, idx) =>
            h.includes("phone") ||
            h.includes("number") ||
            h.includes("num") ||
            h.includes("tel") ||
            h.includes("mobile") ||
            h.includes("cell") ||
            h.includes("call") ||
            (h.includes("contact") && idx !== nameIdx)
          );
          const statusIdx = headers.findIndex(h => h.includes("status"));
          const emailIdx = headers.findIndex(h => h.includes("email") || h.includes("mail"));

          if (nameIdx === -1 || phoneIdx === -1) {
            throw new Error("Failed to find customer name and number columns. Please re-upload a proper Excel/CSV file with clear Name and Phone Number headers.");
          }

          const mapped: any[] = [];
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;

            const name = String(row[nameIdx] ?? "").trim();
            const phone_number = formatPhone(row[phoneIdx]).trim();
            const status = (statusIdx !== -1 && row[statusIdx] ? String(row[statusIdx]).trim() : "PENDING").toUpperCase();
            const email = (emailIdx !== -1 && row[emailIdx] ? String(row[emailIdx]).trim() : "");
            const campaign = baseName;

            if (!name || !phone_number) {
              continue;
            }

            mapped.push({ name, phone_number, email, status, campaign });
          }

          if (mapped.length === 0) {
            throw new Error("Failed to find customer name and number columns in any row. Please re-upload a proper Excel/CSV file.");
          }

          setRawParsedLeads(mapped);
        } else {
          const text = event.target?.result as string;
          if (!text) {
            throw new Error("File is empty");
          }

          if (file.name.endsWith(".json")) {
            const parsed = JSON.parse(text);
            if (!Array.isArray(parsed)) {
              throw new Error("JSON file must contain an array of leads");
            }

            const mapped = parsed.map((item: any) => {
              const itemKeys = Object.keys(item);
              const normalizedKeys = itemKeys.map(k => k.trim().toLowerCase());

              const nameKeyIdx = normalizedKeys.findIndex(k =>
                k.includes("name") ||
                k.includes("customer") ||
                k.includes("client") ||
                k.includes("lead") ||
                k.includes("person") ||
                k.includes("first") ||
                k.includes("last") ||
                k.includes("contact")
              );

              const phoneKeyIdx = normalizedKeys.findIndex((k, idx) =>
                k.includes("phone") ||
                k.includes("number") ||
                k.includes("num") ||
                k.includes("tel") ||
                k.includes("mobile") ||
                k.includes("cell") ||
                k.includes("call") ||
                (k.includes("contact") && idx !== nameKeyIdx)
              );

              const name = nameKeyIdx !== -1 ? String(item[itemKeys[nameKeyIdx]] ?? "").trim() : "";
              const phone_number = phoneKeyIdx !== -1 ? formatPhone(item[itemKeys[phoneKeyIdx]]).trim() : "";

              const emailKeyIdx = normalizedKeys.findIndex(k => k.includes("email") || k.includes("mail"));
              const email = emailKeyIdx !== -1 ? String(item[itemKeys[emailKeyIdx]] ?? "").trim() : "";

              const statusKeyIdx = normalizedKeys.findIndex(k => k.includes("status"));
              const status = (statusKeyIdx !== -1 && item[itemKeys[statusKeyIdx]] ? String(item[itemKeys[statusKeyIdx]]).trim() : "PENDING").toUpperCase();

              const campaign = baseName;

              if (!name || !phone_number) {
                throw new Error("Failed to find customer name and number columns in JSON object. Please ensure all objects contain client/name and phone/number properties.");
              }

              return { name, phone_number, email, status, campaign };
            });

            setRawParsedLeads(mapped);
          } else if (file.name.endsWith(".csv")) {
            const lines = text.split(/\r?\n/);
            if (lines.length < 2) {
              throw new Error("CSV file must have a header row and at least one data row");
            }

            const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/["']/g, ""));
            const nameIdx = headers.findIndex(h =>
              h.includes("name") ||
              h.includes("customer") ||
              h.includes("client") ||
              h.includes("lead") ||
              h.includes("person") ||
              h.includes("first") ||
              h.includes("last") ||
              h.includes("contact")
            );
            const phoneIdx = headers.findIndex((h, idx) =>
              h.includes("phone") ||
              h.includes("number") ||
              h.includes("num") ||
              h.includes("tel") ||
              h.includes("mobile") ||
              h.includes("cell") ||
              h.includes("call") ||
              (h.includes("contact") && idx !== nameIdx)
            );
            const statusIdx = headers.findIndex(h => h.includes("status"));
            const emailIdx = headers.findIndex(h => h.includes("email") || h.includes("mail"));

            if (nameIdx === -1 || phoneIdx === -1) {
              throw new Error("Failed to find customer name and number columns. Please re-upload a proper Excel/CSV file with clear Name and Phone Number headers.");
            }

            const mapped: any[] = [];
            for (let i = 1; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;

              const cells: string[] = [];
              let currentCell = "";
              let inQuotes = false;
              for (let charIdx = 0; charIdx < line.length; charIdx++) {
                const char = line[charIdx];
                if (char === '"' || char === "'") {
                  inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                  cells.push(currentCell.trim());
                  currentCell = "";
                } else {
                  currentCell += char;
                }
              }
              cells.push(currentCell.trim());

              if (cells.length < Math.max(nameIdx, phoneIdx)) continue;

              const name = cells[nameIdx]?.replace(/["']/g, "") || "";
              const phone_number = cells[phoneIdx]?.replace(/["']/g, "") || "";
              const status = (statusIdx !== -1 && cells[statusIdx] ? cells[statusIdx].replace(/["']/g, "") : "PENDING").toUpperCase();
              const email = (emailIdx !== -1 && cells[emailIdx] ? cells[emailIdx].replace(/["']/g, "").trim() : "");
              const campaign = baseName;

              if (!name || !phone_number) {
                continue;
              }

              mapped.push({ name, phone_number, email, status, campaign });
            }

            if (mapped.length === 0) {
              throw new Error("Failed to find customer name and number columns. Please re-upload a proper Excel/CSV file with clear 'Customer Name' and 'Phone Number' headers to ensure the AI agent can fetch names and numbers during calls.");
            }

            setRawParsedLeads(mapped);
          } else {
            throw new Error("Unsupported file type. Please upload a .csv, .json, or Excel file.");
          }
        }
      } catch (err: any) {
        console.error(err);
        setImportError(err.message || "Failed to parse file.");
        setRawParsedLeads([]);
      }
    };

    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleDbFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const list: File[] = [];
    for (let i = 0; i < files.length; i++) {
      list.push(files[i]);
    }
    setDbFiles(list);
  };

  const removeDbFile = (index: number) => {
    setDbFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleDbFilesUpload = async () => {
    if (dbImportMode === "link") {
      if (!googleSheetUrl.trim()) {
        setImportError(selectedDbFormat === "google_sheet" ? "Please enter a Google Sheet URL." : "Please enter a database file link.");
        return;
      }
    } else {
      if (dbFiles.length === 0) {
        setImportStep(3);
        return;
      }
    }
    setUploadingDb(true);
    setImportError(null);
    setDbUploadStage("Uploading and parsing database...");

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5011/api/v1";
    const url = `${API_BASE_URL}/dashboard/leads/upload-database`;
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const formData = new FormData();
    formData.append("category", importCategory);
    formData.append("subcategory", importSubcategory);
    formData.append("format", selectedDbFormat);
    if (dbImportMode === "link") {
      formData.append("google_sheet_url", googleSheetUrl.trim());
    } else {
      dbFiles.forEach((file) => {
        formData.append("files", file);
      });
    }

    try {
      setDbUploadStage("Structuring tables and saving SQLite...");
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: formData,
      });

      const text = await response.text();
      if (!response.ok) {
        let detail = text || `Upload failed with status ${response.status}`;
        try {
          const parsed = JSON.parse(text);
          detail = String(parsed.detail ?? detail);
        } catch { /* ignore */ }
        throw new Error(detail);
      }

      setDbUploadStage("Indexing vector embeddings for AI retrieval...");

      try {
        const parsed = JSON.parse(text);
        if (parsed.files) {
          setExistingDbFiles(parsed.files);
          setDbExists(true);
        }
        if (parsed.processing) {
          setDbProcessing(parsed.processing);
        }
        if (parsed.warnings && parsed.warnings.length > 0) {
          setImportError(parsed.warnings.join(" "));
        }
      } catch (e) {
        console.error("Error parsing upload response", e);
      }

      setDbUploaded(true);
      setImportStep(3);
    } catch (err: any) {
      console.error(err);
      setImportError(err.message || "Failed to upload custom database files.");
    } finally {
      setUploadingDb(false);
      setDbUploadStage("");
    }
  };

  const handleReindexDatabase = async () => {
    if (!importCategory || !importSubcategory) return;
    setUploadingDb(true);
    setDbUploadStage("Re-indexing database vectors...");
    try {
      const res = await apiFetch<any>(
        `/dashboard/leads/reindex-database?category=${encodeURIComponent(importCategory)}&subcategory=${encodeURIComponent(importSubcategory)}`,
        "POST",
        {},
        token
      );
      if (res?.processing) {
        setDbProcessing(res.processing);
        triggerSuccess(`Database indexed with ${res.processing.chunk_count || 0} vector chunks.`);
      }
    } catch (err) {
      console.error(err);
      triggerError("Failed to re-index database.");
    } finally {
      setUploadingDb(false);
      setDbUploadStage("");
    }
  };

  const handleImportLeadsSubmit = async () => {
    if (parsedLeads.length === 0) return;
    setImporting(true);

    const finalCampaignName = customCampaignName.trim() || "Imported Leads";
    const leadsWithCampaign = parsedLeads.map(l => ({
      ...l,
      campaign: finalCampaignName
    }));

    try {
      const res = await apiFetch<{ status: string; message?: string }>("/dashboard/leads/import", "POST", { leads: leadsWithCampaign }, token);
      if (res) {
        setImportModalOpen(false);
        setRawParsedLeads([]);
        setImportFileName("");
        setCustomCampaignName("");
        triggerSuccess(res.message || `Successfully imported ${parsedLeads.length} leads!`);
        fetchAllData(true);
      }
    } catch (err) {
      console.error(err);
      triggerError("Failed to import leads. Check that headers and format match specifications.");
    } finally {
      setImporting(false);
    }
  };

  const leadStatusMatch = (l: LeadList) => {
    switch (leadFilters.status) {
      case "pending": return (l.pending_leads || 0) > 0;
      case "called": return (l.pending_leads || 0) === 0 && (l.called_leads || 0) > 0;
      case "dnc": return (l.dnc_leads || 0) > 0;
      default: return true;
    }
  };
  const filteredLeads = leads.filter(l =>
    l.campaign_name.toLowerCase().includes(searchQuery.toLowerCase()) && leadStatusMatch(l)
  );

  const totalLeads = leads.reduce((sum, l) => sum + (l.total_leads || 0), 0);
  const validNumbers = totalLeads;
  const dncListCount = leads.reduce((sum, l) => sum + (l.dnc_leads || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-950 tracking-tight">Leads</h2>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Manage and track your AI-driven outbound prospects by list.
          </p>
        </div>

        {/* Actions row */}
        <div className="flex items-center space-x-3.5 select-none">
          <button
            onClick={() => setImportModalOpen(true)}
            className="h-9 px-3.5 bg-white border border-slate-250 rounded-lg flex items-center text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50/50 cursor-pointer"
          >
            <FileUp className="w-4 h-4 text-slate-400 mr-2" />
            <span>Import Leads</span>
          </button>
        </div>
      </div>

      {/* 3 KPI metrics cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Card 1: Total Leads */}
        <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs flex items-center space-x-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Leads</span>
            <span className="text-xl font-extrabold text-slate-950 block mt-0.5">{totalLeads.toLocaleString()}</span>
          </div>
        </div>

        {/* Card 2: Valid Numbers */}
        <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs flex items-center space-x-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Valid Numbers</span>
            <span className="text-xl font-extrabold text-slate-950 block mt-0.5">{validNumbers.toLocaleString()}</span>
          </div>
        </div>

        {/* Card 3: DNC List */}
        <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs flex items-center space-x-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-700 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">DNC List</span>
            <span className="text-xl font-extrabold text-slate-950 block mt-0.5">{dncListCount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Leads Data Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        {/* Filter and Search */}
        <div className="h-14 px-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 w-full">
            <div className="relative flex items-center w-full max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3" />
              <input
                type="text"
                placeholder="Search lists..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg pl-9 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-blue-600 transition-all shadow-inner"
              />
            </div>
            <FilterMenu
              align="left"
              groups={[{
                key: "status", label: "List status", options: [
                  { value: "all", label: "All" },
                  { value: "pending", label: "Has pending" },
                  { value: "called", label: "Fully called" },
                  { value: "dnc", label: "Has DNC" },
                ]
              }]}
              value={leadFilters}
              onChange={(k, v) => setLeadFilters((prev) => ({ ...prev, [k]: v }))}
              onClear={() => setLeadFilters({ status: "all" })}
            />
          </div>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 select-none shrink-0 ml-3" title="Lead directory is synced and live">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse select-none">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-4 pl-6 w-10">
                  <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-600" defaultChecked={false} />
                </th>
                <th className="p-4 font-bold">FILE / LIST NAME</th>
                <th className="p-4 font-bold">TOTAL CONTACTS</th>
                <th className="p-4 font-bold">PENDING</th>
                <th className="p-4 font-bold">CALLED</th>
                <th className="p-4 font-bold">DNC LIST</th>
                <th className="p-4 font-bold">LAST CALLED</th>
                <th className="p-4 pr-6 text-right font-bold w-12">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No matching lists found.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/40 transition-all">
                    <td className="p-4 pl-6">
                      <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-600" defaultChecked={false} />
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => setManageList(l)}
                        className="text-slate-900 font-extrabold hover:text-blue-700 transition-colors cursor-pointer text-left"
                        title="Manage the leads in this list"
                      >
                        {l.campaign_name}
                      </button>
                    </td>
                    <td className="p-4 text-slate-600 font-mono">{l.total_leads}</td>
                    <td className="p-4 text-slate-600 font-mono">{l.pending_leads}</td>
                    <td className="p-4 text-slate-600 font-mono">{l.called_leads}</td>
                    <td className="p-4 text-slate-600 font-mono text-red-650">{l.dnc_leads}</td>
                    <td className="p-4 text-slate-400">{l.last_called}</td>
                    <td className="p-4 pr-6 text-right relative">
                      <button
                        onClick={(e) => {
                          if (activeDropdownId === l.id) { setActiveDropdownId(null); return; }
                          const r = e.currentTarget.getBoundingClientRect();
                          setMenuPos({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) });
                          setActiveDropdownId(l.id);
                        }}
                        className="text-slate-400 font-black cursor-pointer hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100/60 inline-flex items-center justify-center focus:outline-none"
                      >
                        •••
                      </button>
                      {activeDropdownId === l.id && menuPos && mounted && typeof window !== "undefined" && createPortal(
                        <>
                          <div className="fixed inset-0 z-[9998]" onClick={() => setActiveDropdownId(null)} />
                          <div
                            className="fixed z-[9999] w-40 bg-white border border-slate-200 rounded-lg shadow-xl py-1 text-left"
                            style={{ top: menuPos.top, right: menuPos.right }}
                          >
                            <button
                              onClick={() => { setManageList(l); setActiveDropdownId(null); }}
                              className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                              Manage Leads
                            </button>
                            <button
                              onClick={() => { setEditList(l); setEditCampaignName(l.campaign_name); setActiveDropdownId(null); }}
                              className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                              Rename List
                            </button>
                            <button
                              onClick={() => { setDeleteListId(l.id); setActiveDropdownId(null); }}
                              className="w-full px-4 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50/50 cursor-pointer"
                            >
                              Delete List
                            </button>
                          </div>
                        </>,
                        document.body
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="h-14 px-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 select-none">
          <span>Showing 1 to {filteredLeads.length} of {leads.length} lists</span>
          <div className="flex items-center space-x-4">
            <button className="h-8 px-3 border border-slate-250 bg-white hover:bg-slate-50 rounded-lg text-slate-600 font-bold transition-all disabled:opacity-50 cursor-pointer" disabled>
              Previous
            </button>
            <span className="font-bold text-slate-700">Page 1 of 1</span>
            <button className="h-8 px-3 border border-slate-250 bg-white hover:bg-slate-50 rounded-lg text-slate-600 font-bold transition-all disabled:opacity-50 cursor-pointer" disabled>
              Next
            </button>
          </div>
        </div>
      </div>

      {/* LEAD CREATION MODAL */}
      {drawerOpen && mounted && typeof window !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-y-auto bg-black/45 backdrop-blur-sm p-4 flex justify-center items-start sm:items-center transition-all duration-350 select-none animate-fade-only"
          onClick={(e) => { if (e.target === e.currentTarget) setDrawerOpen(false); }}
        >
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl flex flex-col my-8 overflow-hidden relative border border-slate-100 border-t-4 border-blue-600 transform scale-100 animate-scale-in text-left">
            {/* Modal header */}
            <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between shrink-0 bg-slate-50/50">
              <div className="space-y-1 text-left">
                <span className="text-[9px] text-blue-700 uppercase font-black tracking-widest block">Leads Registry</span>
                <h3 className="text-base font-bold text-slate-950 mt-1 flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                  <span>Register New Call Lead</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-1">
                  Insert a single contact lead record directly into the dialer database.
                </p>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors ml-4 shrink-0 border border-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleAddLead} className="px-6 py-6 space-y-5 bg-white flex-1 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="flex items-center space-x-1.5 text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Contact Full Name</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Julian Marini"
                    value={newLeadName}
                    onChange={(e) => setNewLeadName(e.target.value)}
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200/95 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder-slate-400"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center space-x-1.5 text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>Phone Number (E.164)</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +1 (212) 555-0192"
                    value={newLeadPhone}
                    onChange={(e) => setNewLeadPhone(e.target.value)}
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200/95 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-1.5 text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Email (optional)</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. julian@example.com — used to email company details on interest"
                  value={newLeadEmail}
                  onChange={(e) => setNewLeadEmail(e.target.value)}
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200/95 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder-slate-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="flex items-center space-x-1.5 text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">
                    <Target className="w-3.5 h-3.5 text-slate-400" />
                    <span>List / File Name</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Solar Outreach Q3"
                    value={leadCampaign}
                    onChange={(e) => setLeadCampaign(e.target.value)}
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200/95 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder-slate-400"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center space-x-1.5 text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Lead Validation Tag</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={leadStatus}
                      onChange={(e) => setLeadStatus(e.target.value)}
                      className="w-full h-11 pl-3.5 pr-10 bg-slate-50 border border-slate-200/95 rounded-xl text-sm font-semibold text-slate-800 outline-none cursor-pointer focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="CALLED">CALLED</option>
                      <option value="CONVERTED">CONVERTED</option>
                      <option value="DNC">DNC</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Modal footer */}
              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100 mt-6 bg-white shrink-0">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="h-10 px-5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-10 px-6 bg-[#0b1931] hover:bg-slate-950 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center space-x-2 border border-[#0b1931] shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 duration-150"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>Writing...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Commit Lead</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* RENAME LIST MODAL */}
      {editList && mounted && typeof window !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-y-auto bg-black/45 backdrop-blur-sm p-4 flex justify-center items-start sm:items-center transition-all duration-300 select-none animate-fade-only"
          onClick={(e) => { if (e.target === e.currentTarget) setEditList(null); }}
        >
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl flex flex-col my-8 overflow-hidden relative border border-slate-100 border-t-4 border-blue-600 transform scale-100 animate-scale-in text-left">
            {/* Modal header */}
            <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between shrink-0 bg-slate-50/50">
              <div className="space-y-1 text-left">
                <span className="text-[9px] text-blue-700 uppercase font-black tracking-widest block">Leads Registry</span>
                <h3 className="text-base font-bold text-slate-950 mt-1 flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                  <span>Rename Lead List</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-1">
                  Update the name of this lead list in the dialer database.
                </p>
              </div>
              <button
                onClick={() => setEditList(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors ml-4 shrink-0 border border-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleEditList} className="px-6 py-6 space-y-5 bg-white flex-1 text-left">
              <div className="space-y-2">
                <label className="flex items-center space-x-1.5 text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">
                  <Target className="w-3.5 h-3.5 text-slate-400" />
                  <span>List / Campaign Name</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Solar Outreach Q3"
                  value={editCampaignName}
                  onChange={(e) => setEditCampaignName(e.target.value)}
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200/95 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder-slate-400"
                />
              </div>

              {/* Modal footer */}
              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100 mt-6 bg-white shrink-0">
                <button
                  type="button"
                  onClick={() => setEditList(null)}
                  className="h-10 px-5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="h-10 px-6 bg-[#0b1931] hover:bg-slate-950 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center space-x-2 border border-[#0b1931] shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 duration-150"
                >
                  {editSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteListId !== null && mounted && typeof window !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-xs select-none animate-fade-only">
          <div className="w-full max-w-sm bg-white border border-slate-200 p-6 rounded-2xl shadow-2xl relative text-left mx-4 animate-fade-in">
            <h3 className="text-base font-bold text-slate-950">Confirm Deletion</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed mt-2">
              Are you sure you want to remove this lead list? All contacts inside this list will be permanently deleted.
            </p>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setDeleteListId(null)}
                className="h-9 px-4 bg-white border border-slate-250 hover:bg-slate-50 text-xs font-bold text-slate-700 rounded-lg cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteList}
                disabled={deleting}
                className="h-9 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-xs font-bold text-white rounded-lg cursor-pointer transition-all flex items-center justify-center"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                <span>Delete List</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* IMPORT LEADS MODAL */}
      {importModalOpen && mounted && typeof window !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-xs select-none animate-fade-only">
          <div className="w-full max-w-lg bg-white border border-slate-200 p-6 lg:p-8 rounded-2xl shadow-2xl relative text-left mx-4 animate-fade-in flex flex-col max-h-[90vh]">
            <button
              onClick={() => {
                setImportModalOpen(false);
                setRawParsedLeads([]);
                setDefaultCountryCode("");
                setImportFileName("");
                setImportError(null);
                setCustomCampaignName("");
                setImportStep(1);
                setImportCategory("");
                setImportSubcategory("");
                setDbFiles([]);
                setDbUploaded(false);
                setDbImportMode("link");
              }}
              className="absolute top-6 right-6 p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <span className="text-[9px] text-blue-700 uppercase font-black tracking-widest block">Batch Operations</span>
              <h3 className="text-base font-bold text-slate-950 mt-1">Bulk Import Leads</h3>
              <p className="text-[10px] text-slate-500 font-semibold leading-relaxed mt-1">
                Configure your campaign scope, upload databases, and import customer leads to trigger calls.
              </p>
            </div>

            {/* Stepper Progress */}
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${importStep === 1 ? 'bg-[#0b1931] text-white ring-4 ring-slate-150' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  }`}>
                  {importStep > 1 ? <Check className="w-3.5 h-3.5" /> : "1"}
                </div>
                <span className={`text-[10px] font-bold tracking-tight ${importStep === 1 ? 'text-slate-900' : 'text-slate-400'}`}>Scope</span>
              </div>
              <div className="flex-1 h-[2px] bg-slate-100 mx-3" />

              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${importStep === 2 ? 'bg-[#0b1931] text-white ring-4 ring-slate-150' : importStep > 2 ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}>
                  {importStep > 2 ? <Check className="w-3.5 h-3.5" /> : "2"}
                </div>
                <span className={`text-[10px] font-bold tracking-tight ${importStep === 2 ? 'text-slate-900' : 'text-slate-400'}`}>Database</span>
              </div>
              <div className="flex-1 h-[2px] bg-slate-100 mx-3" />

              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${importStep === 3 ? 'bg-[#0b1931] text-white ring-4 ring-slate-150' : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}>
                  3
                </div>
                <span className={`text-[10px] font-bold tracking-tight ${importStep === 3 ? 'text-slate-900' : 'text-slate-400'}`}>Leads</span>
              </div>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto pr-1">
              {/* Error messages */}
              {importError && (
                <div className="p-3 bg-red-50 border border-red-150 rounded-xl text-red-700 text-[10px] font-bold flex items-start space-x-2 animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* STEP 1 UI: Scope Selection */}
              {importStep === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider block">
                      Campaign Category
                    </label>
                    {loadingCategories ? (
                      <div className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center space-x-2 text-xs font-semibold text-slate-400">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Loading active categories...</span>
                      </div>
                    ) : (
                      <select
                        value={importCategory}
                        onChange={(e) => {
                          setImportCategory(e.target.value);
                          setImportSubcategory("");
                        }}
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-3xs"
                      >
                        <option value="">Select Category</option>
                        {(() => {
                          // Show only the vendor's onboarded industry (not all industries),
                          // matching the AI Agent creation flow. Falls back to all globals
                          // if the onboarded industry can't be resolved.
                          const globals = catalogCategories.filter((c) => !c.is_custom);
                          const mine = globals.find((c) => c.name === leadDefaultCategory);
                          const shown = mine ? [mine] : (globals.length ? globals : catalogCategories);
                          return shown.map((cat) => (
                            <option key={cat.name} value={cat.name}>
                              {cat.name}
                            </option>
                          ));
                        })()}
                      </select>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider block">
                      Campaign Subcategory
                    </label>
                    <select
                      value={importSubcategory}
                      onChange={(e) => setImportSubcategory(e.target.value)}
                      disabled={!importCategory}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-3xs disabled:opacity-50 disabled:bg-slate-50"
                    >
                      <option value="">Select Subcategory</option>
                      {importCategory &&
                        catalogCategories
                          .find((cat) => cat.name === importCategory)
                          ?.subcategories.map((sub: any) => (
                            <option key={sub.name} value={sub.name}>
                              {sub.name}
                            </option>
                          ))}
                    </select>
                  </div>
                </div>
              )}

              {/* STEP 2 UI: Database Catalog Upload */}
              {importStep === 2 && (
                <div className="space-y-4 animate-fade-in text-center">
                  <p className="text-[10px] text-slate-500 font-semibold leading-relaxed mt-1 px-4 max-w-sm mx-auto">
                    Provide the AI agent with custom context, product catalogs, and order sheets during calls.
                  </p>

                  {dbExists && !showUploadUI ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center space-y-4 bg-slate-50 border border-slate-200/90 rounded-2xl p-6 animate-scale-in">
                      <div className="w-12 h-12 rounded-full bg-blue-50 border-2 border-blue-600 text-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/10">
                        <Database className="w-6 h-6 animate-pulse" />
                      </div>
                      <div className="space-y-2 text-center">
                        <span className="text-xs font-extrabold text-slate-900 block uppercase tracking-wider">Existing Database Configured</span>
                        <div className="text-[10px] font-bold text-slate-550 max-w-xs mx-auto">
                          Files: <span className="text-slate-800 font-mono">{existingDbFiles.join(", ") || "None"}</span>
                        </div>
                        {dbProcessing && (
                          <div className="text-[10px] font-bold max-w-xs mx-auto space-y-1">
                            <span className={`inline-block px-2 py-0.5 rounded uppercase tracking-wide ${dbProcessing.index_status === "ready" || dbProcessing.status === "ready"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}>
                              {dbProcessing.index_status === "ready" || dbProcessing.status === "ready"
                                ? `Indexed · ${dbProcessing.row_count || 0} rows · ${dbProcessing.vector_chunks || 0} vector chunks`
                                : "Processing / pending index"}
                            </span>
                          </div>
                        )}
                        <p className="text-[10px] text-slate-400 font-semibold leading-relaxed px-4 max-w-sm mx-auto mt-1">
                          This customer profile already has a catalog database uploaded for the selected category. You can use it directly or replace it with a new file.
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setImportStep(3)}
                          className="h-8 px-4 bg-slate-900 hover:bg-slate-950 text-white text-[10px] font-bold rounded-lg cursor-pointer transition-all"
                        >
                          Keep Existing Database
                        </button>
                        <button
                          type="button"
                          onClick={handleReindexDatabase}
                          disabled={uploadingDb}
                          className="h-8 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[10px] font-bold rounded-lg cursor-pointer transition-all"
                        >
                          {uploadingDb ? "Indexing..." : "Re-index Vectors"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowUploadUI(true);
                            setDbUploaded(false);
                          }}
                          className="h-8 px-4 bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 text-[10px] font-bold rounded-lg cursor-pointer transition-all"
                        >
                          Replace Database
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Format selector custom dropdown */}
                      {(() => {
                        const selectedOption = formatOptions.find(o => o.value === selectedDbFormat) || formatOptions[0];
                        const SelectedIcon = selectedOption.icon;
                        return (
                          <div className="space-y-1.5 text-left w-full mb-3 select-none relative">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                              Database File Format
                            </label>
                            <button
                              type="button"
                              onClick={() => setFormatDropdownOpen(!formatDropdownOpen)}
                              className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-800 outline-none hover:bg-slate-100/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-3xs cursor-pointer"
                            >
                              <div className="flex items-center space-x-2.5">
                                <div className={`p-1.5 rounded-lg border flex items-center justify-center shrink-0 ${selectedOption.color}`}>
                                  <SelectedIcon className="w-3.5 h-3.5" />
                                </div>
                                <span>{selectedOption.label}</span>
                              </div>
                              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${formatDropdownOpen ? "rotate-180" : ""}`} />
                            </button>

                            {formatDropdownOpen && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setFormatDropdownOpen(false)} />
                                <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 select-none animate-fade-in text-left">
                                  {formatOptions.map((opt) => {
                                    const OptIcon = opt.icon;
                                    const isSelected = opt.value === selectedDbFormat;
                                    return (
                                      <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => {
                                          setSelectedDbFormat(opt.value);
                                          setDbFiles([]);
                                          setFormatDropdownOpen(false);
                                          setDbImportMode(opt.value === "google_sheet" ? "link" : "upload");
                                        }}
                                        className={`w-full h-11 px-4 flex items-center justify-between text-xs font-semibold transition-colors cursor-pointer ${isSelected ? "bg-slate-50 text-blue-600 font-bold" : "text-slate-700 hover:bg-slate-50/70"
                                          }`}
                                      >
                                        <div className="flex items-center space-x-3">
                                          <div className={`p-1.5 rounded-lg border flex items-center justify-center shrink-0 ${opt.color}`}>
                                            <OptIcon className="w-3.5 h-3.5" />
                                          </div>
                                          <span>{opt.label}</span>
                                        </div>
                                        {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                                      </button>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })()}

                      {dbUploaded ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center space-y-3 bg-emerald-50/50 border border-emerald-100 rounded-xl p-6 animate-scale-in">
                          <div className="w-12 h-12 rounded-full bg-emerald-50 border-2 border-emerald-500 text-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                            <Check className="w-6 h-6 animate-scale-in" />
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-900 block">Database Ready for AI Calls</span>
                            <span className="text-[10px] text-slate-500 font-semibold block leading-relaxed px-4">
                              Parsed, structured, and vector-indexed for agent retrieval during live calls.
                            </span>
                            {dbProcessing && (
                              <span className="text-[10px] font-bold text-emerald-700 block">
                                {dbProcessing.row_count || 0} records · {dbProcessing.vector_chunks || 0} vector chunks · status: {dbProcessing.status || "ready"}
                              </span>
                            )}
                            {existingDbFiles.length > 0 && (
                              <div className="text-[9px] font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-lg mt-2 inline-block shadow-3xs max-w-xs truncate font-mono">
                                Saved: {existingDbFiles.join(", ")}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : uploadingDb ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center space-y-3 bg-blue-50/50 border border-blue-100 rounded-xl p-6">
                          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                          <span className="text-xs font-bold text-slate-900 block">Processing Database</span>
                          <span className="text-[10px] text-slate-500 font-semibold">{dbUploadStage || "Please wait..."}</span>
                        </div>
                      ) : (
                        <>
                          {selectedDbFormat !== "google_sheet" && (
                            <div className="flex items-center justify-center p-0.5 bg-slate-100 rounded-xl mb-4 max-w-[240px] mx-auto select-none border border-slate-205/60 shadow-3xs">
                              <button
                                type="button"
                                onClick={() => {
                                  setDbImportMode("upload");
                                  setImportError(null);
                                }}
                                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${dbImportMode === "upload"
                                    ? "bg-white text-slate-900 shadow-xs border border-slate-200/40"
                                    : "text-slate-500 hover:text-slate-800"
                                  }`}
                              >
                                Upload File
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDbImportMode("link");
                                  setImportError(null);
                                }}
                                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${dbImportMode === "link"
                                    ? "bg-white text-slate-900 shadow-xs border border-slate-200/40"
                                    : "text-slate-500 hover:text-slate-800"
                                  }`}
                              >
                                Provide Link
                              </button>
                            </div>
                          )}

                          {dbImportMode === "link" || selectedDbFormat === "google_sheet" ? (
                            <div className="space-y-3 text-left bg-slate-50 border border-slate-250 rounded-xl p-4.5 select-none animate-fade-in">
                              <label className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider block">
                                {selectedDbFormat === "google_sheet" ? "Google Sheet Share Link" : "Database File URL Link"}
                              </label>
                              <input
                                type="url"
                                placeholder={
                                  selectedDbFormat === "google_sheet"
                                    ? "https://docs.google.com/spreadsheets/d/.../edit?usp=sharing"
                                    : `https://example.com/data.${selectedDbFormat === "csv" ? "csv" :
                                      selectedDbFormat === "excel" ? "xlsx" :
                                        selectedDbFormat === "sqlite" ? "db" :
                                          selectedDbFormat === "json" ? "json" : "csv"
                                    }`
                                }
                                value={googleSheetUrl}
                                onChange={(e) => setGoogleSheetUrl(e.target.value)}
                                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-3xs"
                              />
                              <p className="text-[9px] text-slate-400 font-semibold leading-relaxed mt-1">
                                {selectedDbFormat === "google_sheet" ? (
                                  <>Important: Ensure the Google Sheet is shared with <strong>&quot;Anyone with the link can view&quot;</strong> so our backend can access it.</>
                                ) : (
                                  <>Important: Ensure the database file link is publicly accessible so our backend can download and index it.</>
                                )}
                              </p>
                            </div>
                          ) : (
                            <>
                              <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-6 text-center transition-all bg-slate-50/50 relative">
                                <input
                                  type="file"
                                  multiple={selectedDbFormat !== "sqlite"}
                                  accept={
                                    selectedDbFormat === "sqlite" ? ".db" :
                                      selectedDbFormat === "csv" ? ".csv" :
                                        selectedDbFormat === "excel" ? ".xlsx" :
                                          selectedDbFormat === "json" ? ".json" :
                                            selectedDbFormat === "pdf_docx" ? ".pdf,.docx,.txt" : ".db,.csv,.xlsx,.json,.pdf,.docx,.txt"
                                  }
                                  onChange={handleDbFilesChange}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <FileUp className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                <span className="text-xs font-bold text-slate-700 block">
                                  Select or drag database file here
                                </span>
                                <span className="text-[10px] text-slate-400 block mt-1">
                                  Supports {selectedDbFormat === "sqlite" ? "SQLite database (.db)" :
                                    selectedDbFormat === "csv" ? "CSV spreadsheet (.csv)" :
                                      selectedDbFormat === "excel" ? "Excel sheets (.xlsx)" :
                                        selectedDbFormat === "json" ? "JSON files (.json)" :
                                          selectedDbFormat === "pdf_docx" ? "PDF, Word, or Text (.pdf, .docx, .txt)" : "files"} format
                                </span>
                              </div>

                              {dbFiles.length > 0 && (
                                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 text-left">
                                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    Selected Files ({dbFiles.length})
                                  </div>
                                  <div className="space-y-1.5">
                                    {dbFiles.map((file, idx) => (
                                      <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 animate-fade-in">
                                        <span className="truncate max-w-[280px]">{file.name}</span>
                                        <div className="flex items-center space-x-2 text-[10px] text-slate-400 shrink-0">
                                          <span>{(file.size / 1024).toFixed(1)} KB</span>
                                          <button
                                            type="button"
                                            onClick={() => removeDbFile(idx)}
                                            className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer transition-all"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </>
                      )}

                      {dbExists && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowUploadUI(false);
                            setDbFiles([]);
                            setDbUploaded(true);
                          }}
                          className="text-[10px] font-bold text-slate-500 hover:text-slate-800 underline block mx-auto mt-2"
                        >
                          Cancel and keep existing database
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* STEP 3 UI: Leads List Sheet Upload */}
              {importStep === 3 && (
                <div className="space-y-4 animate-fade-in">
                  {/* Default Country Code Selection */}
                  <div className="space-y-1.5 p-1 select-none">
                    <label className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider block">
                      Default Country Code
                    </label>
                    <select
                      value={defaultCountryCode}
                      onChange={(e) => setDefaultCountryCode(e.target.value)}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-3xs cursor-pointer"
                    >
                      <option value="" disabled>-- Select Country Code --</option>
                      <option value="none">None / Keep original (e.g. if numbers in CSV already have &apos;+&apos; and country code)</option>
                      <optgroup label="Top Countries">
                        <option value="+91">🇮🇳 India (+91)</option>
                        <option value="+1">🇺🇸/🇨🇦 United States / Canada (+1)</option>
                        <option value="+44">🇬🇧 United Kingdom (+44)</option>
                        <option value="+61">🇦🇺 Australia (+61)</option>
                        <option value="+971">🇦🇪 United Arab Emirates (+971)</option>
                        <option value="+65">🇸🇬 Singapore (+65)</option>
                        <option value="+49">🇩🇪 Germany (+49)</option>
                        <option value="+33">🇫🇷 France (+33)</option>
                        <option value="+81">🇯🇵 Japan (+81)</option>
                        <option value="+966">🇸🇦 Saudi Arabia (+966)</option>
                      </optgroup>
                    </select>
                    <p className="text-[9px] text-slate-400">
                      If the phone numbers in your Excel/CSV are missing the leading <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">+</code> and country code, select the default country code above to append automatically.
                    </p>
                  </div>

                  {/* File Dropzone/Picker */}
                  {(() => {
                    const isCountryCodeSelected = defaultCountryCode !== "";
                    return (
                      <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-all relative ${isCountryCodeSelected
                        ? "border-slate-200 hover:border-blue-400 bg-slate-50/50 cursor-pointer"
                        : "border-slate-150 bg-slate-50/30 opacity-60 pointer-events-none"
                        }`}>
                        <input
                          type="file"
                          accept=".csv,.json,.xlsx,.xls"
                          onChange={handleFileUpload}
                          disabled={!isCountryCodeSelected}
                          className={`absolute inset-0 w-full h-full opacity-0 ${isCountryCodeSelected ? "cursor-pointer" : "pointer-events-none"
                            }`}
                        />
                        <FileUp className={`w-8 h-8 mx-auto mb-2 ${isCountryCodeSelected ? "text-slate-400" : "text-slate-300"}`} />
                        <span className={`text-xs font-bold block ${isCountryCodeSelected ? "text-slate-700" : "text-slate-400"}`}>
                          {importFileName ? importFileName : "Select or drag leads file here"}
                        </span>
                        <span className={`text-[10px] block mt-1 ${isCountryCodeSelected ? "text-slate-400" : "text-slate-300"}`}>
                          CSV/Excel should include &quot;Customer Name&quot; and &quot;Phone Number&quot; headers
                        </span>
                      </div>
                    );
                  })()}

                  {/* Custom Campaign Name */}
                  {parsedLeads.length > 0 && (
                    <div className="space-y-1.5 p-1">
                      <label className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider block">
                        Campaign / Lead List Name
                      </label>
                      <input
                        type="text"
                        placeholder="Enter custom list name"
                        value={customCampaignName}
                        onChange={(e) => setCustomCampaignName(e.target.value)}
                        className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-3xs"
                      />
                      <p className="text-[9px] text-slate-400">
                        This campaign name will identify this lead list in the campaign scheduler.
                      </p>
                    </div>
                  )}

                  {/* Parsed Preview */}
                  {parsedLeads.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <span>Parsed Contacts Preview ({parsedLeads.length} total)</span>
                        <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center space-x-1">
                          <Check className="w-3.5 h-3.5" /> <span>Valid File</span>
                        </span>
                      </div>

                      <div className="border border-slate-150 rounded-xl overflow-hidden bg-slate-50/30">
                        <table className="w-full text-left text-[11px] font-semibold text-slate-600">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                              <th className="p-2.5 pl-4">NAME</th>
                              <th className="p-2.5">PHONE</th>
                              <th className="p-2.5">CAMPAIGN</th>
                              <th className="p-2.5 pr-4 text-right">STATUS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-155">
                            {parsedLeads.slice(0, 3).map((pl, idx) => (
                              <tr key={idx}>
                                <td className="p-2.5 pl-4 text-slate-900 font-bold">{pl.name}</td>
                                <td className="p-2.5 font-mono">{pl.phone_number}</td>
                                <td className="p-2.5 text-slate-500">{customCampaignName || pl.campaign}</td>
                                <td className="p-2.5 pr-4 text-right">
                                  <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-full text-[8px] font-black text-slate-500 tracking-wider">
                                    {pl.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {parsedLeads.length > 3 && (
                          <div className="p-2 bg-slate-50 text-center text-[9px] text-slate-400 font-bold border-t border-slate-155">
                            + {parsedLeads.length - 3} more leads
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Stepper Footer Action Buttons */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
              <div>
                {importStep > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (importStep === 3) {
                        setImportStep(2);
                      } else {
                        setImportStep(1);
                      }
                      setImportError(null);
                    }}
                    className="h-9 px-4 bg-white border border-slate-250 hover:bg-slate-50 text-xs font-bold text-slate-700 rounded-lg cursor-pointer transition-all"
                  >
                    Back
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setImportModalOpen(false);
                    setRawParsedLeads([]);
                    setDefaultCountryCode("");
                    setImportFileName("");
                    setImportError(null);
                    setCustomCampaignName("");
                    setImportStep(1);
                    setImportCategory("");
                    setImportSubcategory("");
                    setDbFiles([]);
                    setDbUploaded(false);
                    setDbExists(false);
                    setExistingDbFiles([]);
                    setSelectedDbFormat("sqlite");
                    setShowUploadUI(false);
                  }}
                  className="h-9 px-4 bg-white border border-slate-250 hover:bg-slate-50 text-xs font-bold text-slate-700 rounded-lg cursor-pointer transition-all"
                >
                  Cancel
                </button>

                {importStep === 1 && (
                  <button
                    type="button"
                    onClick={async () => {
                      await checkExistingDatabase(importCategory, importSubcategory);
                      setImportStep(2);
                    }}
                    disabled={!importCategory || !importSubcategory || checkingDb}
                    className="h-9 px-4 bg-[#0b1931] hover:bg-slate-950 disabled:opacity-50 text-xs font-bold text-white rounded-lg cursor-pointer transition-all flex items-center justify-center space-x-1.5"
                  >
                    {checkingDb ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : null}
                    <span>{checkingDb ? "Checking database..." : "Next"}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}

                {importStep === 2 && (
                  <button
                    type="button"
                    onClick={dbExists && !showUploadUI ? () => setImportStep(3) : dbUploaded ? () => setImportStep(3) : handleDbFilesUpload}
                    disabled={
                      uploadingDb ||
                      ((!dbExists || showUploadUI) && !dbUploaded && (
                        dbImportMode === "link"
                          ? !googleSheetUrl.trim()
                          : dbFiles.length === 0
                      ))
                    }
                    className="h-9 px-4 bg-[#0b1931] hover:bg-slate-950 disabled:opacity-50 text-xs font-bold text-white rounded-lg cursor-pointer transition-all flex items-center justify-center space-x-1.5"
                  >
                    {uploadingDb ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <ChevronRight className="w-4 h-4 text-white" />}
                    <span>{uploadingDb ? "Processing..." : (dbExists && !showUploadUI) ? "Next" : dbUploaded ? "Next" : dbImportMode === "link" ? "Fetch Database" : "Upload Databases"}</span>
                  </button>
                )}

                {importStep === 3 && (
                  <button
                    type="button"
                    onClick={handleImportLeadsSubmit}
                    disabled={parsedLeads.length === 0 || importing}
                    className="h-9 px-4 bg-[#0b1931] hover:bg-slate-950 disabled:opacity-50 text-xs font-bold text-white rounded-lg cursor-pointer transition-all flex items-center justify-center space-x-1.5"
                  >
                    {importing ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Check className="w-4 h-4" />}
                    <span>Import {parsedLeads.length > 0 ? `${parsedLeads.length} ` : ""}Leads</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {manageList && (
        <LeadListManagerModal
          list={manageList}
          token={token}
          onClose={() => setManageList(null)}
          onChanged={() => fetchAllData(true)}
          triggerSuccess={triggerSuccess}
          triggerError={triggerError}
        />
      )}
    </div>
  );
};
