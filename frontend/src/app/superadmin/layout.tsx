"use client";

import React, { useState, useEffect } from "react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SuperAdminProvider, useSuperAdmin } from "src/context/SuperAdminContext";
import { useAuthStore } from "src/store/authStore";
import {
  LayoutDashboard, Users, BarChart3, Activity, Settings, Wallet,
  Search, X, Menu, ChevronRight, ChevronLeft, LogOut, User, Shield, BookOpen, Calculator
} from "lucide-react";
import AddVendorModal from "src/components/superadmin/AddVendorModal";

const SIDEBAR_ITEMS = [
  { href: "/superadmin", label: "Overview", icon: LayoutDashboard },
  { href: "/superadmin/vendors", label: "Vendors", icon: Users },
  { href: "/superadmin/revenue", label: "Revenue", icon: BarChart3 },
  { href: "/superadmin/vendor-costing", label: "Vendor Costing", icon: Wallet },
  { href: "/superadmin/cost-calculator", label: "Cost Calculator", icon: Calculator },
  { href: "/superadmin/agent-catalog", label: "AI Agent Catalog", icon: BookOpen },
  { href: "/superadmin/system-health", label: "System Health", icon: Activity },
  { href: "/superadmin/settings", label: "Settings", icon: Settings },
];

function SuperAdminBreadcrumbs() {
  const pathname = usePathname();
  const pathSegments = pathname.split("/").filter(Boolean);

  const formatSegment = (segment: string) => {
    if (segment.startsWith("vendor_")) {
      return `Vendor ${segment.split("_")[1] || segment}`;
    }
    return segment
      .replace(/-/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <nav className="flex items-center space-x-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 select-none">
      <Link href="/superadmin" className="hover:text-slate-700 transition">Super Admin</Link>
      {pathSegments.slice(1).map((segment, idx) => {
        const url = `/superadmin/${pathSegments.slice(1, idx + 2).join("/")}`;
        const isLast = idx === pathSegments.length - 2;
        return (
          <React.Fragment key={idx}>
            <ChevronRight className="w-3 h-3 text-slate-300" />
            {isLast ? (
              <span className="text-[#0f2e5c]">{formatSegment(segment)}</span>
            ) : (
              <Link href={url} className="hover:text-slate-700 transition">{formatSegment(segment)}</Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    searchQuery,
    setSearchQuery,
    successToast,
    errorToast,
    vendorModalOpen,
    setVendorModalOpen,
    fetchAllAdminData
  } = useSuperAdmin();

  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const logout = useAuthStore((s) => s.logout);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!token) {
      router.replace("/");
      return;
    }
    // Auto-clear old random firebase_token_ format — these can't identify the user.
    // Force re-login so the new mock_token_for_[email] format is used.
    if (token.startsWith("firebase_token_")) {
      logout();
      router.replace("/login?reason=session_expired");
      return;
    }
    // Redirect non-admin users — check by email (most reliable) or is_superuser flag
    const emailIsSuperAdmin = user?.email?.toLowerCase() === "admin@voqly.com";
    if (user && !user.is_superuser && !emailIsSuperAdmin) {
      router.replace("/dashboard");
    }
  }, [hasHydrated, token, user, router, logout]);

  const handleSignOut = () => {
    logout();
    router.replace("/");
  };

  const emailIsSuperAdmin = user?.email?.toLowerCase() === "admin@voqly.com";
  if (!hasHydrated || !token || token.startsWith("firebase_token_") || (user && !user.is_superuser && !emailIsSuperAdmin)) {
    return (
      <div className="min-h-screen bg-[#0f2e5c] text-white flex items-center justify-center px-6">
        <div className="flex items-center gap-3 text-sm text-slate-350">
          <Shield className="w-5 h-5 animate-pulse text-blue-200" />
          <span>Verifying administrator access…</span>
        </div>
      </div>
    );
  }


  const adminInitials = user?.full_name
    ? user.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "SA";
  const adminName = user?.full_name || "Super Admin";
  const adminEmail = user?.email || "admin@voqly.com";

  const isActive = (href: string) => {
    if (href === "/superadmin") {
      return pathname === "/superadmin";
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 selection:bg-[#0f2e5c] selection:text-white">
      {/* Toast Notifications */}
      {successToast && (
        <div className="fixed top-6 right-6 z-[9999] flex items-center space-x-2.5 px-5 py-3 bg-slate-900 rounded-xl shadow-xl text-xs font-bold text-white transition-all duration-300 animate-slide-in">
          <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] shrink-0 text-white">✓</span>
          <span>{successToast}</span>
        </div>
      )}
      {errorToast && (
        <div className="fixed top-6 right-6 z-[9999] flex items-center space-x-2.5 px-5 py-3 bg-red-600 rounded-xl shadow-xl text-xs font-bold text-white transition-all duration-300 animate-slide-in">
          <span className="w-5 h-5 rounded-full bg-red-400 flex items-center justify-center text-[10px] shrink-0 text-white">✕</span>
          <span>{errorToast}</span>
        </div>
      )}

      {/* Header bar */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-40 select-none">
        <div className="flex items-center space-x-6">
          <Link href="/superadmin" className="flex items-center space-x-1.5 hover:opacity-90 transition-opacity">
            <span className="text-base font-extrabold tracking-wider text-slate-800 lowercase">voqly</span>
            <div className="px-2 py-0.5 rounded-lg bg-black flex items-center justify-center text-white font-black text-[9px] uppercase tracking-wider">
              AI
            </div>
          </Link>
          <div className="relative hidden lg:flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-600">
            <span>Role:</span>
            <span className="ml-2 font-black text-[#0f2e5c] tracking-wide uppercase text-[9px] bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5">Super Admin</span>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="hidden lg:flex items-center flex-1 justify-center max-w-md mx-8 relative">
          <input
            type="text"
            placeholder="Search systems, vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 bg-slate-50 border border-slate-200 rounded-full pl-12 pr-12 text-xs text-slate-700 placeholder-slate-400 outline-none focus:border-slate-350 focus:bg-white transition-all shadow-inner"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        </div>

        <div className="flex items-center space-x-3">
          {/* Profile Avatar Button */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="w-9 h-9 rounded-full bg-[#0F2D67] text-white text-xs font-black flex items-center justify-center hover:bg-[#1a3d7c] transition cursor-pointer select-none shadow-md border-2 border-blue-200"
              aria-label="Profile menu"
            >
              {adminInitials}
            </button>

            {/* Profile Dropdown */}
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 top-12 z-50 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
                  {/* Profile Info */}
                  <div className="bg-gradient-to-br from-[#0F2D67] to-slate-800 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white font-black text-sm select-none">
                        {adminInitials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{adminName}</p>
                        <p className="text-[10px] text-blue-200 font-medium truncate">{adminEmail}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5">
                      <Shield className="w-3 h-3 text-emerald-400" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-emerald-300">Super Administrator</span>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="p-2">
                    <Link
                      href="/superadmin/settings"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span>Platform Settings</span>
                    </Link>
                    <Link
                      href="/superadmin/profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      <span>Account Profile</span>
                    </Link>
                  </div>

                  {/* Sign Out */}
                  <div className="border-t border-slate-100 p-2">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Mobile menu toggle"
            className="lg:hidden p-2 text-slate-650 rounded-full hover:bg-slate-100 cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main console layout */}
      <div className="flex min-h-[calc(100vh-64px)]">
        {/* Desktop sidebar (collapsible icon-rail) */}
        <aside
          className={`hidden lg:flex flex-col border-r border-slate-200 bg-[#f8fafc] py-4 sticky top-16 self-start h-[calc(100vh-64px)] overflow-y-auto overflow-x-hidden transition-[width] duration-300 ease-in-out ${sidebarOpen ? "w-72 px-4" : "w-[76px] px-2.5"}`}
        >
          <div className="flex-1 space-y-3">
            {sidebarOpen && (
              <div className="text-[10px] uppercase tracking-[0.25em] text-slate-400 font-bold pl-4">Administrative Console</div>
            )}
            <div className="space-y-1">
              {SIDEBAR_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={sidebarOpen ? undefined : item.label}
                    className={`w-full flex items-center text-sm font-semibold transition ${
                      sidebarOpen ? "gap-3 px-4 py-3" : "justify-center py-3"
                    } ${active ? "bg-[#0F2D67] text-white rounded-[16px] shadow-md" : "text-slate-600 hover:bg-slate-100/50 rounded-xl"}`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${active ? "text-white" : "text-slate-500"}`} />
                    {sidebarOpen && <span className="whitespace-nowrap">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Collapse / expand toggle — inside the sidebar */}
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

        {/* Mobile slide-drawer navigation */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 bg-white px-6 pt-20 pb-6 overflow-y-auto shadow-2xl lg:hidden flex flex-col justify-between">
            <div className="space-y-6">
              <div className="text-[10px] uppercase tracking-[0.25em] text-slate-400 font-bold pl-4">Console Dashboard</div>
              <div className="space-y-1">
                {SIDEBAR_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition ${
                        active
                          ? "bg-[#0F2D67] text-white rounded-[16px] shadow-md"
                          : "text-slate-600 hover:bg-slate-100/50 rounded-xl"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${active ? "text-white" : "text-slate-500"}`} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Right side page workspace */}
        <div className="flex-1 relative flex flex-col min-w-0">
          <nav className="h-10 px-6 lg:px-8 border-b border-slate-200/50 flex items-center bg-white sticky top-16 z-30 shadow-3xs">
            <SuperAdminBreadcrumbs />
          </nav>
          <main className="flex-1 p-6 sm:p-8 overflow-y-visible">
            {children}
          </main>
        </div>
      </div>
      {vendorModalOpen && (
        <AddVendorModal
          onClose={() => setVendorModalOpen(false)}
          onSuccess={() => {
            setVendorModalOpen(false);
            fetchAllAdminData(true);
          }}
        />
      )}
    </div>
  );
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SuperAdminProvider>
      <LayoutContent>{children}</LayoutContent>
    </SuperAdminProvider>
  );
}
