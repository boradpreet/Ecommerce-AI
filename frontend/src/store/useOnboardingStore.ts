import { create } from "zustand";

export interface TeamMember {
  id: string;
  email: string;
  role: string;
  status: "ACTIVE" | "PENDING" | "INVITED";
}

export interface OnboardingState {
  isLoggedIn: boolean;
  step: number;
  
  // Sign-in state
  email: string;
  fullName: string;

  // Step 1: Company Profile (Business Details)
  businessName: string;
  websiteUrl: string;
  industry: string;
  taxId: string;
  businessType: string;
  companySize: string;
  streetAddress: string;
  country: string;
  stateProvince: string;
  
  // Step 2: Voice Identity / Agent Customization
  agentName: string;
  agentAvatar: number;  // ID from 1 to 8
  agentPersonality: string;  // Professional, Warm, Energetic, Authoritative
  agentLanguage: string;
  agentAccent: string;
  selectedVoice: string;
  voiceSpeakingRate: number;
  voicePitchVariance: number;
  voiceOutputVolume: number;
  voiceTestScript: string;
  voiceGenderFilter: string;
  voiceLanguageFilter: string;
  voiceAccentFilter: string;
  voiceSearchQuery: string;

  // Step 3: Regional Settings
  timezoneLock: boolean;

  // Step 4: Industry & Compliance settings
  selectedIndustry: string;
  complianceHipaa: boolean;
  
  // Step 5: Workflow Design
  selectedWorkflows: string[];
  
  // Step 6: Prompt Setup & Guardrails
  agentSystemPrompt: string;
  
  // Step 7: Test Sandbox Settings
  sandboxLatency: number;

  // Step 8: Team Access
  teamMembers: TeamMember[];

  // Step 9: Data Residency
  residencyLocation: string;

  // Step 10: Knowledge Base
  kbFiles: string[];
  kbUrls: string[];
  kbFaqs: string;

  // Step 11: Billing Plan select
  selectedPlan: string;  // free, starter, growth, professional, enterprise
  billingCycle: "monthly" | "annual";
  voiceMinutes: number;

  // Step 12: Payment card details
  cardholderName: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;

  // Step 13: Monitoring
  slackWebhook: string;

  // Step 14: White-labeling
  brandColor: string;

  // Step 15: Campaign Setup & Launch
  campaignName: string;
  callDirection: string; // OUTBOUND (dial leads) | INBOUND (answer incoming)

  // Legacy org fields
  orgName: string;
  orgSlug: string;
  teamSize: string;

  // Global Actions
  setIsLoggedIn: (isLoggedIn: boolean) => void;
  setStep: (step: number) => void;
  setAccountInfo: (emailOrFullName: string, optionalEmail?: string) => void;
  setBusinessDetails: (details: Partial<OnboardingState>) => void;
  setSelectedIndustry: (industry: string, complianceHipaa: boolean) => void;
  toggleWorkflow: (workflow: string) => void;
  addTeamMember: (email: string, role: string) => void;
  setCampaignInfo: (campaignName: string) => void;
  setVoiceInfo: (selectedVoice: string) => void;
  setOrgInfo: (orgName: string, orgSlug: string, teamSize: string) => void; // Legacy
  
  companyLogo: string | null;
  toast: { message: string; type: "success" | "error" | "info" } | null;
  triggerToast: (message: string, type?: "success" | "error" | "info") => void;
  clearToast: () => void;
  
  // Theme Toggle
  theme: "light" | "dark";
  toggleTheme: () => void;
  setTheme: (theme: "light" | "dark") => void;

  // New actions
  addKbFile: (fileName: string) => void;
  addKbUrl: (url: string) => void;
  setKbFaqs: (faqs: string) => void;
  resetOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  isLoggedIn: false,
  step: 1,
  
  email: "",
  fullName: "Enterprise User",
  companyLogo: null,
  toast: null,
  theme: "light",
  
  businessName: "",
  websiteUrl: "",
  industry: "",
  taxId: "",
  businessType: "Select Type",
  companySize: "1-10 Employees",
  streetAddress: "",
  country: "",
  stateProvince: "",
  
  agentName: "Evelyn",
  agentAvatar: 3,
  agentPersonality: "Professional & Precise",
  agentLanguage: "English (United States)",
  agentAccent: "None",
  selectedVoice: "",
  voiceSpeakingRate: 1.0,
  voicePitchVariance: 0,
  voiceOutputVolume: 85,
  voiceTestScript: "Hello! I am your new Voqly AI agent. How can I assist you with your operations today?",
  voiceGenderFilter: "All Genders",
  voiceLanguageFilter: "All Languages",
  voiceAccentFilter: "All Accents",
  voiceSearchQuery: "",

