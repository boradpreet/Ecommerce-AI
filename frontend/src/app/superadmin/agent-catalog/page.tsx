"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuthStore } from "src/store/authStore";
import { apiFetch } from "src/lib/api";
import { CatalogCategory } from "src/lib/agent-catalog";
import {
  ShoppingBag,
  Heart,
  Megaphone,
  FileText,
  Save,
  Copy,
  Check,
  Sparkles,
  Loader2,
  Coins,
  CreditCard,
  ChevronRight,
  ArrowLeft,
  HelpCircle,
  User,
  ChevronDown,
  Search,
  Building2,
  Plus,
  X,
  Trash2,
  Home, Landmark, ShieldCheck, GraduationCap, Plane, UtensilsCrossed, Car, Users, Truck, RadioTower,
  Hotel, BedDouble, LifeBuoy, PartyPopper, Star,
} from "lucide-react";

// Icons + descriptions for the 12 built-in industries (falls back gracefully).
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "E-commerce": <ShoppingBag className="w-7 h-7" />, "Ecommerce": <ShoppingBag className="w-7 h-7" />,
  "Healthcare": <Heart className="w-7 h-7" />, "Real Estate": <Home className="w-7 h-7" />,
  "Banking & Finance": <Landmark className="w-7 h-7" />, "Finance": <Coins className="w-7 h-7" />,
  "Insurance": <ShieldCheck className="w-7 h-7" />, "Education": <GraduationCap className="w-7 h-7" />,
  "Travel & Hospitality": <Plane className="w-7 h-7" />, "Hotel": <Hotel className="w-7 h-7" />,
  "Restaurants": <UtensilsCrossed className="w-7 h-7" />,
  "Automotive": <Car className="w-7 h-7" />, "Recruitment & HR": <Users className="w-7 h-7" />,
  "Logistics": <Truck className="w-7 h-7" />, "Telecom": <RadioTower className="w-7 h-7" />,
};
const catIcon = (name: string): React.ReactNode => CATEGORY_ICONS[name] || <Building2 className="w-7 h-7" />;
const CATEGORY_DESC: Record<string, string> = {
  "E-commerce": "Orders, delivery & support", "Healthcare": "Appointments & patient care",
  "Real Estate": "Property leads & site visits", "Banking & Finance": "Loans, EMI & KYC",
  "Insurance": "Renewals, claims & leads", "Education": "Admissions & student support",
  "Travel & Hospitality": "Bookings & travel updates", "Hotel": "Reservations, events & guest care",
  "Restaurants": "Reservations & orders",
  "Automotive": "Service & sales follow-up", "Recruitment & HR": "Screening & scheduling",
  "Logistics": "Delivery & tracking", "Telecom": "Onboarding & retention",
};

interface CatalogItem {
  id?: number;
  category: string;
  subcategory: string;
  system_prompt: string;
  inbound_prompt?: string;
}

interface CustomerUser {
  id: number;
  full_name: string;
  email: string;
  org_name: string;
  org_id?: number;
  created_at: string;
  plivo_number?: string;
  twilio_number?: string;
  telephony_provider?: string;
}

interface CatalogRequest {
  id: number;
  category: string;
  subcategory: string;
  status: string;
  created_at: string;
  approved_at?: string;
  system_prompt?: string;
  org_id: number;
  org_name: string;
  requester_name: string;
  requester_email: string;
}

