"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "src/store/authStore";
import { useOnboardingStore } from "src/store/useOnboardingStore";
import { AccountModal } from "src/components/dashboard/account-modal";
import { CallLimitGate } from "src/components/dashboard/call-limit-gate";
import { apiFetch } from "src/lib/api";
import {
  LayoutDashboard,
  PlayCircle,
  Users,
  BarChart3,
  Settings,
  ChevronRight,
  ChevronLeft,
  X,
  Bell,
  PhoneCall,
  Loader2,
  Menu,
  Mic,
  CreditCard,
} from "lucide-react";

const navGroups = [
  {
    label: "",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/dashboard/agents", label: "AI Agents", icon: Users },
      { href: "/dashboard/leads", label: "Leads", icon: Users },
      { href: "/dashboard/campaigns", label: "Campaigns", icon: PlayCircle },
      { href: "/dashboard/call-logs", label: "Call Logs", icon: PhoneCall },
      { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/dashboard/voice-library", label: "Voice Library", icon: Mic },
      { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ],
  },
];

// Pages that read the `?search=` query param and filter their own lists.
const SEARCHABLE_ROUTES = [
  "/dashboard/agents",
  "/dashboard/campaigns",
  "/dashboard/call-logs",
  "/dashboard/leads",
];

interface NotificationItem {
  id: string;
  type: "warning" | "info" | "success";
  title: string;
  body: string;
  time: string;
  href?: string;
}

const READ_NOTIFS_KEY = "voqly_read_notifications";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || "/dashboard";
  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);
  const storedUser = useAuthStore((state) => state.user);
  const setAuthUser = useAuthStore((state) => state.setUser);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const onboardingStore = useOnboardingStore();

  const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readNotifIds, setReadNotifIds] = useState<string[]>([]);

  // Search Synchronization State
  const [searchVal, setSearchVal] = useState("");

  // Expiring subscription warning states
  const [billingInfo, setBillingInfo] = useState<{
    plan_tier: string;
    subscription_status: string;
    current_period_end: string;
  } | null>(null);
  const [dismissedBanner, setDismissedBanner] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiFetch<{
      plan_tier: string;
      subscription_status: string;
      current_period_end: string;
    }>("/dashboard/organization/billing", "GET", undefined, token)
      .then((data) => setBillingInfo(data))
      .catch(() => {});
  }, [token]);

  const isExpiringSoon = React.useMemo(() => {
    if (!billingInfo || !billingInfo.current_period_end) return false;
    try {
      const expiry = new Date(billingInfo.current_period_end);
      const now = new Date();
      const diffTime = expiry.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    } catch {
      return false;
    }
  }, [billingInfo]);

  // Load persisted "read" notification ids
  useEffect(() => {
    try {
      const raw = localStorage.getItem(READ_NOTIFS_KEY);
      if (raw) setReadNotifIds(JSON.parse(raw));
    } catch {
      /* ignore corrupted storage */
    }
  }, []);

  const markNotificationsRead = (ids: string[]) => {
    setReadNotifIds((prev) => {
      const next = Array.from(new Set([...prev, ...ids]));
      try {
        localStorage.setItem(READ_NOTIFS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setSearchVal(params.get("search") || "");
    }
  }, [pathname]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchVal(val);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (val) {
        params.set("search", val);
      } else {
        params.delete("search");
      }
      router.replace(`${window.location.pathname}?${params.toString()}`);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchVal.trim();
    if (!q) return;
    const onSearchablePage = SEARCHABLE_ROUTES.some(
      (r) => pathname === r || pathname.startsWith(`${r}/`)
    );
    // Searchable pages already filter live from the URL param. From anywhere
    // else (Overview, Analytics, Settings…) jump to the Agents list with the query.
    if (!onSearchablePage) {
      router.push(`/dashboard/agents?search=${encodeURIComponent(q)}`);
    }
  };

  useEffect(() => {
    if (!hasHydrated) return;
    if (!token) {
      router.replace("/");
      return;
    }
    if (storedUser && storedUser.is_superuser) {
      router.replace("/superadmin");
    }
  }, [hasHydrated, token, storedUser, router]);

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const currentUserName = storedUser?.full_name || onboardingStore.fullName || "Enterprise User";
  const avatarLetter = currentUserName ? currentUserName.charAt(0).toUpperCase() : "U";
  const triggerSuccess = () => {};
  const triggerError = () => {};

  if (!hasHydrated || !token || (storedUser && storedUser.is_superuser)) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="flex items-center gap-3 text-sm text-slate-300">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Preparing dashboard…</span>
        </div>
      </div>
    );
  }


  // Build the notification feed from real workspace state.
  const notifications: NotificationItem[] = [];
  notifications.push({
    id: "welcome",
    type: "info",
    title: `Welcome, ${currentUserName.split(" ")[0]}`,
    body: "Your Voqly AI workspace is ready. Create an agent to start dialing.",
    time: "Getting started",
    href: "/dashboard/agents",
  });
  if (billingInfo) {
    const status = (billingInfo.subscription_status || "").toLowerCase();
    if (isExpiringSoon && billingInfo.current_period_end) {
      notifications.push({
        id: `sub-expiry-${billingInfo.current_period_end}`,
        type: "warning",
        title: "Subscription expiring soon",
        body: `Your ${billingInfo.plan_tier?.toUpperCase()} plan expires on ${billingInfo.current_period_end}. Renew to avoid service interruptions.`,
        time: "Billing",
        href: "/dashboard/billing",
      });
    }
    if (status === "past_due" || status === "unpaid") {
      notifications.push({
        id: "sub-past-due",
        type: "warning",
        title: "Payment past due",
        body: "We couldn't process your last payment. Update your billing details to keep your agents live.",
        time: "Billing",
        href: "/dashboard/billing",
      });
    }
  }
  const unreadCount = notifications.filter((n) => !readNotifIds.includes(n.id)).length;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 selection:bg-slate-900 selection:text-white">
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-40 select-none">
        <div className="flex items-center space-x-6">
          <Link href="/dashboard" className="flex items-center space-x-1.5 hover:opacity-90 transition-opacity">
            <span className="text-base font-extrabold tracking-wider text-slate-800 lowercase">voqly</span>
            <div className="px-2 py-0.5 rounded-lg bg-black flex items-center justify-center text-white font-black text-[9px] uppercase tracking-wider">
              AI
            </div>
          </Link>
          <div className="relative hidden lg:flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-600">
            <span>Workspace:</span>
            <span className="ml-2 font-bold text-slate-900 truncate max-w-xs">{onboardingStore.businessName || currentUserName}</span>
          </div>
        </div>

        <form onSubmit={handleSearchSubmit} className="hidden lg:flex items-center flex-1 justify-center max-w-md mx-8 relative">
          <input
            type="text"
            placeholder="Search agents, campaigns, or logs..."
            value={searchVal}
            onChange={handleSearchChange}
            className="w-full h-10 bg-slate-50 border border-slate-200 rounded-full pl-12 pr-12 text-xs text-slate-700 placeholder-slate-400 outline-none focus:border-slate-300"
          />
          <button
            type="submit"
            aria-label="Search"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </form>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <button
              aria-label="Notifications"
              onClick={() => {
                setNotificationsOpen((open) => !open);
                setAvatarDropdownOpen(false);
              }}
              className="relative p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                <div className="absolute right-0 mt-3 w-80 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">
                      Notifications{unreadCount > 0 ? ` (${unreadCount})` : ""}
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markNotificationsRead(notifications.map((n) => n.id))}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="px-5 py-10 text-center">
                        <Bell className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-500">You&apos;re all caught up</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">No new notifications.</p>
                      </div>
                    ) : (
                      notifications.map((n) => {
                        const unread = !readNotifIds.includes(n.id);
                        const dot =
                          n.type === "warning"
                            ? "bg-amber-500"
                            : n.type === "success"
                              ? "bg-emerald-500"
                              : "bg-blue-500";
                        return (
                          <button
                            key={n.id}
                            onClick={() => {
                              markNotificationsRead([n.id]);
                              setNotificationsOpen(false);
                              if (n.href) router.push(n.href);
                            }}
                            className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition cursor-pointer ${
                              unread ? "bg-slate-50/60" : ""
                            }`}
                          >
                            <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${unread ? dot : "bg-slate-200"}`} />
                            <span className="min-w-0">
                              <span className="block text-xs font-bold text-slate-900">{n.title}</span>
                              <span className="block text-[11px] text-slate-500 mt-0.5 leading-relaxed">{n.body}</span>
                              <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-1">{n.time}</span>
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => {
                setAvatarDropdownOpen((open) => !open);
                setNotificationsOpen(false);
              }}
              className="w-10 h-10 rounded-full bg-slate-200 text-slate-900 font-bold flex items-center justify-center"
            >
              {avatarLetter}
            </button>

            {avatarDropdownOpen && (
              <div className="absolute right-0 mt-3 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl py-3 z-50">
                <div className="px-5 py-3 flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-900 font-bold">{avatarLetter}</div>
                  <div className="truncate">
                    <p className="text-sm font-bold text-slate-900 truncate">{currentUserName}</p>
                    <p className="text-[11px] text-slate-500 truncate">{storedUser?.email || "user@company.com"}</p>
                  </div>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setAccountModalOpen(true);
                      setAvatarDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Manage account
                  </button>
                  <button
                    onClick={() => {
                      setAvatarDropdownOpen(false);
                      logout();
                      router.replace("/");
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="lg:hidden p-2 text-slate-600 rounded-full hover:bg-slate-100 transition"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-64px)]">
        <aside
          className={`hidden lg:flex flex-col border-r border-slate-200 bg-[#f8fafc] py-4 sticky top-16 self-start h-[calc(100vh-64px)] overflow-y-auto overflow-x-hidden transition-[width] duration-300 ease-in-out ${sidebarOpen ? "w-72 px-4" : "w-[76px] px-2.5"}`}
        >
          <div className="flex-1 space-y-6">
            {navGroups.map((group, idx) => (
              <div key={group.label || idx} className="space-y-3">
                {group.label && sidebarOpen && (
                  <div className="text-[10px] uppercase tracking-[0.25em] text-slate-400 font-bold px-2">{group.label}</div>
                )}
                <div className="space-y-2">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={sidebarOpen ? undefined : item.label}
                        className={`w-full flex items-center rounded-2xl text-sm font-semibold transition ${
                          sidebarOpen ? "gap-3 px-4 py-3" : "justify-center py-3"
                        } ${active ? "bg-slate-100 text-slate-950" : "text-slate-600 hover:bg-slate-50"}`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${active ? "text-slate-950" : "text-slate-500"}`} />
                        {sidebarOpen && <span className="whitespace-nowrap">{item.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Collapse / expand toggle — lives inside the sidebar */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            className={`mt-4 flex items-center rounded-2xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition ${
              sidebarOpen ? "gap-3 px-4 py-2.5" : "justify-center py-2.5"
            }`}
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
            {sidebarOpen && <span className="text-xs font-bold">Collapse</span>}
          </button>
        </aside>

        <div className="flex-1 relative">
          {/* Near-Expiry Banner */}
          {isExpiringSoon && !dismissedBanner && billingInfo && (
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-between text-xs font-bold text-amber-805 select-none animate-fade-in">
              <div className="flex items-center space-x-2">
                <span className="text-base">⚠️</span>
                <span>
                  Your <strong>{billingInfo.plan_tier.toUpperCase()} subscription plan</strong> is expiring soon on {billingInfo.current_period_end}. Please renew to prevent service interruptions.
                </span>
              </div>
              <div className="flex items-center space-x-3.5">
                <Link
                  href="/dashboard/billing"
                  className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-3.5 py-1.5 rounded-lg uppercase tracking-wider text-[10px] transition shadow-xs active:scale-[0.98]"
                >
                  Renew Now
                </Link>
                <button
                  onClick={() => setDismissedBanner(true)}
                  className="text-amber-500 hover:text-amber-850 transition cursor-pointer"
                  aria-label="Dismiss banner"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {mobileMenuOpen && (
            <div className="fixed inset-0 z-40 bg-white px-6 pt-20 pb-6 overflow-y-auto shadow-2xl lg:hidden">
              <div className="space-y-6">
                {navGroups.map((group, idx) => (
                  <div key={group.label || idx} className="space-y-3">
                    {group.label && (
                      <div className="text-[10px] uppercase tracking-[0.25em] text-slate-400 font-bold">{group.label}</div>
                    )}
                    <div className="space-y-2">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition ${
                              active ? "bg-slate-100 text-slate-950" : "text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${active ? "text-slate-950" : "text-slate-500"}`} />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <main className="flex-1 p-6 sm:p-8 pb-24 sm:pb-28">{children}</main>
        </div>
      </div>

      <AccountModal
        isOpen={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        token={token || ""}
        currentUser={storedUser ? {
          full_name: storedUser.full_name || undefined,
          email: storedUser.email || undefined,
          secondary_emails: (storedUser as { secondary_emails?: string[] }).secondary_emails,
          google_email: (storedUser as { google_email?: string }).google_email,
          mfa_enabled: (storedUser as { mfa_enabled?: boolean }).mfa_enabled
        } : {}}
        setCurrentUser={setAuthUser as (user: {
          full_name?: string;
          email?: string;
          secondary_emails?: string[];
          google_email?: string;
          mfa_enabled?: boolean;
        }) => void}
        triggerSuccess={triggerSuccess}
        triggerError={triggerError}
      />

      <CallLimitGate />
    </div>
  );
}