  timezoneLock: true,

  selectedIndustry: "",
  complianceHipaa: false,
  
  selectedWorkflows: [],
  
  agentSystemPrompt: "",
  
  sandboxLatency: 350,

  teamMembers: [],

  residencyLocation: "",

  kbFiles: [],
  kbUrls: [],
  kbFaqs: "",

  selectedPlan: "",
  billingCycle: "monthly",
  voiceMinutes: 0,

  cardholderName: "",
  cardNumber: "",
  expiryDate: "",
  cvv: "",

  slackWebhook: "",
  brandColor: "",

  campaignName: "",
  callDirection: "OUTBOUND",

  // Legacy org states
  orgName: "",
  orgSlug: "",
  teamSize: "1-10",

  setIsLoggedIn: (isLoggedIn) => set({ isLoggedIn }),
  setStep: (step) => set({ step }),
  
  setAccountInfo: (emailOrFullName, optionalEmail) => set(() => {
    if (optionalEmail) {
      return { fullName: emailOrFullName, email: optionalEmail };
    } else {
      return { email: emailOrFullName };
    }
  }),
  
  setBusinessDetails: (details) => set((state) => ({ ...state, ...details })),
  
  setSelectedIndustry: (selectedIndustry, complianceHipaa) => set({ selectedIndustry, complianceHipaa }),
  
  toggleWorkflow: (workflow) => set((state) => {
    const isSelected = state.selectedWorkflows.includes(workflow);
    const updated = isSelected
      ? state.selectedWorkflows.filter((w) => w !== workflow)
      : [...state.selectedWorkflows, workflow];
    return { selectedWorkflows: updated };
  }),

  addTeamMember: (email, role) => set((state) => {
    const newMember: TeamMember = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      role,
      status: "INVITED",
    };
    return { teamMembers: [...state.teamMembers, newMember] };
  }),

  setCampaignInfo: (campaignName) => set({ campaignName }),
  setVoiceInfo: (selectedVoice) => set({ selectedVoice }),
  setOrgInfo: (orgName, orgSlug, teamSize) => set({ orgName, orgSlug, teamSize }),

  addKbFile: (fileName) => set((state) => ({ kbFiles: [...state.kbFiles, fileName] })),
  addKbUrl: (url) => set((state) => ({ kbUrls: [...state.kbUrls, url] })),
  setKbFaqs: (faqs) => set({ kbFaqs: faqs }),
  triggerToast: (message, type = "success") => set({ toast: { message, type } }),
  clearToast: () => set({ toast: null }),
  
  toggleTheme: () => set((state) => {
    const nextTheme = state.theme === "light" ? "dark" : "light";
    if (typeof window !== "undefined") {
      localStorage.setItem("voqly-theme", nextTheme);
      if (nextTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
    return { theme: nextTheme };
  }),
  setTheme: (theme) => set(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("voqly-theme", theme);
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
    return { theme };
  }),
  
  resetOnboarding: () => set({
    isLoggedIn: false,
    step: 1,
    email: "",
    fullName: "Enterprise User",
    companyLogo: null,
    toast: null,
    businessName: "",
    websiteUrl: "",
    industry: "",
    taxId: "",
    businessType: "Select Type",
    companySize: "1-10 Employees",
    streetAddress: "",
    country: "",
    stateProvince: "",
    agentName: "Evelyn",
    agentAvatar: 3,
    agentPersonality: "Professional & Precise",
    agentLanguage: "English (United States)",
    agentAccent: "None",
    selectedVoice: "",
    voiceSpeakingRate: 1.0,
    voicePitchVariance: 0,
    voiceOutputVolume: 85,
    voiceTestScript: "Hello! I am your new Voqly AI agent. How can I assist you with your operations today?",
    voiceGenderFilter: "All Genders",
    voiceLanguageFilter: "All Languages",
    voiceAccentFilter: "All Accents",
    voiceSearchQuery: "",
    timezoneLock: true,
    selectedIndustry: "",
    complianceHipaa: false,
    selectedWorkflows: [],
    agentSystemPrompt: "",
    sandboxLatency: 350,
    teamMembers: [],
    residencyLocation: "",
    kbFiles: [],
    kbUrls: [],
    kbFaqs: "",
    selectedPlan: "",
    billingCycle: "monthly",
    voiceMinutes: 0,
    cardholderName: "",
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    slackWebhook: "",
    brandColor: "",
    campaignName: "",
    callDirection: "OUTBOUND",
    orgName: "",
    orgSlug: "",
    teamSize: "1-10",
  }),
}));