const DEFAULT_TEMPLATES_MAP: Record<string, Record<string, string>> = {
  Ecommerce: {
    "Marketing Campaign": `# AGENT ROLE & IDENTITY
You are "Aria", a professional E-commerce Marketing & Sales Representative. Your goal is to guide customers through ongoing marketing campaigns, highlight current product promotions, offer custom discount codes, and professionally encourage them to complete a purchase.

# CORE OBJECTIVES
1. Present active campaigns (e.g., "Season End Clearance", "Buy One Get One Free").
2. Offer a special coupon code (e.g., "ARIA15" for 15% off) if they show interest.
3. Explain the benefits of featured products clearly and concisely.
4. Collect details like their email or product interest to pass to the sales team if they want to proceed.

# CONVERSATION RULES
- Keep responses concise (1-2 sentences max per turn).
- Maintain a professional, direct, and highly persuasive tone.
- Never make up fake product pricing or return policies; if unsure, offer to have a human representative contact them.`,

    "Project Overview": `# AGENT ROLE & IDENTITY
You are "Rhea", a professional E-commerce Cart Recovery & COD Confirmation Specialist. Your goal is to guide the customer through recovering their abandoned cart or verifying their Cash on Delivery (COD) order.

# CALL START & GREETING
- You MUST start the call by greeting the customer by name. Say: "Hello, [Customer Name]." (e.g., "Hello, Priya Sharma.").
- If the customer's name is not available, say: "Hello."

# CASE-BASED WORKFLOWS
Analyze the customer's database status to determine how to proceed:

## CASE A: Abandoned Cart Recovery (Status is 'pending', Order/Cart Type is 'cart')
- Mention the specific products currently left in their shopping cart (e.g., "I noticed you left Running Shoes in your cart").
- Ask when they can complete the purchase.
- Provide a special incentive: Offer them a 10% discount code "RECOVER10" if they complete their purchase today.

## CASE B: COD Order Confirmation (Payment method is 'cod', Order/Cart Type is 'order')
- State that their order is Cash on Delivery (COD).
- Verify the shipping address: Read the address details exactly and ask: "Is this address right?"
- Confirm if we can proceed to dispatch their order.

# STRICT OUT-OF-BOUND (OOB) RULE
- If the customer asks any question not related to their cart items, orders, delivery address, or products, do NOT answer it. Instead, reply exactly: "I am only able to help you with product and order related queries, otherwise sorry I can't help with that."

# CONVERSATION GUIDELINES
- Keep responses short, concise (1-2 sentences maximum), and spoken in a natural conversational flow.
- Focus on confirming details professionally. Do not hallucinate details not present in the customer data.`,
  },
  Healthcare: {
    "Inquiry Support": `# AGENT ROLE & IDENTITY
You are "Dr. Sam's Clinic Front Desk Support Assistant". Your goal is to handle patient inquiries, provide clinic operating hours, check doctor availability, explain appointment requirements, and assist with booking general checkups.

# CORE OBJECTIVES
1. Provide clinic timings: Monday to Saturday, 9:00 AM to 7:00 PM. Closed on Sundays.
2. Explain appointment requirements (e.g., bringing a valid ID and any past medical reports).
3. Help patients understand doctor availability for general consultations.
4. Guide callers on how to reschedule or cancel appointments.

# CONVERSATION RULES
- Maintain a highly professional, direct, and calm tone.
- Protect patient privacy at all times; do not ask for sensitive medical history over the phone.
- Do not provide medical diagnoses or prescribe medications. If asked for medical advice, instruct the caller to speak directly with the doctor.`,

    "Booking Agent": `# AGENT ROLE & IDENTITY
You are "Maya", a professional Healthcare Appointment Booking Assistant at the Clinic Front Desk. Your primary goal is to help patients book, reschedule, or cancel appointments, ensuring a seamless and welcoming experience.

# CORE OBJECTIVES
1. Greet the patient warmly and ask how you can assist with their appointment (booking, rescheduling, or canceling).
2. To book an appointment, collect the following required details:
   - Full name of the patient.
   - Reason for the appointment (e.g., general checkup, dental cleaning, specialist consultation).
   - Preferred date and time (clinic hours: Monday to Friday, 8:00 AM to 5:00 PM).
3. Check availability politely (simulate checking slot) and confirm the appointment details back to the patient.
4. Provide preparation instructions if relevant (e.g., arrive 10 minutes early, bring a valid ID and insurance card).

# CONVERSATION RULES
- Maintain a highly professional, empathetic, and reassuring tone.
- Strictly adhere to patient confidentiality (do not discuss medical history or sensitive information publicly).
- NEVER offer medical advice, diagnoses, or medication recommendations. If the patient asks medical questions, politely direct them to consult with a licensed doctor.
- Keep responses concise and focused (1-2 sentences per turn).`,
  },
  Finance: {
    "Gold Loan": `# AGENT ROLE & IDENTITY
You are "Karan", a professional Gold Loan Advisory Specialist. Your objective is to help customers understand gold loan products, interest rates, valuation procedures, and document requirements, and book advisory appointments.

# CORE OBJECTIVES
1. Explain interest rates (starting at 8.5% per annum) and flexible tenure options (3 to 12 months).
2. Describe the gold valuation process (safe storage, purity check by certified appraisers).
3. Detail the required documents: government ID (Aadhaar/PAN card), address proof, and passport-size photos.
4. Assist the customer in scheduling a gold valuation visit at their nearest branch.

# CONVERSATION RULES
- Speak clearly, maintaining a professional and direct tone.
- Be transparent about valuation and processing fees.
- Keep answers simple and avoid complex financial jargon.`,

    "Credit Card": `# AGENT ROLE & IDENTITY
You are "Kabir", a Credit Card Customer Service & Advisory Representative. Your goal is to help callers compare credit card benefits, reward programs, annual fees, eligibility criteria, and guide them through the application steps.

# CORE OBJECTIVES
1. Compare card tiers (e.g., Platinum Card with 5% cashback vs. Gold Card with travel miles rewards).
2. Explain eligibility criteria (e.g., minimum age of 21, steady income, good credit score).
3. Detail annual fees and waiver thresholds (e.g., annual fee waived if spending exceeds $2,050 per year).
4. Guide the customer on the digital application process via their secure mobile app or website.

# CONVERSATION RULES
- Be professional, direct, and objective. Do not pressure the customer.
- Clearly state interest rates (APR) and payment deadlines.
- Never ask for or store CVV, PIN, or full card numbers over the phone.`,
  },
};

