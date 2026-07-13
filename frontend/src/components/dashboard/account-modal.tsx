"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useAuthStore } from "src/store/authStore";
import {
  User as UserIcon, Shield, X, Loader2, Plus,
  Trash2, Mail, MoreHorizontal
} from "lucide-react";
import { apiFetch } from "src/lib/api";
import { useOnboardingStore } from "src/store/useOnboardingStore";

type AccountTab = "profile" | "security";

interface AccountUser {
  full_name?: string;
  email?: string;
  secondary_emails?: string[];
  google_email?: string;
  mfa_enabled?: boolean;
}

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  currentUser: AccountUser;
  setCurrentUser: (user: AccountUser) => void;
  triggerSuccess: (msg: string) => void;
  triggerError: (msg: string) => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  token,
  currentUser,
  setCurrentUser,
  triggerSuccess,
  triggerError,
}) => {
  const [activeTab, setActiveTab] = useState<AccountTab>("profile");

  // Profile Edit States
  const [isEditingName, setIsEditingName] = useState(false);
  const authStoredUser = useAuthStore((s) => s.user);
  const companyLogo = useOnboardingStore((s) => s.companyLogo);
  const displayNameFallback = currentUser?.full_name || authStoredUser?.full_name || "";
  const displayEmail = currentUser?.email || authStoredUser?.email || "";
  const [newName, setNewName] = useState(displayNameFallback || "");
  const [nameSaving, setNameSaving] = useState(false);

  // Email Add States
  const [isAddingEmail, setIsAddingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailAdding, setEmailAdding] = useState(false);
  const [activeEmailMenu, setActiveEmailMenu] = useState<string | null>(null);

  // Google Connect States
  const [activeGoogleMenu, setActiveGoogleMenu] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);

  // Security States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [mfaUpdating, setMfaUpdating] = useState(false);

  if (!isOpen) return null;

  const initials = (displayNameFallback && displayNameFallback.length > 0)
    ? displayNameFallback.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  // Handlers
  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setNameSaving(true);
    try {
      const res = await apiFetch("/auth/me/profile", "PUT", { full_name: newName.trim() }, token);
      if (res) {
        setCurrentUser(res);
        setIsEditingName(false);
        triggerSuccess("Profile details updated successfully.");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update profile name.";
      triggerError(message);
    } finally {
      setNameSaving(false);
    }
  };

  const handleAddEmail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setEmailAdding(true);
    try {
      const res = await apiFetch("/auth/me/secondary-emails", "POST", { email: newEmail.trim() }, token);
      if (res) {
        setCurrentUser(res);
        setNewEmail("");
        setIsAddingEmail(false);
        triggerSuccess(`Secondary email ${newEmail} added successfully.`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to add secondary email.";
      triggerError(message);
    } finally {
      setEmailAdding(false);
    }
  };

  const handleRemoveEmail = async (emailToRemove: string) => {
    try {
      const res = await apiFetch(`/auth/me/secondary-emails/${emailToRemove}`, "DELETE", undefined, token);
      if (res) {
        setCurrentUser(res);
        setActiveEmailMenu(null);
        triggerSuccess(`Secondary email ${emailToRemove} removed successfully.`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete email address.";
      triggerError(message);
    }
  };

  const handleToggleGoogle = async () => {
    setConnectingGoogle(true);
    try {
      if (currentUser?.google_email) {
        const res = await apiFetch("/auth/me/google-disconnect", "POST", undefined, token);
        if (res) {
          setCurrentUser(res);
          triggerSuccess("Successfully unlinked Google Account.");
        }
      } else {
        const res = await apiFetch("/auth/me/google-connect", "POST", { email: currentUser?.email }, token);
        if (res) {
          setCurrentUser(res);
          triggerSuccess("Successfully connected Google Account.");
        }
      }
      setActiveGoogleMenu(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Connection failed to Google Account gateway.";
      triggerError(message);
    } finally {
      setConnectingGoogle(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;
    if (newPassword !== confirmPassword) {
      triggerError("New passwords do not match.");
      return;
    }
    setPasswordSaving(true);
    try {
      const res = await apiFetch("/auth/me/security/password", "PUT", {
        current_password: currentPassword,
        new_password: newPassword
      }, token);
      if (res) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        triggerSuccess("Security password rotated successfully.");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to change password. Verify your current password.";
      triggerError(message);
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleToggleMfa = async () => {
    setMfaUpdating(true);
    try {
      const nextState = !currentUser?.mfa_enabled;
      const res = await apiFetch("/auth/me/security/mfa", "PUT", { enabled: nextState }, token);
      if (res) {
        setCurrentUser(res);
        triggerSuccess(nextState ? "Two-Factor Authentication activated." : "Two-Factor Authentication deactivated.");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update MFA settings.";
      triggerError(message);
    } finally {
      setMfaUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 select-none animate-fade-in">
      <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[550px] animate-scale-up text-left">

        {/* Left Sidebar Navigation */}
        <aside className="w-full md:w-60 bg-slate-50 border-r border-slate-200/80 p-6 flex flex-col justify-between shrink-0">
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Account</h3>
              <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Manage your account info.</p>
            </div>

            <nav className="space-y-1 select-none">
              {[
                { id: "profile" as AccountTab, label: "Profile", icon: UserIcon },
                { id: "security" as AccountTab, label: "Security", icon: Shield },
              ].map((tab) => {
                const active = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2.5 cursor-pointer ${active
                        ? "bg-[#e8ebf2] text-slate-950 shadow-2xs font-bold"
                        : "text-slate-550 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? "text-blue-700" : "text-slate-400"}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="text-[9px] text-slate-400 font-semibold select-none leading-relaxed">
            Voqly Platform Services<br />© 2026 Voqly AI Inc.
          </div>
        </aside>

        {/* Right Content View */}
        <div className="flex-1 flex flex-col h-full bg-white relative">

          {/* Close trigger button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all cursor-pointer z-10"
          >
            <X className="w-4 h-4" />
          </button>

          <main className="flex-1 p-8 overflow-y-auto space-y-6">

            {/* PROFILE VIEWS */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <h4 className="text-base font-extrabold text-slate-900 tracking-tight pb-3 border-b border-slate-100 select-none">Profile details</h4>

                {/* Name details row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">Profile</span>

                    {isEditingName ? (
                      <form onSubmit={handleUpdateProfile} className="flex items-center space-x-2 pt-1">
                        <input
                          type="text"
                          required
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="h-8 px-3.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-950 outline-none focus:border-blue-600 shadow-2xs"
                        />
                        <button
                          type="submit"
                          disabled={nameSaving}
                          className="h-8 px-3.5 bg-slate-950 hover:bg-black text-white text-[10px] font-bold rounded-lg cursor-pointer flex items-center space-x-1"
                        >
                          {nameSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                          <span>Save</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewName(currentUser?.full_name || "");
                            setIsEditingName(false);
                          }}
                          className="h-8 px-3 text-slate-650 hover:bg-slate-50 border border-slate-250 text-[10px] font-bold rounded-lg cursor-pointer"
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-center space-x-3 pt-1">
                        {/* Circle Avatar (rose pink with initials/uploaded logo) */}
                        <div className="w-12 h-12 rounded-full bg-[#e64775] text-white flex items-center justify-center font-bold text-base shadow-sm select-none border border-slate-200 bg-white overflow-hidden shrink-0">
                          {companyLogo ? (
                            <Image
                              src={companyLogo}
                              alt="Logo"
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            initials
                          )}
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-sm font-extrabold text-slate-900">{displayNameFallback || "Enterprise User"}</span>
                          <span className="text-[10px] text-slate-450 font-bold block uppercase tracking-wider">Default Identity</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {!isEditingName && (
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="h-8 px-3.5 bg-white border border-slate-250 text-slate-700 hover:bg-slate-50 rounded-lg text-[10px] font-bold cursor-pointer transition-all shrink-0"
                    >
                      Update profile
                    </button>
                  )}
                </div>

                {/* Email addresses row */}
                <div className="space-y-3 pb-6 border-b border-slate-100">
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">Email addresses</span>

                  <div className="space-y-2">
                    {/* Primary Email */}
                    <div className="h-10 px-4 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-semibold text-slate-800">{displayEmail}</span>
                        <span className="px-2 py-0.5 bg-slate-200 border border-slate-300 rounded text-[8px] font-extrabold text-slate-600 uppercase">Primary</span>
                      </div>
                      <div className="w-8 h-8 flex items-center justify-center text-slate-450 font-bold select-none italic text-[10px]">
                        Owner Lock
                      </div>
                    </div>

                    {/* Secondary Emails */}
                    {currentUser?.secondary_emails?.map((secEmail: string) => (
                      <div key={secEmail} className="h-10 px-4 bg-white border border-slate-150 rounded-xl flex items-center justify-between relative hover:bg-slate-50/50 transition-all">
                        <div className="flex items-center space-x-2.5">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <span className="text-xs font-semibold text-slate-800">{secEmail}</span>
                        </div>

                        {/* Dropdown Menu */}
                        <div className="relative select-none">
                          <button
                            onClick={() => setActiveEmailMenu(activeEmailMenu === secEmail ? null : secEmail)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-450 hover:text-slate-800 transition-colors cursor-pointer"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {activeEmailMenu === secEmail && (
                            <div className="absolute right-0 top-8 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-20 w-32 animate-fade-in text-xs font-bold text-slate-700">
                              <button
                                type="button"
                                onClick={() => handleRemoveEmail(secEmail)}
                                className="w-full px-3 py-2 text-left hover:bg-rose-50 text-red-655 flex items-center space-x-2 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Remove email</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add email input inline toggle */}
                  {isAddingEmail ? (
                    <form onSubmit={handleAddEmail} className="flex items-center space-x-2 pt-1 animate-slide-down">
                      <input
                        type="email"
                        required
                        placeholder="secondary@company.com"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="h-8 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-950 outline-none focus:border-blue-600 shadow-2xs placeholder-slate-400 w-64"
                      />
                      <button
                        type="submit"
                        disabled={emailAdding}
                        className="h-8 px-3.5 bg-slate-950 hover:bg-black text-white text-[10px] font-bold rounded-lg cursor-pointer flex items-center space-x-1"
                      >
                        {emailAdding && <Loader2 className="w-3 h-3 animate-spin" />}
                        <span>Add</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNewEmail("");
                          setIsAddingEmail(false);
                        }}
                        className="h-8 px-3 text-slate-650 hover:bg-slate-50 border border-slate-250 text-[10px] font-bold rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAddingEmail(true)}
                      className="text-[11px] text-blue-700 hover:text-blue-900 font-extrabold flex items-center space-x-1 cursor-pointer select-none outline-none mt-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add email address</span>
                    </button>
                  )}
                </div>

                {/* Connected accounts row */}
                <div className="space-y-3 select-none">
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">Connected accounts</span>

                  <div className="h-12 px-4 bg-white border border-slate-150 rounded-xl flex items-center justify-between relative hover:bg-slate-50/50 transition-all">
                    <div className="flex items-center space-x-3">
                      {/* Google color logo SVG */}
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-.1.85-1.12 1.53v2.54h1.8c1.05-.97 1.6-2.4 1.6-4.13"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-4v3.1A12 12 0 0012 24"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.27 14.29A7.18 7.18 0 014.88 12c0-.8.14-1.59.39-2.29V6.61h-4a11.94 11.94 0 000 10.78l4-3.1"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A11.92 11.92 0 0012 0C7.32 0 3.28 2.69 1.28 6.61l4 3.1c.95-2.85 3.6-4.96 6.72-4.96"
                        />
                      </svg>

                      <div className="flex flex-col items-start space-y-0.5">
                        <span className="text-xs font-bold text-slate-800">Google</span>
                        <span className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                          {currentUser?.google_email ? currentUser.google_email : "Google login not linked"}
                        </span>
                      </div>
                    </div>

                    <div className="relative">
                      <button
                        onClick={() => setActiveGoogleMenu(!activeGoogleMenu)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-450 hover:text-slate-800 transition-colors cursor-pointer"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {activeGoogleMenu && (
                        <div className="absolute right-0 top-8 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-20 w-36 animate-fade-in text-xs font-bold text-slate-700">
                          <button
                            type="button"
                            onClick={handleToggleGoogle}
                            disabled={connectingGoogle}
                            className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                          >
                            <Loader2 className={`w-3.5 h-3.5 ${connectingGoogle ? "animate-spin" : "hidden"}`} />
                            <span>{currentUser?.google_email ? "Disconnect" : "Connect Google"}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECURITY VIEWS */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <h4 className="text-base font-extrabold text-slate-900 tracking-tight pb-3 border-b border-slate-100 select-none">Security settings</h4>

                {/* Change password details */}
                <div className="space-y-4 pb-6 border-b border-slate-100">
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">Change Password</span>

                  <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider block">Current Password</label>
                      <input
                        type="password"
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-blue-600 shadow-2xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider block">New Password</label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-blue-600 shadow-2xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider block">Confirm New Password</label>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-blue-600 shadow-2xs"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={passwordSaving}
                      className="h-9 px-4 bg-slate-950 hover:bg-black text-white text-[10px] font-bold rounded-lg cursor-pointer flex items-center justify-center space-x-1.5 shadow-sm transition-all"
                    >
                      {passwordSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                      <span>Save password</span>
                    </button>
                  </form>
                </div>

                {/* MFA configuration */}
                <div className="space-y-3 select-none">
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">Two-factor authentication (MFA)</span>

                  <div className="flex items-center justify-between p-4 border border-slate-150 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-all">
                    <div className="space-y-0.5 text-left pr-4">
                      <span className="text-xs font-bold text-slate-800">MFA Shield Account protection</span>
                      <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">Require email verification code prompts on every credentials login attempt.</p>
                    </div>

                    <button
                      type="button"
                      disabled={mfaUpdating}
                      onClick={handleToggleMfa}
                      className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 shrink-0 ${currentUser?.mfa_enabled ? "bg-emerald-500" : "bg-slate-300"}`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${currentUser?.mfa_enabled ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                  </div>
                </div>

              </div>
            )}

          </main>
        </div>

      </div>
    </div>
  );
};
