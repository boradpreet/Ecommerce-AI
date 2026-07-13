"use client";

import React, { useState, useRef, useEffect } from "react";
import { useOnboardingStore } from "src/store/useOnboardingStore";
import {
  Bot, ArrowRight, Loader2,
  Volume2, Play, Pause, Globe,
  Settings, Database, Phone, ArrowUpRight, ChevronRight, Search,
  Menu, X, ChevronDown, User, PhoneCall, Check, ShoppingBag,
  HeartPulse, Home, Landmark, ShieldCheck, GraduationCap, Plane, Hotel,
  UtensilsCrossed, Car, Users, Truck, RadioTower,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { SiteFooter } from "src/components/marketing/site-footer";
import { apiFetch } from "src/lib/api";

const demoDialogue = [
  { speaker: "caller", text: "Hello! Is this Voqly Support?" },
  { speaker: "agent", text: "Yes! I\u0027m Evelyn, your AI voice assistant. How can I help you today?" },
  { speaker: "caller", text: "I want to create an automated sales campaign." },
  { speaker: "agent", text: "Perfect! I can configure that right now. Let\u0027s get started." },
  { speaker: "caller", text: "Awesome! How fast is the integration?" },
  { speaker: "agent", text: "Under 5 minutes. You\u0027ll get local SIP numbers instantly!" },
  { speaker: "caller", text: "Wow, that sounds incredibly simple!" }
];

const heroAgents = [
  { name: "Evelyn", sector: "SaaS Support", emoji: "🎧", locale: "en-US",
    callerLine: "Hi, I need help configuring my account dashboard.",
    agentLine: "Of course! I'm Evelyn, your AI support agent. I can set that up for you right now.",
    accentText: "text-orange-600", accentSoftText: "text-orange-500", accentBg: "bg-orange-50",
    accentBorder: "border-orange-100", accentDot: "bg-orange-500", accentBar: "bg-orange-500/80", accentRing: "border-orange-500/15" },
  { name: "Sarah", sector: "E-Commerce", emoji: "🛍️", locale: "en-US",
    callerLine: "I left a few items in my cart earlier today.",
    agentLine: "Hi! This is Sarah from Voqly AI. I can help you finish checkout and unlock a quick discount.",
    accentText: "text-rose-600", accentSoftText: "text-rose-500", accentBg: "bg-rose-50",
    accentBorder: "border-rose-100", accentDot: "bg-rose-500", accentBar: "bg-rose-500/80", accentRing: "border-rose-500/15" },
  { name: "Michael", sector: "Real Estate", emoji: "🏠", locale: "en-US",
    callerLine: "I'm interested in the property listing I saw online.",
    agentLine: "Great! I'm Michael, your AI real-estate assistant. Shall I schedule a virtual tour for you?",
    accentText: "text-sky-600", accentSoftText: "text-sky-500", accentBg: "bg-sky-50",
    accentBorder: "border-sky-100", accentDot: "bg-sky-500", accentBar: "bg-sky-500/80", accentRing: "border-sky-500/15" },
  { name: "Clara", sector: "Healthcare", emoji: "⚕️", locale: "en-GB",
    callerLine: "I'd like to book an appointment with my doctor.",
    agentLine: "Hello, I'm Clara from the Voqly AI health desk. Let me find the next available slot for you.",
    accentText: "text-emerald-600", accentSoftText: "text-emerald-500", accentBg: "bg-emerald-50",
    accentBorder: "border-emerald-100", accentDot: "bg-emerald-500", accentBar: "bg-emerald-500/80", accentRing: "border-emerald-500/15" },
  { name: "Arjun", sector: "Finance Desk", emoji: "💳", locale: "en-IN",
    callerLine: "I'm calling about a pending invoice on my account.",
    agentLine: "Hello, I'm Arjun, your AI finance assistant. I can securely process that payment for you now.",
    accentText: "text-violet-600", accentSoftText: "text-violet-500", accentBg: "bg-violet-50",
    accentBorder: "border-violet-100", accentDot: "bg-violet-500", accentBar: "bg-violet-500/80", accentRing: "border-violet-500/15" },
];

const callDemos = [
  {
    id: "voice",
    label: "Sales Call",
    src: "/ai-voice-call.html",
    ratio: "aspect-[3/2]",
    title: "Voqly AI Sales Call",
    desc: "Watch how a Voqly AI agent greets the caller, qualifies the lead, and books the meeting end to end - exactly what your customers experience on a real call.",
  },
  {
    id: "health",
    label: "Health Call",
    src: "/health-demo/index.html",
    ratio: "aspect-video",
    title: "Voqly AI Health Call",
    desc: "An AI health assistant checks the patient's symptoms and live vitals, then books a video consult with the right doctor - fully autonomously.",
  },
  {
    id: "finance",
    label: "Finance Call",
    src: "/finance-demo/index.html",
    ratio: "aspect-video",
    title: "Voqly AI Wealth Advisor",
    desc: "An AI wealth advisor learns the client's goal, recommends a portfolio, and starts a monthly SIP - all on a single secure call.",
  },
];

// One entry per catalog industry (keep in sync with app/services/industry_catalog.py).
const agentSectors = [
  { id: "E-commerce", label: "E-commerce", icon: ShoppingBag, agent: "Mia",
    tagline: "Recovers abandoned carts, answers order questions, and upsells on the call.",
    chips: ["Cart recovery", "Order status", "Upsell"] },
  { id: "Healthcare", label: "Healthcare", icon: HeartPulse, agent: "Clara",
    tagline: "Books appointments, sends reminders, and handles patient intake securely.",
    chips: ["Appointment booking", "Reminders", "Patient intake"] },
  { id: "Real Estate", label: "Real Estate", icon: Home, agent: "Michael",
    tagline: "Qualifies buyers, books site visits, and keeps every lead warm.",
    chips: ["Lead qualification", "Site visits", "Follow-ups"] },
  { id: "Banking & Finance", label: "Banking & Finance", icon: Landmark, agent: "Arjun",
    tagline: "Handles payment reminders, KYC and card offers — compliance-safe.",
    chips: ["Payment reminders", "KYC checks", "Card offers"] },
  { id: "Insurance", label: "Insurance", icon: ShieldCheck, agent: "Neha",
    tagline: "Renews policies, shares claim status, and qualifies new leads.",
    chips: ["Policy renewals", "Claim status", "Lead gen"] },
  { id: "Education", label: "Education", icon: GraduationCap, agent: "Evelyn",
    tagline: "Answers admissions queries and follows up with prospective students instantly.",
    chips: ["Admissions", "Follow-ups", "Fee reminders"] },
  { id: "Travel & Hospitality", label: "Travel & Hospitality", icon: Plane, agent: "Leo",
    tagline: "Confirms bookings, shares flight updates, and sells travel packages.",
    chips: ["Bookings", "Flight updates", "Packages"] },
  { id: "Hotel", label: "Hotel", icon: Hotel, agent: "Aria",
    tagline: "Books rooms, supports guests, handles events, and collects post-stay reviews.",
    chips: ["Room booking", "Guest support", "Reviews"] },
  { id: "Restaurants", label: "Restaurants", icon: UtensilsCrossed, agent: "Sofia",
    tagline: "Takes table reservations, confirms orders, and grows loyalty with every guest.",
    chips: ["Reservations", "Order confirm", "Loyalty"] },
  { id: "Automotive", label: "Automotive", icon: Car, agent: "Ryan",
    tagline: "Sends service reminders, books test drives, and follows up on sales.",
    chips: ["Service reminders", "Test drives", "Sales follow-up"] },
  { id: "Recruitment & HR", label: "Recruitment & HR", icon: Users, agent: "Sarah",
    tagline: "Screens candidates and schedules interviews around the clock, in any language.",
    chips: ["Screening", "Scheduling", "24/7"] },
  { id: "Logistics", label: "Logistics", icon: Truck, agent: "Max",
    tagline: "Tracks shipments, schedules pickups, and shares live delivery ETAs on every call.",
    chips: ["Shipment tracking", "Pickup scheduling", "ETA updates"] },
  { id: "Telecom", label: "Telecom", icon: RadioTower, agent: "Kabir",
    tagline: "Onboards subscribers, upsells plans, and reduces churn with proactive calls.",
    chips: ["Onboarding", "Plan upgrades", "Retention"] },
];

const faqs = [
  { q: "What is Voqly AI?", a: "Voqly AI is an AI calling platform that runs inbound and outbound phone conversations for you. Its voice agents qualify leads, answer support questions, follow up instantly, and book meetings - without needing human agents on the line." },
  { q: "How quickly can I get started?", a: "You can create an account and make your first AI call in under five minutes. Pick a ready-made industry agent or build your own, connect a number, and you are live - no engineering required." },
  { q: "Do I need any coding or technical skills?", a: "No. Voqly is fully no-code. You configure agents, prompts, voices and campaigns from a visual dashboard. Developers can optionally use our API for deeper integrations." },
  { q: "Which languages does Voqly support?", a: "Voqly speaks 10+ languages including English, Hindi, Spanish, Tamil, Telugu, French and German, with native-sounding neural voices and automatic language matching on every call." },
  { q: "How natural do the AI voices sound?", a: "Our neural voices use real emotion, inflection and timing with sub-320ms response latency, so conversations feel like a genuine back-and-forth instead of a robotic phone menu." },
  { q: "Can Voqly handle both inbound and outbound calls?", a: "Yes. Voqly handles inbound support and call routing as well as outbound campaigns like sales dialing, lead qualification, follow-ups and payment reminders - all from one platform." },
  { q: "Does it integrate with my CRM and tools?", a: "Yes. Sync contacts and outcomes with your CRM, push qualified leads automatically, check live calendars to book meetings, and log every call and transcript for your team." },
  { q: "Is Voqly secure and compliant?", a: "Compliance is built in - HIPAA, GDPR and TCPA-aligned controls, automatic do-not-call scrubbing and calling windows, consent capture, encryption in transit and at rest, and full audit logs." },
  { q: "How does pricing work?", a: "Start free with 100 AI calls and no credit card. Paid plans are monthly and pay-as-you-go - Starter, Growth and Scale - billed by connected call minutes. Upgrade, downgrade or cancel any time." },
  { q: "What counts as a call minute?", a: "Connected talk time, billed per second and rounded up. Ringing and unanswered calls do not count toward your usage." },
  { q: "Can I use my own phone numbers?", a: "Yes. Use Voqly-provisioned local numbers for higher answer rates, or connect your own SIP trunks and existing carrier numbers." },
  { q: "Can I customize what the agent says?", a: "Absolutely. Set the agent's persona, tone, scripts and knowledge base, test variations with A/B scripts, and keep refining using real post-call analytics." },
  { q: "When does a call escalate to a human?", a: "You decide. Agents handle common tasks end-to-end and hand off to a human - with full call context - only when a conversation truly needs it, so your team focuses on what matters." },
];

const autonomyLevels = [
  {
    level: 0,
    title: "Manual",
    desc: "Simple phone menu is followed: \"Press 1 for Sales, 2 for Support.\""
  },
  {
    level: 1,
    title: "Conversational IVR",
    desc: "AI routes callers to the right department based on spoken keywords instead of keypresses."
  },
  {
    level: 2,
    title: "Simple Scripts",
    desc: "Handles predictable requests using rule-based decision trees."
  },
  {
    level: 3,
    title: "Smart Automation",
    desc: "AI understands why the person is calling, handles common tasks, humans finish the rest."
  },
  {
    level: 4,
    title: "High-Autonomy Agents",
    desc: "AI manages most calls end-to-end, remembers context and escalates only when needed."
  },
  {
    level: 5,
    title: "Full Autonomy",
    desc: "AI runs nearly every call across channels. Humans focus on review and continuous improvement."
  }
];

const speechLanguages = [
  { id: "en", name: "English", flag: "🇬🇧", locale: "en-US", text: "Hello! I'm your AI calling agent, here to help grow your business by engaging customers, answering inquiries, qualifying leads, booking appointments, and providing 24/7 support. How can I assist you today?" },
  { id: "hi", name: "Hindi", flag: "🇮🇳", locale: "hi-IN", text: "नमस्ते! मैं आपका AI कॉलिंग एजेंट हूँ। मैं ग्राहकों से बातचीत करने, उनके सवालों के जवाब देने, संभावित ग्राहकों की पहचान करने, अपॉइंटमेंट बुक करने और 24×7 सहायता प्रदान करके आपके व्यवसाय को बढ़ाने में मदद करता हूँ। आज मैं आपकी किस प्रकार सहायता कर सकता हूँ?" },
  { id: "ta", name: "Tamil", flag: "🇮🇳", locale: "ta-IN", text: "வணக்கம்! நான் உங்கள் AI அழைப்பு உதவியாளர். வாடிக்கையாளர்களுடன் பேசுதல், அவர்களின் கேள்விகளுக்கு பதிலளித்தல், புதிய வாடிக்கையாளர்களை கண்டறிதல், சந்திப்புகளை முன்பதிவு செய்தல் மற்றும் 24×7 ஆதரவு வழங்குதல் மூலம் உங்கள் வணிக வளர்ச்சிக்கு உதவுகிறேன். இன்று நான் உங்களுக்கு எப்படி உதவலாம்?" },
  { id: "te", name: "Telugu", flag: "🇮🇳", locale: "te-IN", text: "నమస్కారం! నేను మీ AI కాలింగ్ ఏజెంట్‌ను. కస్టమర్లతో మాట్లాడటం, వారి ప్రశ్నలకు సమాధానాలు ఇవ్వడం, కొత్త లీడ్స్‌ను గుర్తించడం, అపాయింట్‌మెంట్‌లను బుక్ చేయడం మరియు 24×7 సహాయం అందించడం ద్వారా మీ వ్యాపారాన్ని అభివృద్ధి చేయడంలో సహాయపడతాను. ఈరోజు నేను మీకు ఎలా సహాయం చేయగలను?" },
  { id: "bn", name: "Bengali", flag: "🇮🇳", locale: "bn-IN", text: "নমস্কার! আমি আপনার AI কলিং এজেন্ট। গ্রাহকদের সঙ্গে কথা বলা, তাদের প্রশ্নের উত্তর দেওয়া, নতুন সম্ভাব্য গ্রাহক খুঁজে বের করা, অ্যাপয়েন্টমেন্ট বুক করা এবং ২৪×৭ সহায়তা প্রদান করে আপনার ব্যবসার উন্নতিতে সাহায্য করি। আজ আমি কীভাবে আপনাকে সাহায্য করতে পারি?" },
  { id: "gu", name: "Gujarati", flag: "🇮🇳", locale: "gu-IN", text: "નમસ્તે! હું તમારો AI કોલિંગ એજન્ટ છું. ગ્રાહકો સાથે વાતચીત કરીને, તેમના પ્રશ્નોના જવાબ આપીને, નવા લીડ્સ શોધીને, અપોઇન્ટમેન્ટ બુક કરીને અને 24×7 સહાય પૂરી પાડી તમારા વ્યવસાયને વિકસાવવામાં હું મદદ કરું છું. આજે હું તમારી કેવી રીતે મદદ કરી શકું?" },
  { id: "kn", name: "Kannada", flag: "🇮🇳", locale: "kn-IN", text: "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ AI ಕಾಲಿಂಗ್ ಏಜೆಂಟ್. ಗ್ರಾಹಕರೊಂದಿಗೆ ಮಾತನಾಡುವುದು, ಅವರ ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸುವುದು, ಹೊಸ ಲೀಡ್‌ಗಳನ್ನು ಗುರುತಿಸುವುದು, ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್‌ಗಳನ್ನು ಬುಕ್ ಮಾಡುವುದು ಹಾಗೂ 24×7 ಸಹಾಯ ನೀಡುವ ಮೂಲಕ ನಿಮ್ಮ ವ್ಯವಹಾರವನ್ನು ಬೆಳೆಸಲು ಸಹಾಯ ಮಾಡುತ್ತೇನೆ. ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?" },
  { id: "ml", name: "Malayalam", flag: "🇮🇳", locale: "ml-IN", text: "നമസ്കാരം! ഞാൻ നിങ്ങളുടെ AI കോളിംഗ് ഏജന്റാണ്. ഉപഭോക്താക്കളുമായി സംസാരിക്കുക, അവരുടെ ചോദ്യങ്ങൾക്ക് മറുപടി നൽകുക, പുതിയ ലീഡുകൾ കണ്ടെത്തുക, അപ്പോയിന്റ്മെന്റുകൾ ബുക്ക് ചെയ്യുക, കൂടാതെ 24×7 പിന്തുണ നൽകുക എന്നിവയിലൂടെ നിങ്ങളുടെ ബിസിനസ് വളരാൻ ഞാൻ സഹായിക്കുന്നു. ഇന്ന് ഞാൻ നിങ്ങളെ എങ്ങനെ സഹായിക്കാം?" },
  { id: "mr", name: "Marathi", flag: "🇮🇳", locale: "mr-IN", text: "नमस्कार! मी तुमचा AI कॉलिंग एजंट आहे. ग्राहकांशी संवाद साधणे, त्यांच्या प्रश्नांची उत्तरे देणे, नवीन लीड्स ओळखणे, अपॉइंटमेंट बुक करणे आणि 24×7 सहाय्य प्रदान करून तुमचा व्यवसाय वाढविण्यास मदत करतो. आज मी तुम्हाला कशी मदत करू शकतो?" },
  { id: "pa", name: "Punjabi", flag: "🇮🇳", locale: "pa-IN", text: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਤੁਹਾਡਾ AI ਕਾਲਿੰਗ ਏਜੰਟ ਹਾਂ। ਮੈਂ ਗਾਹਕਾਂ ਨਾਲ ਗੱਲਬਾਤ ਕਰਕੇ, ਉਨ੍ਹਾਂ ਦੇ ਸਵਾਲਾਂ ਦੇ ਜਵਾਬ ਦੇ ਕੇ, ਨਵੇਂ ਲੀਡ ਲੱਭ ਕੇ, ਅਪਾਇੰਟਮੈਂਟ ਬੁੱਕ ਕਰਕੇ ਅਤੇ 24×7 ਸਹਾਇਤਾ ਪ੍ਰਦਾਨ ਕਰਕੇ ਤੁਹਾਡੇ ਕਾਰੋਬਾਰ ਨੂੰ ਵਧਾਉਣ ਵਿੱਚ ਮਦਦ ਕਰਦਾ ਹਾਂ। ਅੱਜ ਮੈਂ ਤੁਹਾਡੀ ਕਿਵੇਂ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?" }
];

export const StepSignin: React.FC = () => {
  const { triggerToast } = useOnboardingStore();
  const router = useRouter();

  // Call timer and dialogue simulation for smartphone mockup
  const [demoCallSeconds, setDemoCallSeconds] = useState(45);
  const [, setDemoCallStep] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => {
      setDemoCallSeconds((prev) => prev + 1);
    }, 1000);
    return () => {
      clearInterval(timer);
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    const dialogTimer = setInterval(() => {
      setDemoCallStep((prev) => (prev + 1) % demoDialogue.length);
    }, 3500);
    return () => clearInterval(dialogTimer);
  }, []);

  const formatDemoTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Interactive UI states
  const [activeIndustryTab, setActiveIndustryTab] = useState("saas");
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Embedded call-demo switcher (Sales vs Health)
  const [activeDemo, setActiveDemo] = useState("voice");
  const demo = callDemos.find((d) => d.id === activeDemo) ?? callDemos[0];

  // Solutions nav dropdown (hover to open, closes on click / mouse-leave)
  const [solutionsOpen, setSolutionsOpen] = useState(false);

  // FAQ accordion (first item open by default)
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Active frame state for the centered simultaneous transition showcase
  const [activeFrame, setActiveFrame] = useState(1);

  // Active level state for the Autonomy Levels dark section
  const [activeAutonomyLevel, setActiveAutonomyLevel] = useState(0);

  // Ringg Interactive Showcase states
  const [activeAgentSector, setActiveAgentSector] = useState("E-commerce");
  const currentSector = agentSectors.find((s) => s.id === activeAgentSector) ?? agentSectors[0];
  const [isCallActive, setIsCallActive] = useState(false);
  const [isCallLoading, setIsCallLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [callSeconds, setCallSeconds] = useState(0);

  useEffect(() => {
    let interval: number;
    if (isCallActive) {
      interval = window.setInterval(() => {
        setCallSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => window.clearInterval(interval);
  }, [isCallActive]);

  // Active playing language for the centered global language support demo
  const [activePlayingLang, setActivePlayingLang] = useState<string | null>(null);

  // Hero animated AI agent-type calling showcase states
  const [heroAgentIndex, setHeroAgentIndex] = useState(0);
  const [heroCallPhase, setHeroCallPhase] = useState<"ringing" | "live">("ringing");
  const heroAgent = heroAgents[heroAgentIndex];
  const heroSpeaker = heroCallPhase === "live" && demoCallSeconds % 4 >= 2 ? "caller" : "agent";

  // Auto-rotate through the AI calling agent types in the hero showcase
  useEffect(() => {
    const rotate = setInterval(() => {
      setHeroAgentIndex((prev) => (prev + 1) % heroAgents.length);
    }, 5000);
    return () => clearInterval(rotate);
  }, []);

  // On each agent switch: ring briefly, then go live; reset the call timer
  useEffect(() => {
    setHeroCallPhase("ringing");
    setDemoCallSeconds(0);
    const t = setTimeout(() => setHeroCallPhase("live"), 1300);
    return () => clearTimeout(t);
  }, [heroAgentIndex]);

  // Speak the current agent's line aloud (click on the visualizer)
  const speakHeroAgent = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(heroAgent.agentLine);
      utterance.lang = heroAgent.locale;
      window.speechSynthesis.speak(utterance);
      triggerToast(`${heroAgent.name} • ${heroAgent.sector} is speaking...`, "success");
    } else {
      triggerToast("Voice playback is not supported in this browser.", "info");
    }
  };

  const playLanguageSpeech = (langId: string, langLocale: string, text: string) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      if (activePlayingLang === langId) {
        window.speechSynthesis.cancel();
        setActivePlayingLang(null);
        triggerToast("Vocal playback stopped.", "info");
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langLocale;

      // Safe retrieval of native browser voice models
      const voices = window.speechSynthesis.getVoices();
      const matchingVoice = voices.find((v) => v.lang.replace("_", "-").startsWith(langLocale));
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }

      utterance.onstart = () => {
        setActivePlayingLang(langId);
        triggerToast(`Playing neural call sample in ${langId.toUpperCase()}...`, "success");
      };

      utterance.onend = () => {
        setActivePlayingLang(null);
      };

      utterance.onerror = () => {
        setActivePlayingLang(null);
      };

      window.speechSynthesis.speak(utterance);
    } else {
      triggerToast(`Voice playback unsupported. Speech prompt: "${text}"`, "info");
    }
  };

  // States for scroll-triggered count-up animations
  const [countCalls, setCountCalls] = useState(0);
  const [countAgents, setCountAgents] = useState(0);
  const [countCampaigns, setCountCampaigns] = useState(0);
  const [countPicked, setCountPicked] = useState(0);
  const [countInterested, setCountInterested] = useState(0);
  const [countCallback, setCountCallback] = useState(0);
  const hasAnimatedStatsRef = useRef(false);
  const [statsVisible, setStatsVisible] = useState(false);
  // Real platform stats for the landing counters; null until fetched from the public API.
  const [statsTargets, setStatsTargets] = useState<{
    calls: number; vendors: number; campaigns: number; picked: number; interested: number; callback: number;
  } | null>(null);

  const autonomySectionRef = useRef<HTMLDivElement>(null);

  // Fetch real platform stats for the landing counters (graceful fallback if offline).
  useEffect(() => {
    let cancelled = false;
    apiFetch<{
      total_calls: number; total_vendors: number; total_campaigns: number;
      picked: number; interested: number; callback: number;
    }>("/public/stats", "GET")
      .then((d) => {
        if (cancelled) return;
        setStatsTargets({
          calls: d.total_calls, vendors: d.total_vendors, campaigns: d.total_campaigns,
          picked: d.picked, interested: d.interested, callback: d.callback,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setStatsTargets({ calls: 14238, vendors: 125, campaigns: 55, picked: 8112, interested: 1204, callback: 489 });
      });
    return () => { cancelled = true; };
  }, []);

  // Mark the section visible when scrolled into view.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) setStatsVisible(true);
      },
      { threshold: 0.15 }
    );
    const currentRef = autonomySectionRef.current;
    if (currentRef) observer.observe(currentRef);
    return () => { if (currentRef) observer.unobserve(currentRef); };
  }, []);

  // Count up to the real values once the section is visible AND the stats have loaded.
  useEffect(() => {
    if (!statsVisible || !statsTargets || hasAnimatedStatsRef.current) return;
    hasAnimatedStatsRef.current = true;

    const timers: Array<ReturnType<typeof setInterval>> = [];
    const animateTo = (target: number, setter: (n: number) => void, durationMs = 1600) => {
      if (target <= 0) { setter(0); return; }
      const steps = Math.min(target, 80);
      const inc = Math.max(1, Math.ceil(target / steps));
      const stepTime = Math.max(15, Math.floor(durationMs / steps));
      let current = 0;
      const timer = setInterval(() => {
        current += inc;
        if (current >= target) { setter(target); clearInterval(timer); }
        else setter(current);
      }, stepTime);
      timers.push(timer);
    };

    animateTo(statsTargets.calls, setCountCalls, 2000);
    animateTo(statsTargets.vendors, setCountAgents);
    animateTo(statsTargets.campaigns, setCountCampaigns);
    animateTo(statsTargets.picked, setCountPicked);
    animateTo(statsTargets.interested, setCountInterested);
    animateTo(statsTargets.callback, setCountCallback);

    return () => { timers.forEach((t) => clearInterval(t)); };
  }, [statsVisible, statsTargets]);

  useEffect(() => {
    const frameTimer = setInterval(() => {
      setActiveFrame((prev) => (prev === 1 ? 2 : 1));
    }, 4000);
    return () => clearInterval(frameTimer);
  }, []);

  // Phone Mockup Ref
  const phoneFrameRef = useRef<HTMLDivElement>(null);

  // Industry Tab specifications
  const industries = [
    { 
      id: "saas", 
      name: "SaaS Support", 
      leadAgent: "Evelyn", 
      satisfaction: "98.2%", 
      rate: "Inbound Support", 
      stats: "Reduces ticket response times by 84%.",
      imageUrl: "https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=1200&q=80",
      voiceId: "evelyn",
      description: "Reduces ticket response times by 84%. Includes custom FAQs templates, custom prompt personalities, and timezone window locking out-of-the-box.",
      speechText: "Hi there! I am Evelyn, your Voqly AI customer support specialist. I can help you resolve support tickets, manage account settings, and guide you through configuration steps instantly. What can I assist you with today?",
      locale: "en-US"
    },
    { 
      id: "ecommerce", 
      name: "E-Commerce", 
      leadAgent: "Sarah", 
      satisfaction: "95.6%", 
      rate: "Abandoned Cart recovery", 
      stats: "Increases conversions by 28% autonomously.",
      imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80",
      voiceId: "sarah",
      description: "Follows up with shoppers within 15 minutes of cart abandonment. Automatically addresses checkout friction points and offers support.",
      speechText: "Hello! This is Sarah from Voqly AI. I noticed you left some premium items in your shopping cart without completing checkout. I wanted to reach out and see if you had any questions, or if I can offer you a quick discount to complete your order today?",
      locale: "en-US"
    },
    { 
      id: "realestate", 
      name: "Real Estate", 
      leadAgent: "Michael", 
      satisfaction: "94.8%", 
      rate: "Lead pre-qualification", 
      stats: "Automates outbound dialing 10x faster.",
      imageUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80",
      voiceId: "michael",
      description: "Qualifies incoming property inquiries, schedules tours with agents, and updates profiles with buyers' budget and timeline preferences.",
      speechText: "Hello! I'm Michael, your Voqly AI real estate assistant. I'm calling to follow up on the property listing you viewed online. Are you interested in scheduling a virtual tour, or do you have any budget and location preferences I can note down?",
      locale: "en-US"
    },
    { 
      id: "healthcare", 
      name: "Healthcare", 
      leadAgent: "Clara", 
      satisfaction: "97.4%", 
      rate: "Patient scheduling", 
      stats: "Reduces appointment no-shows by 45%.",
      imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80",
      voiceId: "clara",
      description: "Manages clinic appointments, coordinates prescription refills, and dispatches automated health check-ins securely and compliantly.",
      speechText: "Hi! This is Clara calling from Voqly AI health desk. I am here to coordinate your upcoming medical appointment scheduling, check doctor availabilities, and confirm your patient registration details. How can I help you today?",
      locale: "en-GB"
    },
    { 
      id: "finance", 
      name: "Finance Desk", 
      leadAgent: "Arjun", 
      satisfaction: "99.1%", 
      rate: "Payment reminders", 
      stats: "Assures fully HIPAA & compliance-locked logging.",
      imageUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80",
      voiceId: "arjun",
      description: "Reminds clients of past-due payments, guides them through self-serve invoice options, and logs securely under administrative controls.",
      speechText: "Hello! I am Arjun, your Voqly AI finance representative. I am calling regarding a pending payment or payment reminder on your account. I can securely process your invoice or guide you through self-serve options right now. How would you like to proceed?",
      locale: "en-IN"
    }
  ];

  return (
    <div className="w-full min-h-screen text-slate-800 font-sans selection:bg-blue-600 selection:text-white transition-colors duration-300 relative overflow-hidden">
      
      {/* Solid editorial backdrop layer */}
      <div className="absolute inset-0 bg-[#faf9f5] -z-20 pointer-events-none" />

      {/* Full-width Sunset Orange vertical stripes background pattern */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes stripe-glow {
          0%, 100% {
            opacity: 0.55;
          }
          50% {
            opacity: 1;
          }
        }
        .animate-stripe-glow {
          animation: stripe-glow 4s ease-in-out infinite;
        }
      `}} />
      <div className="absolute top-0 inset-x-0 h-[680px] flex pointer-events-none -z-10 overflow-hidden justify-center opacity-100">
        {Array.from({ length: 24 }).map((_, i) => {
          const distanceFromCenter = Math.abs(i - 12);
          const opacity = Math.max(0, 1 - distanceFromCenter * 0.08); // Center stripes are most saturated, side stripes fade out
          const scaleY = Math.max(0.2, 1 - distanceFromCenter * 0.06); // Center stripes are tallest, sides form a nice curve
          return (
            <div
              key={i}
              className="flex-1 h-full min-w-[20px] md:min-w-[45px] transition-all duration-500 animate-stripe-glow"
              style={{
                background: `linear-gradient(to bottom, rgba(249, 115, 22, ${opacity * 0.72}) 0%, rgba(251, 146, 60, ${opacity * 0.35}) 40%, rgba(253, 186, 116, ${opacity * 0.08}) 70%, transparent 100%)`,
                transform: `scaleY(${scaleY})`,
                transformOrigin: "top",
                borderRight: "1px solid rgba(251, 146, 60, 0.085)",
                borderLeft: i === 0 ? "1px solid rgba(251, 146, 60, 0.085)" : "none",
                animationDelay: `${i * 0.12}s`
              }}
            />
          );
        })}
      </div>
      
      {/* ------------------- Floating Rounded Capsule Header ------------------- */}
      <header className="fixed top-6 left-6 right-6 h-[4.4rem] bg-white/70 backdrop-blur-xl border border-white/30 rounded-full flex items-center justify-between px-8 z-50 max-w-7xl mx-auto shadow-[0_8px_32px_-4px_rgba(0,0,0,0.06)] transition-all duration-300 select-none">

        <div className="flex items-center space-x-12">
          {/* Logo brand styling - lowercase widely tracked voqly + squared AI */}
          <div className="flex items-center space-x-1.5 hover:opacity-90 transition-opacity cursor-pointer" onClick={() => router.push("/")}>
            <span className="text-base font-extrabold tracking-wider text-slate-800 lowercase">voqly</span>
            <div className="px-2 py-0.5 rounded-lg bg-black flex items-center justify-center text-white font-black text-[9px] uppercase tracking-wider">
              AI
            </div>
          </div>

          {/* Desktop links */}
          <nav className="hidden md:flex items-center space-x-6 text-xs font-bold text-slate-500">
            <a href="/" className="hover:text-slate-900 transition-colors py-1">Home</a>

            {/* Solutions Dropdown (hover opens, any click closes) */}
            <div
              className="relative py-1"
              onMouseEnter={() => setSolutionsOpen(true)}
              onMouseLeave={() => setSolutionsOpen(false)}
            >
              <a href="/solutions" onClick={() => setSolutionsOpen(false)} className="hover:text-slate-900 transition-colors flex items-center gap-1 cursor-pointer">
                <span>Solutions</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${solutionsOpen ? "rotate-180" : ""}`} />
              </a>
              {/* Dropdown Menu — pt-2.5 is a transparent hover bridge so the menu stays open onto it */}
              <div className={`absolute top-full left-1/2 -translate-x-1/2 pt-2.5 w-48 transition-all duration-200 origin-top z-55 ${solutionsOpen ? "opacity-100 pointer-events-auto scale-100" : "opacity-0 pointer-events-none scale-95"}`}>
                <div className="bg-white border border-slate-100 rounded-2xl shadow-xl p-2 flex flex-col gap-1">
                  <a href="/solutions/support-agents" onClick={() => setSolutionsOpen(false)} className="hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-bold py-2 px-3 rounded-xl transition-all">Support Agents</a>
                  <a href="/solutions/inbound-calls" onClick={() => setSolutionsOpen(false)} className="hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-bold py-2 px-3 rounded-xl transition-all">Inbound Calls</a>
                  <a href="/solutions/outbound-sales" onClick={() => setSolutionsOpen(false)} className="hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-bold py-2 px-3 rounded-xl transition-all">Outbound Sales</a>
                  <a href="/solutions/campaign-desk" onClick={() => setSolutionsOpen(false)} className="hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-bold py-2 px-3 rounded-xl transition-all">Campaign Desk</a>
                </div>
              </div>
            </div>

            <a href="/industries" className="hover:text-slate-900 transition-colors py-1">Industries</a>
            <a href="/pricing" className="hover:text-slate-900 transition-colors py-1">Pricing</a>
            <a href="/contact" className="hover:text-slate-900 transition-colors py-1">Contact Us</a>
          </nav>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => router.push("/login")}
            className="hidden sm:flex text-xs font-bold text-slate-650 hover:text-slate-950 transition-colors cursor-pointer"
          >
            Login
          </button>
          <button 
            onClick={() => router.push("/login")}
            className="hidden sm:flex h-10 px-5 items-center justify-center text-[10px] font-extrabold text-white bg-black hover:bg-slate-800 rounded-full transition-all active:scale-95 cursor-pointer shadow-xs uppercase tracking-wider"
          >
            Get Free Calls
          </button>

          {/* Mobile Menu Icon */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-650 hover:text-slate-950 bg-white border border-slate-200 rounded-full cursor-pointer shadow-2xs"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Mobile Nav drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-[#FAF9F5] pt-28 px-6 flex flex-col justify-between p-6 border-b border-slate-200 animate-slide-in">
          <nav className="space-y-4 text-left flex flex-col pt-4">
            <a href="/" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold text-slate-600 hover:text-slate-900 py-2 border-b border-slate-200">Home</a>
            <a href="/solutions" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold text-slate-600 hover:text-slate-900 py-2 border-b border-slate-200">Solutions</a>
            <a href="/industries" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold text-slate-600 hover:text-slate-900 py-2 border-b border-slate-200">Industries</a>
            <a href="/pricing" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold text-slate-600 hover:text-slate-900 py-2 border-b border-slate-200">Pricing</a>
            <a href="/contact" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold text-slate-600 hover:text-slate-900 py-2 border-b border-slate-200">Contact Us</a>
            <button 
              onClick={() => { setMobileMenuOpen(false); router.push("/login"); }}
              className="w-full h-11 bg-black hover:bg-slate-800 text-white font-bold rounded-full text-xs mt-4 cursor-pointer shadow-sm uppercase tracking-wider"
            >
              Get Free Calls
            </button>
          </nav>
          <div className="text-[10px] text-slate-400 font-bold uppercase py-4 tracking-widest text-center">
            Voqly AI Platform
          </div>
        </div>
      )}

      {/* ------------------- Section 1: Hero AI and Human call animation ------------------- */}
      <section className="relative min-h-screen pt-32 pb-20 px-6 flex flex-col items-center justify-center max-w-7xl mx-auto w-full overflow-hidden">
        
        <div className="w-full flex flex-col items-center text-center space-y-12">
          
          {/* AI and Human live call scene (replaces phone mockup) */}
          <div ref={phoneFrameRef} className="relative w-full max-w-4xl mx-auto pt-2 select-none">

            {/* keyframes for the signal travelling across the call link */}
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes heroSignal {
                0% { left: 0%; opacity: 0; }
                15% { opacity: 1; }
                85% { opacity: 1; }
                100% { left: 100%; opacity: 0; }
              }
            `}} />

            {/* soft ambient glow */}
            <div className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none">
              <div className="w-[440px] h-[300px] bg-orange-400/10 rounded-full blur-3xl" />
            </div>

            {/* Call status pill */}
            <div className="flex justify-center mb-7">
              <div className="inline-flex items-center gap-2.5 bg-white border border-slate-200/70 rounded-full pl-2 pr-4 py-1.5 shadow-[0_4px_20px_-6px_rgba(0,0,0,0.12)]">
                <span className={`flex items-center justify-center w-5 h-5 rounded-full ${heroCallPhase === "ringing" ? "bg-amber-100" : heroAgent.accentBg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${heroCallPhase === "ringing" ? "bg-amber-500 animate-pulse" : `${heroAgent.accentDot} animate-ping`}`} />
                </span>
                <span className={`text-[10px] font-black uppercase tracking-widest ${heroCallPhase === "ringing" ? "text-amber-600" : heroAgent.accentText}`}>
                  {heroCallPhase === "ringing" ? "Connecting call" : "Live AI Call"}
                </span>
                <span className="text-[10px] font-bold text-slate-400 font-mono border-l border-slate-200 pl-3">{formatDemoTime(demoCallSeconds)}</span>
              </div>
            </div>

            {/* Two-party call scene: AI robot to human */}
            <div className="flex items-center justify-center gap-2 sm:gap-8">

              {/* AI robot side */}
              <div className="flex flex-col items-center gap-3 w-32 sm:w-44 shrink-0">
                <div className="relative flex items-center justify-center">
                  <div className={`absolute w-28 h-28 sm:w-36 sm:h-36 rounded-full border ${heroAgent.accentRing} ${heroSpeaker === "agent" && heroCallPhase === "live" ? "animate-[ping_1.8s_infinite]" : "opacity-0"}`} />
                  <div className={`absolute w-24 h-24 rounded-full border ${heroAgent.accentRing} ${heroSpeaker === "agent" && heroCallPhase === "live" ? "animate-[pulse_1.4s_infinite]" : "opacity-40"}`} />
                  <button type="button" onClick={speakHeroAgent} aria-label="Hear the AI agent speak" className={`relative z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center text-white shadow-xl cursor-pointer transition-transform hover:scale-105 ${heroSpeaker === "agent" && heroCallPhase === "live" ? "scale-105" : ""}`}>
                    <Bot className="w-9 h-9 sm:w-11 sm:h-11" />
                    <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs shadow-sm">{heroAgent.emoji}</span>
                  </button>
                </div>
                <div className="text-center">
                  <p className="text-sm sm:text-base font-black text-slate-900">{heroAgent.name} <span className={heroAgent.accentText}>AI</span></p>
                  <p className={`text-[10px] sm:text-xs font-black uppercase tracking-wider ${heroAgent.accentSoftText}`}>{heroAgent.sector}</p>
                </div>
              </div>

              {/* Connection link in the middle */}
              <div className="flex-1 max-w-[220px] flex flex-col items-center justify-center gap-2">
                <div className="relative w-full h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent">
                  <span className={`absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${heroAgent.accentDot} shadow-md ${heroCallPhase === "live" ? "animate-[heroSignal_2.2s_linear_infinite]" : "opacity-0"}`} />
                </div>
                <div className="relative my-1 flex items-center justify-center">
                  <span className={`absolute inset-0 rounded-full ${heroAgent.accentBg} ${heroCallPhase === "live" ? "animate-ping" : ""}`} />
                  <span className="relative w-11 h-11 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-md">
                    <PhoneCall className={`w-5 h-5 ${heroAgent.accentText}`} />
                  </span>
                </div>
                <div className="flex items-end gap-0.5 h-7">
                  {[6, 12, 18, 10, 16, 8, 14, 9].map((h, i) => (
                    <div key={i} className={`w-[2px] rounded-full ${heroAgent.accentBar} ${heroCallPhase === "live" ? "animate-[bounce_1.1s_infinite]" : "opacity-20"}`} style={{ height: `${h}px`, animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
              </div>

              {/* Human caller side */}
              <div className="flex flex-col items-center gap-3 w-32 sm:w-44 shrink-0">
                <div className="relative flex items-center justify-center">
                  <div className={`absolute w-28 h-28 sm:w-36 sm:h-36 rounded-full border border-sky-400/20 ${heroSpeaker === "caller" && heroCallPhase === "live" ? "animate-[ping_1.8s_infinite]" : "opacity-0"}`} />
                  <div className={`absolute w-24 h-24 rounded-full border border-sky-400/20 ${heroSpeaker === "caller" && heroCallPhase === "live" ? "animate-[pulse_1.4s_infinite]" : "opacity-40"}`} />
                  <div className={`relative z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-sky-100 to-orange-100 border border-white flex items-center justify-center text-slate-600 shadow-xl transition-transform ${heroSpeaker === "caller" && heroCallPhase === "live" ? "scale-105" : ""}`}>
                    <User className="w-9 h-9 sm:w-11 sm:h-11" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm sm:text-base font-black text-slate-900">Human <span className="text-sky-500">Caller</span></p>
                  <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-400">On the line</p>
                </div>
              </div>

            </div>

            {/* Live transcript */}
            <div className="mt-7 max-w-xl mx-auto bg-white/80 backdrop-blur border border-slate-200/70 rounded-2xl p-4 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)] h-[150px] overflow-hidden flex flex-col justify-center">
              {heroCallPhase === "ringing" ? (
                <div className="text-center text-slate-400 font-bold text-xs py-3 animate-pulse">Connecting {heroAgent.name} to the caller...</div>
              ) : (
                <div className="space-y-2 text-left animate-fade-in">
                  <div className="flex items-start gap-2">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-1.5 w-12 shrink-0">Caller</span>
                    <p className="text-sm font-semibold text-slate-700 bg-slate-50 border border-slate-100 rounded-xl rounded-tl-none px-2.5 py-1.5">{heroAgent.callerLine}</p>
                  </div>
                  <div className="flex items-start gap-2 flex-row-reverse">
                    <span className={`text-[8px] font-black uppercase tracking-widest mt-1.5 w-12 shrink-0 text-right ${heroAgent.accentSoftText}`}>{heroAgent.name} AI</span>
                    <p className={`text-sm font-semibold ${heroAgent.accentText} ${heroAgent.accentBg} border ${heroAgent.accentBorder} rounded-xl rounded-tr-none px-2.5 py-1.5`}>{heroAgent.agentLine}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Agent-type selector + CTA */}
            <div className="mt-6 flex flex-col items-center gap-4">
              <div className="flex items-center justify-center gap-1.5">
                {heroAgents.map((a, i) => (
                  <button key={a.name} type="button" onClick={() => setHeroAgentIndex(i)} aria-label={`Show ${a.sector} agent`} className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${i === heroAgentIndex ? `w-6 ${heroAgent.accentDot}` : "w-1.5 bg-slate-300 hover:bg-slate-400"}`} />
                ))}
              </div>
              <button onClick={() => router.push("/login")} className="h-11 px-8 bg-black hover:bg-slate-900 text-white text-xs font-black rounded-full shadow-[0_8px_24px_-6px_rgba(0,0,0,0.4)] flex items-center justify-center gap-2.5 transition-all active:scale-95 cursor-pointer uppercase tracking-wider">
                <Phone className="w-3.5 h-3.5 fill-current text-orange-400 shrink-0" />
                <span>Get an AI Call</span>
              </button>
            </div>

          </div>

          {/* Centered Hero Copy Fold */}
          <div className="text-center space-y-6 max-w-3xl select-none pt-6">
            
            {/* Glowing active calibration badge */}
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200/50 text-[10px] md:text-xs font-black uppercase tracking-wider text-orange-650 shadow-2xs">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping shrink-0" />
              <span>⚡ Built to handle million calls</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 leading-[1.08] tracking-tight">
              Calls that Convert,<br />
              powered by <span className="relative inline-block px-3.5 py-1 border border-dashed border-slate-400/80 rounded-xl bg-white/70 font-serif italic text-slate-800 shadow-3xs">AI Agents</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-xl mx-auto font-semibold">
              Automate inbound and outbound AI calling campaigns that qualify leads, follow up instantly, and book meetings without needing human agents.
            </p>

            {/* Actions centered high contrast buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center items-center">
              <button 
                onClick={() => router.push("/login")}
                className="h-11 px-8 bg-black hover:bg-slate-800 text-white text-xs font-black rounded-full flex items-center justify-center space-x-2.5 transition-all shadow-md active:scale-95 cursor-pointer uppercase tracking-wider"
              >
                <Phone className="w-3.5 h-3.5 fill-current shrink-0 text-orange-400" />
                <span>Start with 100 minutes free AI calls</span>
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* ------------------- Section 2.5: Watch a real AI voice call (embedded demo) ------------------- */}
      <section id="live-demo" className="py-24 px-6 bg-transparent border-b border-slate-200/50 w-full relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[440px] bg-orange-300/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-6xl mx-auto">
          {/* Heading */}
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-8">
            <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-orange-650">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping" />
              Live Demo
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              See an AI call <span className="font-serif italic text-orange-600">in action</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-semibold leading-relaxed max-w-xl mx-auto">
              {demo.desc}
            </p>
          </div>

          {/* Demo switcher tabs */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-1 p-1 bg-white border border-slate-200/80 rounded-full shadow-sm">
              {callDemos.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setActiveDemo(d.id)}
                  className={`px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${activeDemo === d.id ? "bg-black text-white shadow" : "text-slate-500 hover:text-slate-900"}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dark browser-style frame around the embedded demo */}
          <div className="relative mx-auto max-w-4xl">
            {/* Soft gradient glow behind the frame */}
            <div className="absolute -inset-4 bg-gradient-to-tr from-orange-400/20 via-pink-400/10 to-blue-400/20 rounded-[40px] blur-2xl -z-10" />

            <div className="rounded-[28px] overflow-hidden border border-slate-800 bg-[#0a1622] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)]">
              {/* Top window bar */}
              <div className="h-11 bg-[#0d1b2b] border-b border-white/5 flex items-center justify-between px-4 select-none">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-400/80" />
                  <span className="w-3 h-3 rounded-full bg-amber-400/80" />
                  <span className="w-3 h-3 rounded-full bg-emerald-400/80" />
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40">
                  <PhoneCall className="w-3.5 h-3.5 text-orange-400" />
                  <span className="hidden sm:inline">{demo.title}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  On Air
                </div>
              </div>

              {/* Embedded demo, locked to its native ratio */}
              <div className={`relative w-full ${demo.ratio} bg-[#0a1622]`}>
                <iframe
                  key={demo.id}
                  src={demo.src}
                  title={demo.title}
                  loading="lazy"
                  allow="autoplay"
                  className="absolute inset-0 w-full h-full border-0"
                />
              </div>
            </div>
          </div>

          {/* Caption + CTA */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Simulated call - plays automatically</p>
            <button
              onClick={() => router.push("/login")}
              className="h-10 px-6 bg-black hover:bg-slate-900 text-white text-[11px] font-black rounded-full flex items-center gap-2 transition-all active:scale-95 cursor-pointer uppercase tracking-wider"
            >
              <Phone className="w-3 h-3 fill-current text-orange-400 shrink-0" />
              Get your own AI call
            </button>
          </div>
        </div>
      </section>

      {/* ------------------- Section 3: Centered Dual-Frame Animated Showcase ------------------- */}
      <section id="how-it-works" className="py-24 px-6 bg-transparent border-b border-slate-200/50 w-full text-center relative overflow-hidden select-none">
        {/* Dreamy light backgrounds */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-sky-200/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto space-y-12">
          
          {/* Centered Headline details */}
          <div className="max-w-3xl space-y-4 mx-auto text-center">
            <span className="text-xs font-black uppercase text-[#1e6f8a] tracking-widest block">HOW IT WORKS</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              From setup to scale:<br />
              <span className="bg-gradient-to-r from-[#1e6f8a] to-sky-500 bg-clip-text text-transparent">
                How AI conversations work
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-semibold max-w-xl mx-auto">
              This is how modern marketers launch, track, and scale AI calls with unlimited outbound calling and post-call analytics to refine your campaign to perfection
            </p>
          </div>

          {/* Dual-Frame Animator Wrapper Deck */}
          <div className="relative w-full max-w-4xl mx-auto h-[530px] flex items-center justify-center">
            
            {/* ----------------- Frame 1: Monitor & Analyze ----------------- */}
            <div className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center transition-all duration-1000 ease-in-out ${
              activeFrame === 1 
                ? "opacity-100 translate-x-0 scale-100 z-10 pointer-events-auto" 
                : "opacity-0 -translate-x-16 scale-95 z-0 pointer-events-none"
            }`}>
              {/* Top Capsule Pill */}
              <div className="flex items-center justify-between bg-white border border-slate-200/50 rounded-full px-5 py-2.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] max-w-md w-full mb-6">
                <div className="flex items-center space-x-2 text-slate-650 text-[10px] font-black uppercase tracking-wider">
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  <span>Configure Campaign</span>
                </div>
                <div className="bg-gradient-to-r from-sky-400 to-cyan-400 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-sm tracking-wider uppercase">
                  Fintech Outreach Campaign
                </div>
              </div>

              {/* Main Card Panel */}
              <div className="bg-white border border-slate-200/60 rounded-[32px] p-8 shadow-[0_10px_35px_-5px_rgba(0,0,0,0.03)] flex flex-col w-full max-w-2xl h-[330px] justify-between relative">
                
                {/* Title badge top-left */}
                <div className="self-start">
                  <div className="bg-black text-white text-[10px] font-black px-4.5 py-1.5 rounded-full flex items-center space-x-2 shadow-xs uppercase tracking-widest">
                    <Database className="w-3.5 h-3.5 text-sky-400" />
                    <span>Monitor & Analyze</span>
                  </div>
                </div>

                {/* 4 Pastel Cards Grid */}
                <div className="grid grid-cols-2 gap-4 mt-6 flex-1">
                  
                  {/* Total Calls sage green card */}
                  <div className="bg-[#a4c2b9] rounded-2xl p-5 shadow-3xs text-left border border-slate-250/20 flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Total Calls</span>
                      <span className="text-base font-black text-slate-900 font-mono">2940</span>
                    </div>
                    <p className="text-[10px] text-slate-700/80 font-bold leading-normal">Establishing baseline performance</p>
                  </div>

                  {/* Connection Rate orange card */}
                  <div className="bg-[#f2d5a9] rounded-2xl p-5 shadow-3xs text-left border border-slate-250/20 flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Connection Rate</span>
                      <span className="text-base font-black text-slate-900 font-mono">68%</span>
                    </div>
                    <p className="text-[10px] text-slate-700/80 font-bold leading-normal">Stable performance</p>
                  </div>

                  {/* Avg Call Duration blue card */}
                  <div className="bg-[#9ed0e6] rounded-2xl p-5 shadow-3xs text-left border border-slate-250/20 flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Avg Call Duration</span>
                      <span className="text-base font-black text-slate-900 font-mono">4m 32s</span>
                    </div>
                    <p className="text-[10px] text-slate-700/80 font-bold leading-normal">Optimal engagement window</p>
                  </div>

                  {/* Conversion Rate lavender card */}
                  <div className="bg-[#ded0f5] rounded-2xl p-5 shadow-3xs text-left border border-slate-250/20 flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Conversion Rate</span>
                      <span className="text-base font-black text-slate-900 font-mono">12.5%</span>
                    </div>
                    <p className="text-[10px] text-slate-700/80 font-bold leading-normal">High-intent responses detected</p>
                  </div>

                </div>

              </div>

              {/* Bottom Capsule Pill */}
              <div className="flex items-center justify-between bg-white border border-slate-200/50 rounded-full px-5 py-2 shadow-[0_2px_12px_rgba(0,0,0,0.03)] max-w-md w-full mt-6">
                <div className="flex items-center space-x-2 text-slate-650 text-[10px] font-black uppercase tracking-wider">
                  <Bot className="w-3.5 h-3.5 text-slate-400" />
                  <span>Chat & Create</span>
                </div>
                {/* User avatar badge */}
                <div className="w-7 h-7 rounded-full bg-sky-100 border border-sky-200 flex items-center justify-center overflow-hidden">
                  <svg className="w-4 h-4 text-sky-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* ----------------- Frame 2: Configure Campaign ----------------- */}
            <div className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center transition-all duration-1000 ease-in-out ${
              activeFrame === 2 
                ? "opacity-100 translate-x-0 scale-100 z-10 pointer-events-auto" 
                : "opacity-0 translate-x-16 scale-95 z-0 pointer-events-none"
            }`}>
              {/* Top Capsule Pill */}
              <div className="flex items-center justify-between bg-white border border-slate-200/50 rounded-full px-5 py-2 shadow-[0_2px_12px_rgba(0,0,0,0.03)] max-w-md w-full mb-6">
                <div className="flex items-center space-x-2 text-slate-650 text-[10px] font-black uppercase tracking-wider">
                  <Bot className="w-3.5 h-3.5 text-slate-400" />
                  <span>Chat & Create</span>
                </div>
                {/* User avatar badge */}
                <div className="w-7 h-7 rounded-full bg-sky-100 border border-sky-200 flex items-center justify-center overflow-hidden">
                  <svg className="w-4 h-4 text-sky-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              </div>

              {/* Main Card Panel */}
              <div className="bg-gradient-to-br from-[#77bce6] via-[#82c8df] to-[#67b3dd] rounded-[32px] p-8 shadow-[0_10px_35px_-5px_rgba(0,0,0,0.04)] flex flex-col w-full max-w-2xl h-[330px] justify-between relative overflow-hidden border border-slate-200/10">
                <div className="absolute inset-0 opacity-[0.015] bg-[radial-gradient(#000000_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

                {/* Title badge top-left */}
                <div className="self-start">
                  <div className="bg-black text-white text-[10px] font-black px-4.5 py-1.5 rounded-full flex items-center space-x-2 shadow-xs uppercase tracking-widest">
                    <Settings className="w-3.5 h-3.5 text-sky-400" />
                    <span>Configure Campaign</span>
                  </div>
                </div>

                {/* Translucent glass side-by-side containers */}
                <div className="grid grid-cols-2 gap-4 mt-6 flex-1 items-stretch">
                  
                  {/* Left Column: Audience */}
                  <div className="bg-white/35 backdrop-blur-md border border-white/25 rounded-2xl p-5 text-left flex flex-col justify-between shadow-2xs hover:bg-white/40 transition-colors">
                    <div>
                      <span className="text-[9px] text-slate-800 font-extrabold uppercase tracking-widest block">Audience</span>
                      <h4 className="text-xs font-black text-slate-900 mt-1 leading-snug">
                        Fintech Decision Makers (5,000 leads)
                      </h4>
                    </div>

                    <div className="space-y-3.5 pt-2">
                      <div>
                        <span className="text-[8px] text-slate-700/80 font-black block mb-1 uppercase tracking-wider">Medium</span>
                        <div className="flex gap-1.5 select-none">
                          <span className="bg-black text-white text-[8px] font-black px-2.5 py-1 rounded-md uppercase cursor-pointer">Phone</span>
                          <span className="bg-white/50 text-slate-900 border border-slate-350/20 text-[8px] font-bold px-2.5 py-1 rounded-md uppercase cursor-pointer hover:bg-white/70">SMS</span>
                          <span className="bg-white/50 text-slate-900 border border-slate-350/20 text-[8px] font-bold px-2.5 py-1 rounded-md uppercase cursor-pointer hover:bg-white/70">Email</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[8px] text-slate-700/80 font-black block mb-1 uppercase tracking-wider">Duration</span>
                        <span className="bg-white text-slate-900 border border-slate-200/50 text-[8px] font-black px-3 py-1 rounded-md shadow-3xs">
                          30 Days
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Budget & Target Response */}
                  <div className="bg-white/35 backdrop-blur-md border border-white/25 rounded-2xl p-5 text-left flex flex-col justify-around shadow-2xs hover:bg-white/40 transition-colors space-y-4">
                    
                    <div>
                      <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider text-slate-800">
                        <span>Budget</span>
                        <span className="text-slate-900 font-mono font-bold lowercase">$15000 allocated</span>
                      </div>
                      {/* Budget Slider */}
                      <div className="w-full bg-white/30 h-1.5 rounded-full mt-2 relative overflow-hidden shadow-inner">
                        <div className="bg-white h-full rounded-full" style={{ width: "65%" }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider text-slate-800">
                        <span>Target Response Rate</span>
                        <span className="text-slate-900 font-mono font-bold">15-20%</span>
                      </div>
                      {/* Response Rate Slider */}
                      <div className="w-full bg-white/30 h-1.5 rounded-full mt-2 relative overflow-hidden shadow-inner">
                        <div className="bg-white h-full rounded-full" style={{ width: "80%" }} />
                      </div>
                    </div>

                  </div>

                </div>

              </div>

              {/* Bottom Capsule Pill */}
              <div className="flex items-center justify-between bg-white border border-slate-200/50 rounded-full px-5 py-2 shadow-[0_2px_12px_rgba(0,0,0,0.03)] max-w-md w-full mt-6">
                <div className="flex items-center space-x-2 text-slate-650 text-[10px] font-black uppercase tracking-wider">
                  <Search className="w-3.5 h-3.5 text-slate-450" />
                  <span>Monitor & Analyze</span>
                </div>
                {/* User avatar badge */}
                <div className="w-7 h-7 rounded-full bg-sky-100 border border-sky-200 flex items-center justify-center overflow-hidden">
                  <svg className="w-4 h-4 text-sky-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ------------------- Section 3.3: Talk to One of Our Voqly Agents (Interactive) ------------------- */}
      <section className="py-24 px-6 bg-transparent w-full relative overflow-hidden select-none">
        {/* Ambient glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[820px] h-[420px] bg-orange-300/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="max-w-6xl mx-auto space-y-12">
          <div className="max-w-3xl space-y-4 mx-auto text-center">
            <span className="inline-flex items-center gap-2 text-xs font-black uppercase text-orange-600 tracking-widest justify-center">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping" />
              Interactive Demo
            </span>
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Talk to one of our <span className="font-serif italic text-orange-600">Voqly agents</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-semibold max-w-xl mx-auto">
              See how teams use Voqly AI to automate conversations, improve response rates, and move customers to the next step faster.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch max-w-5xl mx-auto text-left">

            {/* Left: industry selector grid (all 13 industries, scrolls within the panel) */}
            <div className="lg:col-span-6 grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1.5 content-start">
              {agentSectors.map((sector) => {
                const isSelected = activeAgentSector === sector.id;
                const Icon = sector.icon;
                return (
                  <button
                    key={sector.id}
                    type="button"
                    onClick={() => { setActiveAgentSector(sector.id); setIsCallActive(false); }}
                    className={`group relative flex flex-col items-start gap-3 p-5 rounded-3xl border text-left cursor-pointer transition-all duration-300 ${
                      isSelected
                        ? "bg-gradient-to-br from-orange-500 to-amber-500 border-transparent text-white shadow-[0_18px_44px_-12px_rgba(249,115,22,0.5)] -translate-y-1"
                        : "bg-white border-slate-200/80 text-slate-700 hover:border-orange-300 hover:shadow-[0_12px_32px_-16px_rgba(0,0,0,0.18)] hover:-translate-y-0.5"
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-white/25 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </span>
                    )}
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                      isSelected ? "bg-white/20 text-white" : "bg-orange-50 text-orange-600 group-hover:bg-orange-100"
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block text-xs font-black uppercase tracking-wider leading-tight">{sector.label}</span>
                      <span className={`block text-[10px] font-bold mt-1 ${isSelected ? "text-white/70" : "text-slate-400"}`}>{sector.agent} - AI agent</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right: agent panel */}
            <div className="lg:col-span-6 bg-white border border-slate-200/70 rounded-[32px] p-7 sm:p-8 flex flex-col relative shadow-[0_24px_70px_-30px_rgba(0,0,0,0.2)] min-h-[420px] overflow-hidden">
              <div className="absolute -top-16 -right-16 w-44 h-44 bg-orange-200/30 rounded-full blur-3xl pointer-events-none" />

              {isCallActive ? (
                <div className="flex-1 flex flex-col justify-between space-y-6 animate-fade-in relative z-10">
                  <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
                      <span className="text-[10px] font-black text-orange-700 uppercase tracking-wider">Live call with {currentSector.agent}</span>
                    </div>
                    <span className="text-xs font-mono text-slate-500 font-bold">{Math.floor(callSeconds / 60)}:{(callSeconds % 60).toString().padStart(2, "0")}</span>
                  </div>

                  <div className="flex-1 flex flex-col justify-center items-center py-6">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-orange-400/20 animate-ping" />
                      <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-lg">
                        <Bot className="w-9 h-9" />
                      </div>
                    </div>
                    <p className="mt-4 text-sm font-black text-slate-900">{currentSector.agent} - {currentSector.label}</p>
                    <div className="flex gap-1.5 items-end h-8 mt-3">
                      {[6, 18, 12, 24, 10, 16, 14, 8, 20, 6].map((h, i) => (
                        <div key={i} className="w-1.5 bg-orange-500 rounded-full animate-bounce" style={{ height: `${h}px`, animationDelay: `${i * 0.08}s`, animationDuration: "0.7s" }} />
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsCallActive(false)}
                    className="h-12 w-full bg-slate-900 hover:bg-black text-white text-xs font-black rounded-full transition flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>End Call</span>
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-between space-y-6 animate-fade-in relative z-10">
                  {/* Agent header */}
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0">
                      <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-lg">
                        <Bot className="w-8 h-8" />
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-900 leading-tight">Try &apos;{currentSector.label}&apos; agents</h4>
                      <p className="text-xs text-orange-600 font-black uppercase tracking-wider mt-0.5">{currentSector.agent} - AI agent</p>
                    </div>
                  </div>

                  <p className="text-sm text-slate-500 font-semibold leading-relaxed">{currentSector.tagline}</p>

                  {/* Capability chips */}
                  <div className="flex flex-wrap gap-2">
                    {currentSector.chips.map((c) => (
                      <span key={c} className="text-[10px] font-black uppercase tracking-wider text-slate-600 bg-slate-100 border border-slate-200/70 rounded-full px-3 py-1.5">{c}</span>
                    ))}
                  </div>

                  {/* Redirect to the full industry detail page */}
                  <button
                    type="button"
                    onClick={() => router.push("/industries")}
                    className="inline-flex items-center gap-1.5 text-[11px] font-black text-orange-600 hover:text-orange-700 uppercase tracking-wider cursor-pointer w-max transition-colors"
                  >
                    See all agents &amp; details
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="space-y-3 pt-1 mt-auto">
                    <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Agent call is available for 2 minutes
                    </p>
                    <div className="flex border border-slate-200 rounded-2xl p-1.5 bg-slate-50/60 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-100 focus-within:bg-white transition-all items-center">
                      <input
                        type="tel"
                        placeholder="Enter phone number"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        disabled={isCallLoading}
                        className="flex-1 bg-transparent px-4 py-2.5 text-xs font-bold text-slate-800 placeholder-slate-400 outline-none"
                      />
                      <button
                        type="button"
                        disabled={isCallLoading}
                        onClick={async () => {
                          if (!phoneNumber.trim() || phoneNumber.trim().length < 6) {
                            triggerToast("Please enter a valid phone number.", "info");
                            return;
                          }
                          setIsCallLoading(true);
                          triggerToast("Connecting to secure onboarding with phone...", "success");

                          await new Promise((resolve) => setTimeout(resolve, 1500));
                          setIsCallLoading(false);

                          useOnboardingStore.getState().setAccountInfo(phoneNumber);
                          window.location.href = `/login?phone=${encodeURIComponent(phoneNumber)}`;
                        }}
                        className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold px-6 py-3 rounded-xl text-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer shrink-0 disabled:opacity-50 shadow-[0_6px_18px_rgba(249,115,22,0.4)]"
                      >
                        {isCallLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                        ) : (
                          <Phone className="w-3.5 h-3.5 fill-current text-white" />
                        )}
                        <span>Start Call</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Explore all industries → dedicated Industries page */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push("/industries")}
              className="inline-flex items-center gap-2 h-11 px-6 bg-white border border-slate-200 hover:border-orange-300 hover:text-orange-600 text-slate-700 text-xs font-black rounded-full shadow-[0_8px_24px_-14px_rgba(0,0,0,0.25)] transition-all active:scale-95 cursor-pointer uppercase tracking-wider"
            >
              Explore all 13 industries
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </section>

      {/* ------------------- Section 3.5: AI Autonomy Levels Section (Dark Theme) ------------------- */}
      <section ref={autonomySectionRef} className="w-full bg-[#030712] text-white py-24 px-6 relative overflow-hidden select-none rounded-[40px] border border-slate-900/60 bg-dotted-grid">
        
        {/* Glow decorative background elements */}
        <div className="absolute top-0 left-10 w-96 h-96 rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 right-10 -translate-y-1/2 w-96 h-96 rounded-full bg-purple-500/5 blur-[120px] pointer-events-none" />

        {/* Tiny grid squares pattern overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

        {/* Colorful tiny dot matrix background overlay (Full Width) */}
        <div className="absolute inset-0 grid grid-cols-12 sm:grid-cols-24 md:grid-cols-36 gap-5 p-8 opacity-[0.18] pointer-events-none -z-10 overflow-hidden">
          {Array.from({ length: 288 }).map((_, i) => {
            const colors = ["bg-[#f5bf45]", "bg-[#f97316]", "bg-[#14b8a6]", "bg-[#22c55e]", "bg-[#a855f7]"];
            const color = colors[i % colors.length];
            return (
              <div 
                key={i} 
                className={`w-1.5 h-1.5 rounded-full ${color} opacity-40 animate-pulse`} 
                style={{
                  animationDelay: `${(i % 12) * 0.25}s`,
                  animationDuration: `${2.2 + (i % 5) * 0.3}s`
                }}
              />
            );
          })}
        </div>

        {/* Glow gradients behind the gauge */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-t from-sky-500/10 via-cyan-400/5 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-6xl mx-auto flex flex-col items-center relative z-10 text-center">
          
          {/* Autonomy Level selection row */}
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8 max-w-4xl w-full border-b border-slate-900/60 pb-6 mb-6">
            {autonomyLevels.map((l) => {
              const isSelected = activeAutonomyLevel === l.level;
              const themeColor = 
                l.level === 0 ? "text-amber-500" :
                l.level === 1 ? "text-orange-500" :
                l.level === 2 ? "text-pink-500" :
                l.level === 3 ? "text-violet-400" :
                l.level === 4 ? "text-blue-400" : "text-emerald-400";
              const borderTheme = 
                l.level === 0 ? "border-amber-500" :
                l.level === 1 ? "border-orange-500" :
                l.level === 2 ? "border-pink-500" :
                l.level === 3 ? "border-violet-400" :
                l.level === 4 ? "border-blue-400" : "border-emerald-400";

              return (
                <button 
                  key={l.level}
                  onClick={() => setActiveAutonomyLevel(l.level)}
                  className={`relative px-5 py-3 text-xs font-black uppercase tracking-widest cursor-pointer transition-all hover:scale-[1.02] ${
                    isSelected ? themeColor : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {/* Active Level Bracket theme corners */}
                  {isSelected && (
                    <>
                      <span className={`absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 ${borderTheme}`} />
                      <span className={`absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 ${borderTheme}`} />
                      <span className={`absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 ${borderTheme}`} />
                      <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 ${borderTheme}`} />
                    </>
                  )}
                  {/* Inactive corners */}
                  {!isSelected && (
                    <>
                      <span className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-slate-900" />
                      <span className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-slate-900" />
                      <span className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-slate-900" />
                      <span className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-slate-900" />
                    </>
                  )}
                  <span>Level {l.level}</span>
                </button>
              );
            })}
          </div>

          {/* Dynamic SVG connection path */}
          <div className="w-full max-w-4xl mx-auto h-20 pointer-events-none select-none relative overflow-visible mt-2">
            <svg className="absolute inset-0 w-full h-full overflow-visible">
              {/* Define linear gradient for the active path */}
              {(() => {
                const activeHexColor = 
                  activeAutonomyLevel === 0 ? "#f5bf45" :
                  activeAutonomyLevel === 1 ? "#f97316" :
                  activeAutonomyLevel === 2 ? "#ec4899" :
                  activeAutonomyLevel === 3 ? "#a855f7" :
                  activeAutonomyLevel === 4 ? "#3b82f6" : "#10b981";

                return (
                  <defs>
                    <linearGradient id="activeLineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={activeHexColor} stopOpacity="1" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.8" />
                    </linearGradient>
                  </defs>
                );
              })()}

              {/* Faint vertical lines for all levels */}
              {[0, 1, 2, 3, 4, 5].map((lvl) => {
                const xPos = 
                  lvl === 0 ? "8.3%" :
                  lvl === 1 ? "25.0%" :
                  lvl === 2 ? "41.7%" :
                  lvl === 3 ? "58.3%" :
                  lvl === 4 ? "75.0%" : "91.7%";
                return (
                  <line
                    key={lvl}
                    x1={xPos}
                    y1="0"
                    x2={xPos}
                    y2="32"
                    stroke="#1e293b"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                );
              })}

              {/* Highlighted active path */}
              {(() => {
                const activeX = 
                  activeAutonomyLevel === 0 ? "8.3%" :
                  activeAutonomyLevel === 1 ? "25.0%" :
                  activeAutonomyLevel === 2 ? "41.7%" :
                  activeAutonomyLevel === 3 ? "58.3%" :
                  activeAutonomyLevel === 4 ? "75.0%" : "91.7%";
                
                const activeHexColor = 
                  activeAutonomyLevel === 0 ? "#f5bf45" :
                  activeAutonomyLevel === 1 ? "#f97316" :
                  activeAutonomyLevel === 2 ? "#ec4899" :
                  activeAutonomyLevel === 3 ? "#a855f7" :
                  activeAutonomyLevel === 4 ? "#3b82f6" : "#10b981";

                return (
                  <>
                    {/* Active vertical line down */}
                    <path
                      d={`M ${activeX} 0 L ${activeX} 32 L 50% 32 L 50% 64`}
                      fill="none"
                      stroke="url(#activeLineGradient)"
                      strokeWidth="2"
                      className="transition-all duration-500 ease-in-out"
                    />

                    {/* Animated moving dash overlay */}
                    <path
                      d={`M ${activeX} 0 L ${activeX} 32 L 50% 32 L 50% 64`}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="transition-all duration-500 ease-in-out"
                      strokeDasharray="8 12"
                      strokeDashoffset="0"
                      style={{
                        animation: "dashMove 2s linear infinite"
                      }}
                    />

                    {/* Arrow head indicator pointing down */}
                    <path
                      d="M 0 0 L -4 -8 L 4 -8 Z"
                      fill={activeHexColor}
                      transform="translate(0, 0)"
                      className="transition-all duration-500 ease-in-out"
                      style={{
                        transform: `translate(50%, 64px) scale(1.5)`
                      }}
                    />
                  </>
                );
              })()}
            </svg>
            
            {/* CSS Keyframes for moving dashes along SVG path */}
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes dashMove {
                to {
                  stroke-dashoffset: -20;
                }
              }
            `}} />
          </div>

          {/* Active Level description panel */}
          {(() => {
            const activeLvlData = autonomyLevels.find((al) => al.level === activeAutonomyLevel) || autonomyLevels[0];
            const activeColorClass = 
              activeAutonomyLevel === 0 ? "text-amber-500" :
              activeAutonomyLevel === 1 ? "text-orange-500" :
              activeAutonomyLevel === 2 ? "text-pink-500" :
              activeAutonomyLevel === 3 ? "text-violet-400" :
              activeAutonomyLevel === 4 ? "text-blue-400" : "text-emerald-400";
            
            return (
              <div className="min-h-[140px] max-w-2xl mx-auto mt-6 text-center space-y-3.5 select-none animate-fade-in">
                <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest block">
                  Active Autonomy Level Description
                </span>
                
                {/* Big header title */}
                <h4 className={`text-3xl sm:text-4xl font-extrabold tracking-tight uppercase transition-all duration-300 ${activeColorClass}`}>
                  {activeLvlData.title}
                </h4>
                
                {/* Description text */}
                <p className="text-sm sm:text-base text-slate-200 font-semibold leading-relaxed max-w-xl mx-auto whitespace-pre-line px-4">
                  {activeLvlData.desc}
                </p>
              </div>
            );
          })()}

          {/* Autonomy Gauge and Window overlay */}
          <div className="relative w-[340px] h-[170px] mx-auto overflow-hidden mt-10">
            {/* Dashed background arc */}
            <div className="absolute inset-x-0 bottom-0 w-[340px] h-[340px] rounded-full border border-dashed border-slate-700/60" />
            
            {/* Glowing gauge window */}
            <div className="absolute inset-x-2 bottom-0 w-[324px] h-[324px] rounded-full border-8 border-t-sky-400 border-x-sky-400/20 border-b-transparent shadow-[0_-12px_25px_-5px_rgba(56,189,248,0.15)] flex flex-col justify-end pb-6 items-center bg-gradient-to-t from-sky-500/5 via-sky-300/10 to-transparent">
              
              <span className="bg-[#10b981]/20 border border-[#10b981]/40 text-[#34d399] text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider mb-2">
                How it works
              </span>

              <h3 className="text-[11px] font-black text-white uppercase tracking-wider">
                Where We Are &amp; What&apos;s Next
              </h3>

              <p className="text-[9px] text-slate-350 leading-relaxed font-semibold max-w-[245px] mt-2">
                <strong className="text-sky-300 font-bold">Level 3 of AI calling Autonomy</strong>: Handles most calls, syncs with your CRM, and delivers clear post-call insights, so your team focuses only on the hottest leads.
              </p>

            </div>

            {/* Gear spinning element at apex */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center shadow-lg">
              <Settings className="w-4 h-4 text-sky-400 animate-[spin_12s_infinite]" />
            </div>
          </div>

          {/* CRM Telemetry Statistics Grid with Backlit Glassmorphic Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 max-w-5xl w-full border-t border-slate-800/80 pt-16 items-stretch select-none text-left relative">
            
            {/* Card 1: Today's AI Calls (Backlit Glassmorphism) */}
            <div className="relative group hover:scale-[1.03] transition-all duration-300 flex flex-col">
              {/* Neon Backlight Glow */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-sky-500/20 rounded-[2rem] blur-xl opacity-75 group-hover:opacity-100 transition duration-500 -z-10" />
              
              {/* Frosted Glass Container */}
              <div className="flex-1 bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] group-hover:border-white/[0.18] rounded-[2rem] p-8 shadow-2xl flex flex-col justify-between min-h-[220px] transition-all">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Total AI calls</span>
                
                {/* Dynamic Digit Layout */}
                <div className="flex space-x-1.5 items-center my-4">
                  {(() => {
                    const callsStr = countCalls.toString().padStart(5, "0");
                    const colors = ["text-[#f5bf45]", "text-[#e8784d]", "text-[#dc4568]", "text-[#a66ee3]", "text-[#4facfe]"];
                    return callsStr.split("").map((digit, i) => (
                      <span key={i} className={`text-5xl md:text-6xl font-black ${colors[i]} tracking-tight filter drop-shadow-[0_2px_8px_rgba(255,255,255,0.05)]`}>
                        {digit}
                      </span>
                    ));
                  })()}
                </div>

                <span className="text-[10px] text-[#f5bf45] font-black uppercase tracking-widest block">
                  ⚡ Across the whole platform
                </span>
              </div>
            </div>

            {/* Card 2: Agents Created Today (Backlit Glassmorphism) */}
            <div className="relative group hover:scale-[1.03] transition-all duration-300 flex flex-col">
              {/* Neon Backlight Glow */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-500/20 via-cyan-400/20 to-teal-400/20 rounded-[2rem] blur-xl opacity-75 group-hover:opacity-100 transition duration-500 -z-10" />
              
              {/* Frosted Glass Container */}
              <div className="flex-1 bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] group-hover:border-white/[0.18] rounded-[2rem] p-8 shadow-2xl flex flex-col justify-between min-h-[220px] transition-all">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Vendors onboarded</span>
                
                {/* Glowing Gradient Text */}
                <span className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-300 to-teal-300 tracking-tight font-mono my-4 block filter drop-shadow-[0_2px_8px_rgba(56,189,248,0.1)]">
                  {countAgents}
                </span>

                <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">
                  Businesses using Voqly AI
                </span>
              </div>
            </div>

            {/* Card 3: Campaigns Running (Backlit Glassmorphism) */}
            <div className="relative group hover:scale-[1.03] transition-all duration-300 flex flex-col">
              {/* Neon Backlight Glow */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/20 via-fuchsia-500/20 to-pink-500/20 rounded-[2rem] blur-xl opacity-75 group-hover:opacity-100 transition duration-500 -z-10" />
              
              {/* Frosted Glass Container */}
              <div className="flex-1 bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] group-hover:border-white/[0.18] rounded-[2rem] p-8 shadow-2xl flex flex-col justify-between min-h-[220px] transition-all">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Total campaigns</span>
                
                {/* Glowing Gradient Text */}
                <span className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-350 to-pink-300 tracking-tight font-mono my-4 block filter drop-shadow-[0_2px_8px_rgba(168,85,247,0.1)]">
                  {countCampaigns}
                </span>

                <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">
                  Active inbound + outbound
                </span>
              </div>
            </div>

          </div>

          {/* Custom outlined telemetry badges */}
          <div className="flex flex-wrap justify-center gap-4 mt-12 w-full max-w-4xl select-none">
            <div className="bg-[#101726]/60 border border-[#f5bf45]/20 hover:border-[#f5bf45]/55 rounded-xl px-5 py-3.5 flex items-center justify-between min-w-[145px] transition-colors shadow-sm">
              <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest mr-4">Picked</span>
              <span className="text-xs font-black text-[#f5bf45] font-mono">{countPicked}</span>
            </div>
            <div className="bg-[#101726]/60 border border-[#f5bf45]/20 hover:border-[#f5bf45]/55 rounded-xl px-5 py-3.5 flex items-center justify-between min-w-[145px] transition-colors shadow-sm">
              <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest mr-4">Interested</span>
              <span className="text-xs font-black text-[#f5bf45] font-mono">{countInterested}</span>
            </div>
            <div className="bg-[#101726]/60 border border-[#f5bf45]/20 hover:border-[#f5bf45]/55 rounded-xl px-5 py-3.5 flex items-center justify-between min-w-[145px] transition-colors shadow-sm">
              <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest mr-4">Call back</span>
              <span className="text-xs font-black text-[#f5bf45] font-mono">{countCallback}</span>
            </div>
          </div>

        </div>
      </section>

      {/* ------------------- Section 3.7: Powerful No-Code Platform to Build and Scale Agents ------------------- */}
      <section className="py-24 px-6 bg-transparent w-full text-center relative overflow-hidden select-none">
        <div className="max-w-6xl mx-auto space-y-12">
          
          <div className="max-w-3xl space-y-4 mx-auto text-center">
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Powerful No-Code Platform to Build and Scale Agents
            </h2>
            <p className="text-xs sm:text-sm text-slate-505 leading-relaxed font-semibold max-w-xl mx-auto">
              Voqly AI customizes an AI voice agent platform to fit your unique business needs, so you can focus on what matters most.
            </p>
          </div>

          {/* Cards Grid (3x2) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            {[
              {
                title: "Smart Auto Dialer",
                desc: "High-velocity dialing at 1000 calls/min with smart retry logic for max reach.",
                renderVisual: () => (
                  <div className="w-full h-36 bg-orange-50/50 rounded-2xl border border-orange-100 flex items-center justify-center space-x-6 relative overflow-hidden group-hover:bg-orange-100/50 transition-colors">
                    <div className="flex flex-col items-center space-y-1">
                      <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-[10px]">Voqly</div>
                      <span className="text-[8px] text-slate-400 font-bold uppercase">Agents</span>
                    </div>
                    <div className="relative flex h-8 w-8 items-center justify-center">
                      <div className="absolute w-8 h-8 rounded-full border border-orange-400/30 animate-ping" />
                      <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                        <Phone className="w-3 h-3 fill-current" />
                      </div>
                    </div>
                    <div className="flex flex-col items-center space-y-1">
                      <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px]">User</div>
                      <span className="text-[8px] text-slate-400 font-bold uppercase">Customer</span>
                    </div>
                  </div>
                ),
              },
              {
                title: "Web Calls and Chat",
                desc: "Web call integration on your website for an AI voice assistant for visitors.",
                renderVisual: () => (
                  <div className="w-full h-36 bg-orange-50/50 rounded-2xl border border-orange-100 p-4 flex flex-col justify-between relative overflow-hidden group-hover:bg-orange-100/50 transition-colors">
                    <div className="flex space-x-1.5 shrink-0 border-b border-orange-100 pb-2">
                      <div className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                      <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <button className="px-5 py-2 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center space-x-1.5 cursor-pointer">
                        <Phone className="w-3.5 h-3.5 fill-current text-white" />
                        <span>Let&apos;s Talk</span>
                      </button>
                    </div>
                  </div>
                ),
              },
              {
                title: "Lowest Latency",
                desc: "20+ languages with <330ms latency for lightning-fast global customer engagement.",
                renderVisual: () => (
                  <div className="w-full h-36 bg-orange-50/50 rounded-2xl border border-orange-100 p-4 flex items-end justify-around relative overflow-hidden group-hover:bg-orange-100/50 transition-colors">
                    <div className="w-8 h-12 bg-orange-300/40 rounded-t" />
                    <div className="w-8 h-20 bg-orange-300/40 rounded-t" />
                    <div className="w-8 h-24 bg-orange-500 rounded-t relative flex flex-col justify-between items-center pb-1">
                      <span className="absolute -top-6 bg-orange-650 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm">200ms</span>
                      <span className="text-[8px] text-white font-bold uppercase tracking-wider font-mono">Voqly</span>
                    </div>
                    <div className="w-8 h-16 bg-orange-300/40 rounded-t" />
                    <div className="w-8 h-14 bg-orange-300/40 rounded-t" />
                  </div>
                ),
              },
              {
                title: "Enhanced CRM Integration",
                desc: "The AI voice agent syncs calls, leads, and data with WhatsApp communication.",
                renderVisual: () => (
                  <div className="w-full h-36 bg-orange-50/50 rounded-2xl border border-orange-100 p-4 flex items-center justify-center relative overflow-hidden group-hover:bg-orange-100/50 transition-colors">
                    <div className="relative flex items-center justify-center w-full h-full">
                      <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-[8px] absolute -translate-x-12">CRM</div>
                      <div className="w-10 h-10 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold text-[10px] z-10">Voqly</div>
                      <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-[8px] absolute translate-x-12">WhatsApp</div>
                      <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg">
                        <line x1="80" y1="72" x2="160" y2="72" stroke="rgba(249, 115, 22, 0.4)" strokeWidth="2" strokeDasharray="3 3" />
                        <line x1="200" y1="72" x2="280" y2="72" stroke="rgba(249, 115, 22, 0.4)" strokeWidth="2" strokeDasharray="3 3" />
                      </svg>
                    </div>
                  </div>
                ),
              },
              {
                title: "Warm Transfer to Human Agents",
                desc: "Smart call transfer to human agents maintaining context for superior experience.",
                renderVisual: () => (
                  <div className="w-full h-36 bg-orange-50/50 rounded-2xl border border-orange-100 p-4 flex items-center justify-center relative overflow-hidden group-hover:bg-orange-100/50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center"><Bot className="w-4 h-4" /></div>
                        <span className="text-[7px] text-slate-400 font-bold uppercase mt-1">Voqly</span>
                      </div>
                      <div className="w-8 h-0.5 border-t-2 border-dashed border-orange-450" />
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">Cust</div>
                        <span className="text-[7px] text-slate-400 font-bold uppercase mt-1">Caller</span>
                      </div>
                      <div className="w-8 h-0.5 border-t-2 border-dashed border-orange-450" />
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold">HR</div>
                        <span className="text-[7px] text-slate-400 font-bold uppercase mt-1">Human</span>
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                title: "Evals Studio and Analytics",
                desc: "Advanced analytics with call dispositions to optimize the voice AI tool.",
                renderVisual: () => (
                  <div className="w-full h-36 bg-orange-50/50 rounded-2xl border border-orange-100 p-4 flex flex-col justify-between relative overflow-hidden group-hover:bg-orange-100/50 transition-colors">
                    <div className="flex justify-between items-center text-[8px] text-slate-450 uppercase font-black tracking-wider">
                      <span>Call Analytics</span>
                      <span className="text-orange-500">Active</span>
                    </div>
                    <div className="flex items-end justify-around flex-1 pt-2">
                      <div className="w-6 h-8 bg-orange-200/50 rounded-t" />
                      <div className="w-6 h-14 bg-orange-300/60 rounded-t" />
                      <div className="w-6 h-20 bg-orange-500 rounded-t" />
                      <div className="w-6 h-10 bg-orange-200/50 rounded-t" />
                    </div>
                  </div>
                ),
              },
            ].map((card, i) => (
              <div
                key={i}
                className="group relative bg-white border border-slate-200 rounded-3xl p-6 shadow-xs hover:shadow-md hover:border-orange-500/35 transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between space-y-4"
              >
                {/* Visual container panel */}
                {card.renderVisual()}

                <div className="space-y-1.5">
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-orange-600 transition-colors">{card.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-semibold">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ------------------- Section 4: Centered Global Language Speech Synthesizer Section ------------------- */}
      <section id="features" className="py-24 bg-gradient-to-b from-[#FAF9F5] via-orange-50/20 to-[#FAF9F5] border-y border-orange-200/50 select-none relative overflow-hidden flex flex-col items-center justify-center text-center px-6">
        
        {/* World map faint backdrop overlay */}
        <div className="absolute inset-0 opacity-[0.035] bg-[radial-gradient(#000_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        
        {/* Faint landscape circles overlay */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[350px] bg-gradient-to-tr from-orange-400/5 via-amber-300/5 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-6xl mx-auto flex flex-col items-center relative z-10 w-full">
          
          {/* Centered Badge */}
          <span className="bg-orange-100/60 text-orange-700 px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest mb-4 border border-orange-200/40 shadow-3xs">
            ✨ Global language support
          </span>

          {/* Centered Heading */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight max-w-3xl">
            Talk to your customers in their language, anywhere in the world.
          </h2>

          {/* Centered Subtitle */}
          <p className="text-xs sm:text-sm text-slate-500 font-semibold leading-relaxed max-w-xl mx-auto mt-4">
            Hear how our AI sounds across languages and accents before you launch global campaigns.
          </p>

          {/* Central glowing gradient sphere visualizer centerpiece */}
          <div className="relative my-12 flex items-center justify-center select-none">
            {/* Pulsing Concentric Ripple Rings */}
            {activePlayingLang && (
              <>
                <div className="absolute w-56 h-56 border-2 border-orange-500/20 rounded-full animate-ping pointer-events-none" />
                <div className="absolute w-64 h-64 border border-orange-500/10 rounded-full animate-[pulse_1.5s_infinite] pointer-events-none" />
              </>
            )}
            
            {/* Main colorful glowing gradient sphere */}
            <div className={`w-44 h-44 rounded-full bg-gradient-to-br from-orange-400 via-amber-500 to-orange-600 shadow-[0_15px_45px_-5px_rgba(249,115,22,0.3)] transition-all duration-500 flex items-center justify-center overflow-hidden border border-white/10 ${
              activePlayingLang ? "scale-105" : "scale-100 hover:scale-[1.02]"
            }`}>
              {/* Wave equalization animation inside sphere when active */}
              {activePlayingLang && (
                <div className="flex space-x-1 items-end h-8 select-none pointer-events-none z-10">
                  {[6, 16, 10, 22, 14, 18, 12, 8].map((h, i) => (
                    <div
                      key={i}
                      className="w-1 bg-white/70 rounded-full animate-[bounce_1s_infinite]"
                      style={{
                        height: `${h}px`,
                        animationDelay: `${i * 0.12}s`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Double-row Flag Pills Selector Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 max-w-5xl w-full mt-6 select-none">
            {speechLanguages.map((lang) => {
              const isPlaying = activePlayingLang === lang.id;
              return (
                <button
                  key={lang.id}
                  onClick={() => playLanguageSpeech(lang.id, lang.locale, lang.text)}
                  className={`bg-white hover:bg-slate-50 border rounded-full px-5 py-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex items-center justify-between transition-all select-none cursor-pointer w-full hover:scale-[1.03] active:scale-95 duration-200 ${
                    isPlaying
                      ? "border-orange-500 bg-orange-50/50 shadow-[0_2px_15px_rgba(249,115,22,0.12)] scale-[1.03]"
                      : "border-slate-200 hover:border-slate-350"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="text-base select-none">{lang.flag}</span>
                    <span className="text-xs font-black text-slate-800 tracking-wide select-none">{lang.name}</span>
                  </div>
                  
                  {/* Play triangle badge */}
                  <span className={`text-[10px] select-none transition-colors ${isPlaying ? "text-orange-500 scale-110 font-black" : "text-slate-900"}`}>
                    {isPlaying ? "■" : "▶"}
                  </span>
                </button>
              );
            })}
          </div>

        </div>
      </section>

      {/* ------------------- Section 7: Meet AI Callers across industries ------------------- */}
      <section id="use-cases" className="py-20 px-6 max-w-7xl mx-auto w-full text-left select-none bg-transparent border-y border-slate-200">
        <div className="space-y-16">
          
          <div className="max-w-2xl space-y-2">
            <span className="text-xs font-black uppercase text-blue-600 tracking-widest block">USE CASE DIRECTORY</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Hear new AI callers across industries
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              Select your market sector context to preview built-in specialized voice agents and customized performance templates.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Tabs sidebar triggers */}
            <div className="lg:col-span-4 flex flex-col justify-start space-y-2 select-none">
              {industries.map((ind) => (
                <button
                  key={ind.id}
                  onClick={() => {
                    setActiveIndustryTab(ind.id);
                    if (typeof window !== "undefined" && window.speechSynthesis) {
                      window.speechSynthesis.cancel();
                    }
                    setPlayingVoiceId(null);
                  }}
                  className={`p-3.5 rounded-2xl border text-left font-black transition-all cursor-pointer flex items-center justify-between ${
                    activeIndustryTab === ind.id
                      ? "bg-white border-blue-500 text-slate-900 shadow-md shadow-slate-100/50 translate-x-1"
                      : "bg-[#FAF9F5] border-slate-200/60 text-slate-500 hover:bg-slate-100/30 hover:text-slate-900"
                  }`}
                >
                  <span className="text-xs">{ind.name}</span>
                  <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${activeIndustryTab === ind.id ? "rotate-90 text-blue-600" : ""}`} />
                </button>
              ))}
            </div>

            {/* Output featured template card */}
            {(() => {
              const activeInd = industries.find((i) => i.id === activeIndustryTab) || industries[0];
              return (
                <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 flex flex-col justify-between shadow-sm animate-fade-in min-h-[300px]">
                  
                  <div className="space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-200/60 pb-4">
                      <div className="flex items-center space-x-3 text-left">
                        <div className="w-10 h-10 rounded-full bg-blue-100 border border-blue-200/40 flex items-center justify-center text-blue-700 font-black text-sm shadow-inner">
                          {activeInd.leadAgent.charAt(0)}
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-xs font-black text-slate-900 block">
                            {activeInd.leadAgent} (Lead Agent)
                          </span>
                          <span className="text-[9px] text-slate-455 font-bold uppercase tracking-wider">
                            {activeInd.name} Sector Model
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[8px] text-slate-400 font-black uppercase tracking-wider block">Average Satisfaction</span>
                        <span className="text-xs font-black text-emerald-600 block font-mono">
                          {activeInd.satisfaction}
                        </span>
                      </div>
                    </div>

                    {/* Media Player Card */}
                    <div 
                      className="relative w-full h-56 rounded-2xl overflow-hidden shadow-inner border border-slate-250/30 flex flex-col justify-end p-4 bg-cover bg-center transition-all duration-500 ease-in-out"
                      style={{ backgroundImage: `url(${activeInd.imageUrl})` }}
                    >
                      {/* Dark gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />

                      {/* Glassmorphic voice play bar */}
                      <div className="relative z-10 flex items-center justify-between bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-3 select-none w-full">
                        <div className="flex items-center space-x-2.5 text-left">
                          <div className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center font-bold text-xs text-white">
                            {activeInd.leadAgent.charAt(0)}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block">
                              {activeInd.leadAgent}
                            </span>
                            <span className="text-[9px] text-slate-300 font-medium tracking-wide block">
                              {activeInd.rate}
                            </span>
                          </div>
                        </div>

                        {/* Equalizer animation overlay if playing */}
                        {playingVoiceId === activeInd.voiceId && (
                          <div className="flex space-x-0.5 items-end h-5 px-3">
                            {[8, 16, 10, 18, 12, 16, 10].map((h, idx) => (
                              <div
                                key={idx}
                                className="w-[2px] bg-blue-500 rounded-full animate-[bounce_1.1s_infinite]"
                                style={{
                                  height: `${h}px`,
                                  animationDelay: `${idx * 0.08}s`
                                }}
                              />
                            ))}
                          </div>
                        )}

                        {/* Play button */}
                        <button
                          onClick={() => {
                            if (playingVoiceId === activeInd.voiceId) {
                              if (typeof window !== "undefined" && window.speechSynthesis) {
                                window.speechSynthesis.cancel();
                              }
                              setPlayingVoiceId(null);
                              triggerToast("Audio playback paused.", "info");
                            } else {
                              if (typeof window !== "undefined" && window.speechSynthesis) {
                                window.speechSynthesis.cancel();
                                
                                const utterance = new SpeechSynthesisUtterance(activeInd.speechText);
                                utterance.lang = activeInd.locale;
                                
                                // Try to match voice name or locale
                                const voices = window.speechSynthesis.getVoices();
                                const matchingVoice = voices.find((v) => 
                                  v.name.toLowerCase().includes(activeInd.leadAgent.toLowerCase())
                                ) || voices.find((v) => 
                                  v.lang.replace("_", "-").startsWith(activeInd.locale)
                                );
                                
                                if (matchingVoice) {
                                  utterance.voice = matchingVoice;
                                }
                                
                                utterance.onend = () => {
                                  setPlayingVoiceId(null);
                                };
                                utterance.onerror = () => {
                                  setPlayingVoiceId(null);
                                };
                                
                                setPlayingVoiceId(activeInd.voiceId);
                                window.speechSynthesis.speak(utterance);
                                triggerToast(`Playing ${activeInd.leadAgent}'s voice template...`, "success");
                              } else {
                                triggerToast("Voice preview is unsupported on this browser.", "error");
                              }
                            }
                          }}
                          className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                            playingVoiceId === activeInd.voiceId
                              ? "bg-blue-500 border-blue-400 text-white"
                              : "bg-white/10 border-white/10 text-white hover:bg-white/20"
                          }`}
                        >
                          {playingVoiceId === activeInd.voiceId ? (
                            <Pause className="w-3.5 h-3.5" />
                          ) : (
                            <Play className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2 text-left">
                      <span className="text-[9px] text-slate-455 font-black uppercase tracking-widest block">Synthesized use case flow</span>
                      <h4 className="text-sm font-bold text-slate-900">
                        {activeInd.rate}
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed font-semibold max-w-xl">
                        {activeInd.description} Includes custom FAQs templates, custom prompt personalities, and timezone window locking out-of-the-box.
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-200 flex items-center justify-between mt-4 select-none">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-wide">
                      TEMPLATE LOCK STATUS: UNLOCKED
                    </span>
                    <button
                      onClick={() => router.push("/login")}
                      className="h-8 px-3.5 bg-black hover:bg-slate-800 text-white text-[10px] font-black rounded-lg transition-all flex items-center justify-center space-x-1 active:scale-95 cursor-pointer shadow-sm"
                    >
                      <span>Build with template</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>
              );
            })()}

          </div>

        </div>
      </section>

      {/* ------------------- Section 8.5: FAQ accordion ------------------- */}
      <section className="py-24 px-6 bg-transparent w-full relative overflow-hidden select-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[360px] bg-orange-300/8 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="max-w-3xl mx-auto">
          <div className="text-center space-y-4 mb-12">
            <span className="inline-flex items-center gap-2 text-xs font-black uppercase text-orange-600 tracking-widest justify-center">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping" />
              FAQ
            </span>
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Frequently asked <span className="font-serif italic text-orange-600">questions</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-semibold max-w-xl mx-auto">
              Everything you need to know about calling with Voqly AI. Can&apos;t find your answer? <a href="/contact" className="text-orange-600 font-bold hover:underline">Talk to our team.</a>
            </p>
          </div>

          <div className="space-y-3 text-left">
            {faqs.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className={`rounded-2xl border transition-all duration-300 ${
                    isOpen
                      ? "bg-white border-orange-200 shadow-[0_12px_36px_-18px_rgba(249,115,22,0.3)]"
                      : "bg-white/60 border-slate-200/70 hover:border-slate-300"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between gap-4 text-left p-5 sm:p-6 cursor-pointer"
                  >
                    <span className="text-sm sm:text-base font-black text-slate-900">{faq.q}</span>
                    <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isOpen ? "bg-orange-500 text-white rotate-180" : "bg-slate-100 text-slate-500"
                    }`}>
                      <ChevronDown className="w-4 h-4" />
                    </span>
                  </button>
                  <div className={`grid transition-all duration-300 ease-in-out ${
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}>
                    <div className="overflow-hidden">
                      <p className="px-5 sm:px-6 pb-5 sm:pb-6 -mt-1 text-xs sm:text-sm text-slate-500 font-semibold leading-relaxed">
                        {faq.a}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ------------------- Section 9: Conversion bottom banner fold ------------------- */}
      <section className="py-20 px-6 max-w-7xl mx-auto w-full select-none bg-transparent">
        
        <div className="w-full bg-gradient-to-br from-orange-50/70 via-[#FAF9F5] to-orange-100/50 text-slate-800 border border-orange-200/60 rounded-[2.5rem] p-8 md:p-14 text-center space-y-6 relative overflow-hidden shadow-xl bg-dotted-grid">
          {/* Animated floating neon backlights */}
          <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-orange-400/10 blur-[100px] animate-[pulse_6s_infinite] pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-amber-400/10 blur-[100px] animate-[pulse_8s_infinite] pointer-events-none" />

          {/* Grid overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(rgba(249,115,22,0.03)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

          <div className="max-w-2xl mx-auto space-y-4 relative z-10">
            <span className="bg-orange-100 border border-orange-200/50 text-orange-700 px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest inline-block shadow-sm">
              🚀 Launch Today
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 leading-tight tracking-tight">
              Launch your first <span className="animate-gradient-flow font-black">AI calling campaign</span> today.
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-semibold max-w-lg mx-auto">
              Experience zero-latency voice interactions with natural accent profiles. Redefine customer calling workflows and operations.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3.5 pt-4 relative z-10">
            <button
              onClick={() => router.push("/login")}
              className="h-12 px-8 bg-black hover:bg-slate-800 text-white text-xs font-black rounded-full flex items-center justify-center space-x-2 transition-all shadow-md active:scale-95 cursor-pointer uppercase tracking-wider group"
            >
              <span>Create a Campaign for Free</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => {
                setPlayingVoiceId("evelyn");
                triggerToast("Listen to Evelyn's conversational voice model in the Use Case Directory below!", "info");
                document.getElementById("use-cases")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="h-12 px-6 bg-white/80 hover:bg-white border border-slate-200 text-slate-800 text-xs font-black rounded-full flex items-center justify-center space-x-2 transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <Volume2 className="w-4 h-4 shrink-0 text-orange-500" />
              <span>Talk to our Voice Agent</span>
            </button>
          </div>

          <p className="text-[9px] text-slate-455 font-bold tracking-widest uppercase pt-4 relative z-10">
            UNRESTRICTED API INTEGRATION • LOCAL SIP DIALERS • INSTANT DEPLOYMENT
          </p>

        </div>

      </section>

      {/* ------------------- Section 10: Shared site footer ------------------- */}
      <SiteFooter />

    </div>
  );
};