export default function AgentCatalogPage() {
  const token = useAuthStore((s) => s.token);

  // Customer dropdown state
  const [customers, setCustomers] = useState<CustomerUser[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerUser | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Telephony configuration state
  const [plivoNumberInput, setPlivoNumberInput] = useState("");
  const [twilioNumberInput, setTwilioNumberInput] = useState("");
  const [telephonyProvider, setTelephonyProvider] = useState("plivo");
  const [updatingPlivoNumber, setUpdatingPlivoNumber] = useState(false);

  // Wizard state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);

  // Prompt state
  const [systemPrompt, setSystemPrompt] = useState("");
  const [inboundPrompt, setInboundPrompt] = useState("");
  const [promptTab, setPromptTab] = useState<"outbound" | "inbound">("outbound");
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState(false);

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [copied, setCopied] = useState(false);

  // Catalog Options dynamic state
  const [catalogOptions, setCatalogOptions] = useState<CatalogCategory[]>([]);
  const [vendorIndustry, setVendorIndustry] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(false);

  // Add custom category/subcategory modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addMode, setAddMode] = useState<"new_category" | "existing_category">("existing_category");
  const [addCategory, setAddCategory] = useState("");
  const [addSubcategory, setAddSubcategory] = useState("");
  const [addSystemPrompt, setAddSystemPrompt] = useState("");
  const [addSaving, setAddSaving] = useState(false);

  // Requests states
  const [requests, setRequests] = useState<CatalogRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CatalogRequest | null>(null);
  const [approvePrompt, setApprovePrompt] = useState("");
  const [approveSaving, setApproveSaving] = useState(false);

  const fetchRequests = async () => {
    if (!token) return;
    setLoadingRequests(true);
    try {
      const data = await apiFetch<CatalogRequest[]>("/superadmin/agent-catalogs/requests", "GET", undefined, token);
      setRequests(data);
    } catch {
      showToast("Failed to load category requests.", "error");
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleApproveRequest = async () => {
    if (!token || !selectedRequest) return;
    setApproveSaving(true);
    try {
      await apiFetch(
        `/superadmin/agent-catalogs/requests/${selectedRequest.id}/approve`,
        "POST",
        { system_prompt: approvePrompt },
        token
      );
      showToast("Successfully approved category request!", "success");
      setApproveModalOpen(false);
      fetchRequests();
      if (selectedCustomer?.org_id === selectedRequest.org_id) {
        fetchCatalogOptions(selectedCustomer.org_id);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to approve request.", "error");
    } finally {
      setApproveSaving(false);
    }
  };

  const handleRejectRequest = async (reqId: number) => {
    if (!token) return;
    if (!window.confirm("Are you sure you want to reject this request?")) return;
    try {
      await apiFetch(`/superadmin/agent-catalogs/requests/${reqId}/reject`, "POST", undefined, token);
      showToast("Request rejected.", "success");
      fetchRequests();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to reject request.", "error");
    }
  };

  useEffect(() => {
    if (token) {
      fetchRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Wizard step: 1=category, 2=subcategory, 3=prompt
  const currentStep = !selectedCategory ? 1 : !selectedSubcategory ? 2 : 3;

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load customers
  useEffect(() => {
    if (!token) return;
    setLoadingCustomers(true);
    apiFetch<CustomerUser[]>("/superadmin/customers", "GET", undefined, token)
      .then((data) => setCustomers(data))
      .catch(() => showToast("Failed to load customer accounts.", "error"))
      .finally(() => setLoadingCustomers(false));
  }, [token]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setCustomerSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchCatalogOptions = async (orgId?: number) => {
    setCatalogLoading(true);
    try {
      const orgParam = orgId ? `?organization_id=${orgId}` : "";
      const data = await apiFetch<{ categories?: CatalogCategory[]; default_category?: string }>(
        `/superadmin/agent-catalogs/options${orgParam}`,
        "GET",
        undefined,
        token
      );
      if (data?.categories) {
        setCatalogOptions(data.categories);
        setVendorIndustry(data.default_category || "");
      }
    } catch {
      showToast("Could not load categories for this account.", "error");
    } finally {
      setCatalogLoading(false);
    }
  };

  // Fetch prompt
  const fetchPrompt = async (cat: string, sub: string) => {
    if (!token) return;
    setLoadingPrompt(true);
    try {
      const orgParam = selectedCustomer?.org_id ? `&organization_id=${selectedCustomer.org_id}` : "";
      const data = await apiFetch<CatalogItem>(
        `/superadmin/agent-catalogs/prompt?category=${encodeURIComponent(cat)}&subcategory=${encodeURIComponent(sub)}${orgParam}`,
        "GET",
        undefined,
        token
      );
      const defaultPrompt = DEFAULT_TEMPLATES_MAP[cat]?.[sub] || "";
      setSystemPrompt(data.system_prompt || defaultPrompt);
      setInboundPrompt(data.inbound_prompt || "");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load prompt template.", "error");
    } finally {
      setLoadingPrompt(false);
    }
  };

  useEffect(() => {
    if (token && selectedCategory && selectedSubcategory) {
      fetchPrompt(selectedCategory, selectedSubcategory);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedSubcategory, token]);

  const handleSavePrompt = async () => {
    if (!token || !selectedCategory || !selectedSubcategory) return;
    setSavingPrompt(true);
    try {
      await apiFetch(
        "/superadmin/agent-catalogs",
        "POST",
        {
          category: selectedCategory,
          subcategory: selectedSubcategory,
          system_prompt: systemPrompt,
          inbound_prompt: inboundPrompt,
          organization_id: selectedCustomer?.org_id || null,
          mode: "existing_category"
        },
        token
      );
      if (selectedCustomer?.org_id) {
        await fetchCatalogOptions(selectedCustomer.org_id);
      }
      showToast(
        `Prompt for ${selectedCategory} › ${selectedSubcategory} saved for ${selectedCustomer?.full_name || selectedCustomer?.email}!`,
        "success"
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save prompt template.", "error");
    } finally {
      setSavingPrompt(false);
    }
  };

  const handleAddCatalogOption = async () => {
    if (!token || !selectedCustomer?.org_id) return;
    setAddSaving(true);
    try {
      const res = await apiFetch<{ message?: string }>(
        "/superadmin/agent-catalogs",
        "POST",
        {
          mode: addMode,
          category: addCategory.trim(),
          subcategory: addSubcategory.trim(),
          system_prompt: addSystemPrompt.trim(),
          organization_id: selectedCustomer.org_id
        },
        token
      );
      await fetchCatalogOptions(selectedCustomer.org_id);
      const newCat = addCategory.trim();
      const newSub = addSubcategory.trim();
      setSelectedCategory(newCat);
      setSelectedSubcategory(newSub);
      setAddModalOpen(false);
      showToast(res?.message || "Custom option added for this customer account.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to add custom option.", "error");
    } finally {
      setAddSaving(false);
    }
  };

  const handleDeleteCategory = async (categoryName: string, isGlobal?: boolean) => {
    if (!token) return;
    const orgId = isGlobal ? undefined : selectedCustomer?.org_id;
    if (!window.confirm(`Delete the ${isGlobal ? "shared (all users)" : "custom (this account)"} category "${categoryName}"? This removes all its sub-categories${isGlobal ? " for every account" : " for this customer"}.`)) {
      return;
    }

    try {
      const url = `/superadmin/agent-catalogs?category=${encodeURIComponent(categoryName)}${orgId ? `&organization_id=${orgId}` : ""}`;
      const res = await apiFetch<{ message?: string }>(url, "DELETE", undefined, token);

      if (selectedCategory === categoryName) {
        setSelectedCategory(null);
        setSelectedSubcategory(null);
      }

      await fetchCatalogOptions(selectedCustomer?.org_id);
      showToast(res?.message || `Successfully deleted category "${categoryName}".`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : `Failed to delete category "${categoryName}".`, "error");
    }
  };

  const handleDeleteSubcategory = async (categoryName: string, subcategoryName: string) => {
    if (!token) return;
    const orgId = selectedCustomer?.org_id;
    if (!window.confirm(`Are you sure you want to delete the custom subcategory "${subcategoryName}" under "${categoryName}"?`)) {
      return;
    }

    try {
      const url = `/superadmin/agent-catalogs?category=${encodeURIComponent(categoryName)}&subcategory=${encodeURIComponent(subcategoryName)}${orgId ? `&organization_id=${orgId}` : ""}`;
      const res = await apiFetch<{ message?: string }>(url, "DELETE", undefined, token);

      if (selectedSubcategory === subcategoryName) {
        setSelectedSubcategory(null);
      }

      await fetchCatalogOptions(selectedCustomer?.org_id);
      showToast(res?.message || `Successfully deleted subcategory "${subcategoryName}".`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : `Failed to delete subcategory "${subcategoryName}".`, "error");
    }
  };

  const openAddModal = (mode: "new_category" | "existing_category") => {
    setAddMode(mode);
    setAddCategory(mode === "existing_category" ? selectedCategory || "" : "");
    setAddSubcategory("");
    setAddSystemPrompt("");
    setAddModalOpen(true);
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(systemPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSubcategoryIcon = (sub: string) => {
    if (sub === "Marketing Campaign") return <Megaphone className="w-5 h-5 shrink-0" />;
    if (sub === "Project Overview") return <FileText className="w-5 h-5 shrink-0" />;
    if (sub === "Gold Loan") return <Coins className="w-5 h-5 shrink-0" />;
    if (sub === "Credit Card") return <CreditCard className="w-5 h-5 shrink-0" />;
    if (sub === "Booking Agent") return <Sparkles className="w-5 h-5 shrink-0" />;
    // Hotel agents
    if (sub === "Hotel Reservation Agent") return <BedDouble className="w-5 h-5 shrink-0" />;
    if (sub === "Guest Support Agent") return <LifeBuoy className="w-5 h-5 shrink-0" />;
    if (sub === "Event & Banquet Booking Agent") return <PartyPopper className="w-5 h-5 shrink-0" />;
    if (sub === "Promotional Sales Agent") return <Megaphone className="w-5 h-5 shrink-0" />;
    if (sub === "Guest Feedback & Review Agent") return <Star className="w-5 h-5 shrink-0" />;
    return <HelpCircle className="w-5 h-5 shrink-0" />;
  };

  const filteredCustomers = customers.filter((c) => {
    const q = customerSearch.toLowerCase();
    return (
      c.full_name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.org_name.toLowerCase().includes(q)
    );
  });

  const handleSelectCustomer = (c: CustomerUser) => {
    setSelectedCustomer(c);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSystemPrompt("");
    setDropdownOpen(false);
    setCustomerSearch("");
    setPlivoNumberInput(c.plivo_number || "");
    setTwilioNumberInput(c.twilio_number || "");
    setTelephonyProvider(c.telephony_provider || "plivo");
    fetchCatalogOptions(c.org_id);
  };

  const handleUpdateTelephonyConfig = async () => {
    if (!token || !selectedCustomer) return;
    setUpdatingPlivoNumber(true);
    try {
      await apiFetch(
        `/superadmin/customers/${selectedCustomer.id}/plivo-number`,
        "PUT",
        {
          plivo_number: plivoNumberInput.trim(),
          twilio_number: twilioNumberInput.trim(),
          telephony_provider: telephonyProvider
        },
        token
      );
      showToast("Telephony settings updated successfully!", "success");
      // Update local state in list and current selection
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === selectedCustomer.id
            ? {
                ...c,
                plivo_number: plivoNumberInput.trim(),
                twilio_number: twilioNumberInput.trim(),
                telephony_provider: telephonyProvider
              }
            : c
        )
      );
      setSelectedCustomer((prev) =>
        prev
          ? {
              ...prev,
              plivo_number: plivoNumberInput.trim(),
              twilio_number: twilioNumberInput.trim(),
              telephony_provider: telephonyProvider
            }
          : null
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update telephony configuration.", "error");
    } finally {
      setUpdatingPlivoNumber(false);
    }
  };

  // A single category card (used for both the vendor's industry and the rest).
  const renderCatCard = (cat: CatalogCategory) => {
    const isGlobal = cat.is_global;
    return (
      <div
        key={cat.name}
        onClick={() => { setSelectedCategory(cat.name); setSelectedSubcategory(null); }}
        className={`p-6 rounded-3xl border transition-all duration-350 cursor-pointer text-center group flex flex-col items-center justify-center space-y-4 relative ${
          selectedCategory === cat.name
            ? isGlobal ? "border-slate-800 bg-slate-50 shadow-md font-bold" : "border-indigo-800 bg-indigo-50/40 shadow-md font-bold"
            : isGlobal ? "border-slate-200 bg-white hover:border-slate-800" : "border-indigo-200 bg-white hover:border-indigo-800"
        }`}
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.name, isGlobal); }}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-600 transition duration-150 cursor-pointer z-10"
          title="Delete Category"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-3xs ${
          selectedCategory === cat.name
            ? isGlobal ? "bg-slate-900 text-white" : "bg-indigo-900 text-white"
            : isGlobal ? "bg-slate-50 text-slate-900 group-hover:bg-slate-900 group-hover:text-white" : "bg-indigo-50 text-indigo-900 group-hover:bg-indigo-900 group-hover:text-white"
        }`}>
          {isGlobal ? catIcon(cat.name) : <Sparkles className="w-7 h-7" />}
        </div>
        <div>
          <h3 className="text-base font-extrabold text-slate-900">{cat.name}</h3>
          <p className="text-xs text-slate-400 font-medium mt-1">{CATEGORY_DESC[cat.name] || (isGlobal ? "Industry vertical" : "Custom business vertical")}</p>
          <p className={`text-[9px] font-bold mt-1 uppercase tracking-wide ${isGlobal ? "text-emerald-600" : "text-indigo-650"}`}>{isGlobal ? "Shared · All users" : "Custom · This account only"}</p>
        </div>
      </div>
    );
  };
  const vendorCat = catalogOptions.find((c) => c.name === vendorIndustry);
  const otherCats = catalogOptions.filter((c) => c.name !== vendorIndustry);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Toast */}
      {toastMessage && (
        <div
          className={`fixed top-6 right-6 z-[9999] flex items-center space-x-2.5 px-5 py-3 rounded-xl shadow-xl text-xs font-bold text-white transition-all duration-300 animate-slide-in ${
            toastType === "success"
              ? "bg-slate-900 border border-slate-800"
              : "bg-red-600 border border-red-500"
          }`}
        >
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
              toastType === "success" ? "bg-emerald-500" : "bg-red-400"
            }`}
          >
            {toastType === "success" ? "✓" : "✕"}
          </span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-slate-200/60 select-none">
        <div>
          <h1 className="text-2xl font-black text-[#0f2e5c] tracking-tight">AI Agent Catalog</h1>
          <p className="text-xs text-slate-500 font-semibold mt-1 leading-relaxed">
            Configure default master prompts across vertical templates. Spawned voice agents inherit these definitions.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 border border-slate-200/50 rounded-lg px-3 py-1.5 shadow-3xs">
          <Sparkles className="w-3.5 h-3.5 text-slate-500 animate-pulse" />
          <span>Wizard Mode</span>
        </div>
      </div>

      {/* ─── Category & Subcategory Requests from Customers ─────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-3xs space-y-4 select-none">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-650" />
              <span>Category / Subcategory Requests ({requests.filter(r => r.status === "pending").length} pending)</span>
            </h2>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
              Review custom categories requested by customer organizations and provision system prompts.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchRequests}
            disabled={loadingRequests}
            className="text-[10px] font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
          >
            {loadingRequests ? <Loader2 className="w-3 h-3 animate-spin" /> : "Refresh"}
          </button>
        </div>

        {requests.filter(r => r.status === "pending").length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 font-bold">
            No pending category/subcategory requests.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                  <th className="pb-2.5 pr-4">Requester</th>
                  <th className="pb-2.5 pr-4">Requested Category</th>
                  <th className="pb-2.5 pr-4">Requested Subcategory</th>
                  <th className="pb-2.5 pr-4">Status</th>
                  <th className="pb-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {requests.filter(r => r.status === "pending").map((req) => (
                  <tr key={req.id} className="text-xs font-semibold text-slate-700">
                    <td className="py-3 pr-4">
                      <div className="font-bold text-slate-900">{req.org_name}</div>
                      <div className="text-[10px] text-slate-400 font-medium">{req.requester_name} ({req.requester_email})</div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold">
                        {req.category}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="bg-slate-50 border border-slate-200/60 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                        {req.subcategory}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        req.status === "approved" ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : req.status === "rejected" ? "bg-red-50 text-red-700 border border-red-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="py-3 text-right flex items-center justify-end gap-2">
                      {req.status === "pending" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRequest(req);
                              setApprovePrompt(DEFAULT_TEMPLATES_MAP[req.category]?.[req.subcategory] || "");
                              setApproveModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-950 text-white rounded text-[10px] font-bold cursor-pointer transition shadow-xs"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectRequest(req.id)}
                            className="px-2.5 py-1 border border-slate-200 hover:bg-slate-50 text-slate-650 rounded text-[10px] font-bold cursor-pointer transition shadow-xs"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          Processed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Customer Dropdown Selector ─────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-900 uppercase tracking-wider">Select Customer</p>
              <p className="text-[10px] text-slate-400 font-semibold">
                Prompts will be scoped to this account
              </p>
            </div>
          </div>

          {/* Dropdown */}
          <div className="relative flex-1 sm:max-w-sm" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => {
                setDropdownOpen((o) => !o);
                setCustomerSearch("");
              }}
              className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                selectedCustomer
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-400"
              }`}
            >
              <span className="flex items-center gap-2 truncate min-w-0">
                {selectedCustomer ? (
                  <>
                    <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[11px] font-black shrink-0">
                      {(selectedCustomer.full_name || selectedCustomer.email || "?")
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                    <span className="truncate">
                      {selectedCustomer.full_name || selectedCustomer.email}
                      {selectedCustomer.org_name && (
                        <span className="opacity-60 font-medium ml-1.5">
                          · {selectedCustomer.org_name}
                        </span>
                      )}
                    </span>
                  </>
                ) : loadingCustomers ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Loading customers…
                  </span>
                ) : (
                  "— Select a customer account —"
                )}
              </span>
              <ChevronDown
                className={`w-4 h-4 shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""} ${
                  selectedCustomer ? "text-white/60" : "text-slate-400"
                }`}
              />
            </button>

            {/* Dropdown panel */}
            {dropdownOpen && (
              <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
                {/* Search */}
                <div className="p-3 border-b border-slate-100">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Search by name, email, or company…"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 placeholder-slate-400 outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800/15 transition"
                    />
                  </div>
                </div>

                {/* Options list */}
                <ul className="max-h-60 overflow-y-auto py-1.5">
                  {filteredCustomers.length === 0 ? (
                    <li className="px-4 py-6 text-center text-xs text-slate-400 font-semibold">
                      {customerSearch ? "No customers match your search." : "No customer accounts found."}
                    </li>
                  ) : (
                    filteredCustomers.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectCustomer(c)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition group ${
                            selectedCustomer?.id === c.id ? "bg-slate-100" : ""
                          }`}
                        >
                          {/* Avatar */}
                          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-black text-xs shrink-0 group-hover:bg-slate-900 group-hover:text-white transition-all">
                            {(c.full_name || c.email || "?").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {c.full_name || "—"}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate font-medium">
                              {c.email}
                              {c.org_name && (
                                <span className="ml-1.5 text-slate-400">
                                  · <Building2 className="w-2.5 h-2.5 inline mb-0.5" /> {c.org_name}
                                </span>
                              )}
                            </p>
                          </div>
                          {selectedCustomer?.id === c.id && (
                            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Telephony Configuration Input */}
          {selectedCustomer && (
            <div className="flex items-center gap-3 sm:ml-auto shrink-0 select-none bg-slate-50 border border-slate-200/50 p-2 px-3 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Telephony Provider</span>
                  <select
                    value={telephonyProvider}
                    onChange={(e) => setTelephonyProvider(e.target.value)}
                    className="mt-1 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:border-slate-800 transition cursor-pointer"
                  >
                    <option value="plivo">Plivo</option>
                    <option value="twilio">Twilio</option>
                  </select>
                </div>
                
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                    {telephonyProvider === "plivo" ? "Plivo Phone Number" : "Twilio Phone Number"}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      value={telephonyProvider === "plivo" ? plivoNumberInput : twilioNumberInput}
                      onChange={(e) => {
                        if (telephonyProvider === "plivo") {
                          setPlivoNumberInput(e.target.value);
                        } else {
                          setTwilioNumberInput(e.target.value);
                        }
                      }}
                      placeholder="e.g. +12135550199"
                      className="w-36 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:border-slate-800 transition"
                    />
                    <button
                      type="button"
                      onClick={handleUpdateTelephonyConfig}
                      disabled={updatingPlivoNumber}
                      className="h-8 px-3.5 bg-slate-900 hover:bg-slate-950 disabled:opacity-50 text-white text-[10px] font-bold rounded-xl cursor-pointer shadow-3xs flex items-center gap-1 transition-all"
                    >
                      {updatingPlivoNumber ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      <span>Save</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Wizard (only shown after a customer is selected) ────────── */}
      {selectedCustomer && (
        <>
          {/* Stepper */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs flex items-center justify-between select-none">
            <div className="flex items-center space-x-8 w-full justify-around text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory(null);
                  setSelectedSubcategory(null);
                }}
                className={`flex items-center space-x-2.5 transition cursor-pointer ${
                  currentStep >= 1 ? "text-slate-900 font-bold" : "text-slate-400"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                    currentStep === 1 ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-800"
                  }`}
                >
                  1
                </span>
                <span>Vertical Category</span>
              </button>

              <ChevronRight className="w-4 h-4 text-slate-300" />

              <button
                type="button"
                disabled={!selectedCategory}
                onClick={() => setSelectedSubcategory(null)}
                className={`flex items-center space-x-2.5 transition ${
                  selectedCategory
                    ? "cursor-pointer text-slate-900 font-bold"
                    : "cursor-not-allowed text-slate-400"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                    currentStep === 2
                      ? "bg-slate-900 text-white"
                      : currentStep > 2
                      ? "bg-slate-100 text-slate-800"
                      : "bg-slate-150 text-slate-400"
                  }`}
                >
                  2
                </span>
                <span>Use Case Subcategory</span>
              </button>

              <ChevronRight className="w-4 h-4 text-slate-300" />

              <div
                className={`flex items-center space-x-2.5 ${
                  currentStep === 3 ? "text-slate-900 font-bold" : "text-slate-400"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                    currentStep === 3 ? "bg-slate-900 text-white" : "bg-slate-150 text-slate-400"
                  }`}
                >
                  3
                </span>
                <span>Master System Prompt</span>
              </div>
            </div>
          </div>

          {/* Step Content */}
          <div className="w-full">
            {/* STEP 1: SELECT CATEGORY */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-fade-in py-6">
                <div className="flex items-center justify-between gap-3 flex-wrap max-w-4xl mx-auto w-full">
                  <div className="text-left space-y-1 select-none">
                    <h2 className="text-base font-black text-slate-800 uppercase tracking-wider">
                      Choose Category Vertical
                    </h2>
                    <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                      Select the vertical sector you want to configure master prompt configurations for{" "}
                      <span className="font-bold text-slate-700">
                        {selectedCustomer.full_name || selectedCustomer.email}
                      </span>
                      .
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openAddModal("new_category")}
                    className="h-8 px-3 border border-dashed border-slate-300 hover:border-slate-500 hover:bg-slate-50 text-slate-655 text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-650" />
                    <span>Add New Category</span>
                  </button>
                </div>

                {catalogLoading ? (
                  <div className="flex items-center justify-center text-slate-400 text-xs py-12">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading categories...
                  </div>
                ) : catalogOptions.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    No categories found. Click &quot;Add New Category&quot; to create one.
                  </div>
                ) : (
                  <div className="max-w-4xl mx-auto pt-2 space-y-8">
                    {vendorCat && (
                      <div className="space-y-3">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-xs font-black text-slate-800 uppercase tracking-wider">{selectedCustomer.full_name || selectedCustomer.org_name || selectedCustomer.email}</span>
                          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">&middot; {vendorIndustry} &mdash; onboarded industry</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {renderCatCard(vendorCat)}
                        </div>
                      </div>
                    )}
                    <div className="space-y-3">
                      {vendorCat && (
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-t border-slate-100 pt-5">Other categories</div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {otherCats.map((cat) => renderCatCard(cat))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: SELECT SUBCATEGORY */}
            {currentStep === 2 && selectedCategory && (
              <div className="space-y-6 animate-fade-in py-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 select-none max-w-4xl mx-auto w-full">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(null)}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Categories</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openAddModal("existing_category")}
                      className="h-8 px-3 border border-dashed border-slate-300 hover:border-slate-500 hover:bg-slate-50 text-slate-655 text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5 text-indigo-650" />
                      <span>Add Subcategory</span>
                    </button>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 border border-slate-200 px-3 py-1 rounded-md text-slate-550">
                      Category: {selectedCategory}
                    </span>
                  </div>
                </div>

                <div className="text-center space-y-1 select-none pt-2">
                  <h2 className="text-base font-black text-slate-800 uppercase tracking-wider">
                    Select Use Case Scenario
                  </h2>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    Choose the target use case template configuration for your {selectedCategory} vertical.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto pt-4 justify-center">
                  {(catalogOptions.find((c) => c.name === selectedCategory)?.subcategories || []).map((sub) => (
                    <div
                      key={sub.name}
                      onClick={() => setSelectedSubcategory(sub.name)}
                      className={`p-6 rounded-2xl border text-left transition transform hover:-translate-y-0.5 cursor-pointer relative overflow-hidden group flex flex-col justify-between h-36 ${
                        selectedSubcategory === sub.name
                          ? sub.is_custom
                            ? "border-indigo-700 bg-indigo-50/40 shadow-sm font-bold"
                            : "border-slate-800 bg-slate-50 shadow-sm font-bold"
                          : "border-slate-200 bg-white hover:border-slate-350"
                      }`}
                    >
                      {sub.is_custom && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSubcategory(selectedCategory, sub.name);
                          }}
                          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-650 transition duration-150 cursor-pointer z-10"
                          title="Delete Subcategory"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <div className={`w-12 h-12 rounded-xl text-slate-500 group-hover:bg-slate-900 group-hover:text-white flex items-center justify-center transition shadow-3xs ${
                        selectedSubcategory === sub.name
                          ? sub.is_custom ? "bg-indigo-700 text-white" : "bg-slate-900 text-white"
                          : "bg-slate-50 text-slate-500 group-hover:bg-slate-900 group-hover:text-white"
                      }`}>
                        {getSubcategoryIcon(sub.name)}
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-850">{sub.name}</h4>
                        <p className={`text-[10px] font-bold mt-1 ${sub.is_custom ? "text-indigo-650" : "text-slate-400"}`}>
                          {sub.is_custom ? "This account only" : "Shared · All users"}
                        </p>
                      </div>
                      {selectedSubcategory === sub.name && (
                        <div className={`absolute top-0 right-0 w-1.5 h-full ${sub.is_custom ? "bg-indigo-700" : "bg-slate-900"}`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3: PROMPT EDITOR */}
            {currentStep === 3 && selectedCategory && selectedSubcategory && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 select-none">
                  <button
                    type="button"
                    onClick={() => setSelectedSubcategory(null)}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Use Cases</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full tracking-wider flex items-center gap-1">
                      <User className="w-2.5 h-2.5" />
                      {selectedCustomer.full_name || selectedCustomer.email}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[9px] font-black uppercase bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded-full tracking-wider">
                      {selectedCategory}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[9px] font-black uppercase bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full tracking-wider">
                      {selectedSubcategory}
                    </span>
                  </div>
                </div>

                {/* Prompt Editor */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-4 relative text-left">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 select-none gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                        Master Prompt
                      </h3>
                      {/* Outbound / Inbound selector */}
                      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                        {(["outbound", "inbound"] as const).map((tab) => (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setPromptTab(tab)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                              promptTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            }`}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-455 font-mono font-bold">
                      {(promptTab === "inbound" ? inboundPrompt : systemPrompt).length} characters
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-400 font-semibold -mt-1">
                    {promptTab === "inbound"
                      ? "Used when this agent ANSWERS an incoming call. If left blank, the outbound prompt is used as a fallback."
                      : "Used when this agent DIALS OUT (campaigns). This is the primary prompt."}
                  </p>

                  <div className="relative">
                    {loadingPrompt && (
                      <div className="absolute inset-0 bg-white/70 backdrop-blur-2xs flex items-center justify-center z-10 rounded-2xl">
                        <div className="flex items-center space-x-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
                          <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                          <span>Synchronizing template data...</span>
                        </div>
                      </div>
                    )}

                    <textarea
                      value={promptTab === "inbound" ? inboundPrompt : systemPrompt}
                      onChange={(e) => (promptTab === "inbound" ? setInboundPrompt(e.target.value) : setSystemPrompt(e.target.value))}
                      placeholder={promptTab === "inbound"
                        ? `Define how the ${selectedCategory} - ${selectedSubcategory} agent should ANSWER inbound calls...`
                        : `Define core guidelines, directives, and system rules for the ${selectedCategory} - ${selectedSubcategory} agent...`}
                      rows={14}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-700 font-mono leading-relaxed outline-none focus:bg-white focus:border-slate-800 focus:ring-1 focus:ring-slate-800/20 transition-all placeholder-slate-400 resize-y"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyToClipboard}
                        disabled={!systemPrompt}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[10px] font-bold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-bold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Instructions</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (selectedCategory && selectedSubcategory) {
                            const template = DEFAULT_TEMPLATES_MAP[selectedCategory]?.[selectedSubcategory];
                            if (template) {
                              setSystemPrompt(template);
                              showToast("Loaded professional template prompt!", "success");
                            }
                          }
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[10px] font-bold text-slate-800 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-slate-650" />
                        <span>Generate Template</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleSavePrompt}
                      disabled={savingPrompt || loadingPrompt}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-950 transition cursor-pointer shadow-sm hover:shadow-md border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingPrompt ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Master Prompt</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Guidelines */}
                <div className="p-5 bg-white border border-slate-200 rounded-3xl text-slate-650 shadow-3xs space-y-3 text-left">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider block select-none">
                    Guidelines for Catalog Templates
                  </h4>
                  <ul className="list-disc list-inside text-xs text-slate-500 space-y-1.5 pl-1 leading-relaxed">
                    <li>Explicitly state the AI agent&apos;s name, persona, and core business vertical.</li>
                    <li>Define concrete guidelines on what information the agent is allowed to provide and where to stop.</li>
                    <li>Write clear instructions on how the agent should handle out-of-boundary questions.</li>
                    <li>Always save your changes to propagate them to all newly created agents in the platform.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Empty state — no customer selected yet */}
      {!selectedCustomer && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-300 gap-4 select-none">
          <User className="w-12 h-12 opacity-30" />
          <p className="text-sm font-bold text-slate-400">
            Select a customer account above to begin configuring their AI Agent Catalog.
          </p>
        </div>
      )}

      {/* Add Category / Subcategory Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-5 animate-fade-in text-left">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  {addMode === "new_category" ? "Add New Category" : "Add Subcategory"}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Custom entries are saved to this customer account only and appear in their AI agent setup.
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
                  setAddCategory(selectedCategory || "");
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
                  {catalogOptions.map((c) => (
                    <option key={c.name} value={c.name}>{c.name} ({c.is_global ? "shared" : "this account"})</option>
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

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">System Prompt</label>
              <textarea
                value={addSystemPrompt}
                onChange={(e) => setAddSystemPrompt(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-slate-500 resize-y"
                placeholder="Describe the agent role, objectives, and conversation rules..."
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
                disabled={addSaving || !addCategory.trim() || !addSubcategory.trim() || !addSystemPrompt.trim()}
                className="h-10 px-5 bg-slate-900 hover:bg-slate-950 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2"
              >
                {addSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{addSaving ? "Saving..." : "Add for Customer"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Request Modal */}
      {approveModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-5 animate-fade-in text-left">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Approve Category/Subcategory Request
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Approve requested category or subcategory for <strong>{selectedRequest.org_name}</strong>. Provide the master system prompt to activate it.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setApproveModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">Category</span>
                  <span className="text-slate-900 font-extrabold">{selectedRequest.category}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">Subcategory</span>
                  <span className="text-slate-900 font-extrabold">{selectedRequest.subcategory}</span>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Master System Prompt *</label>
                <textarea
                  value={approvePrompt}
                  onChange={(e) => setApprovePrompt(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-slate-500 resize-y"
                  placeholder="Paste or enter the master system prompt to ground agents on this subcategory..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setApproveModalOpen(false)}
                className="h-10 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveRequest}
                disabled={approveSaving || !approvePrompt.trim()}
                className="h-10 px-5 bg-slate-900 hover:bg-slate-950 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer"
              >
                {approveSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{approveSaving ? "Approving..." : "Approve & Activate"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
