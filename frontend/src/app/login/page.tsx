"use client";

import React, { useState, Suspense } from "react";
import { useOnboardingStore } from "src/store/useOnboardingStore";
import { useAuthStore } from "src/store/authStore";
import { Loader2, Eye, EyeOff, AlertTriangle, RefreshCw, X, KeyRound, Mail } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  auth, 
  googleProvider, 
  isFirebaseConfigured 
} from "src/lib/firebase";
import { signInWithPopup, signInWithEmailAndPassword } from "firebase/auth";
import { getApiUrl } from "src/lib/api";

interface AuthError {
  code?: string;
  message?: string;
}

function LoginContent() {
  const { setIsLoggedIn, setAccountInfo, triggerToast } = useOnboardingStore();
  const setToken = useAuthStore((s) => s.setToken);
  const setAuthUser = useAuthStore((s) => s.setUser);
  const logoutOldSession = useAuthStore((s) => s.logout);
  const router = useRouter();
  const searchParams = useSearchParams();
  const loginReason = searchParams?.get("reason") || "";

  // Form input states
  const [email, setEmail] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isVerifying, setIsVerifying] = useState(false);
  const [errorText, setErrorText] = useState("");

  // Forgot-password flow states
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPw, setForgotNewPw] = useState("");
  const [forgotConfirmPw, setForgotConfirmPw] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotHint, setForgotHint] = useState("");

  const openForgot = () => {
    setForgotEmail(email);
    setForgotStep(1);
    setForgotOtp(""); setForgotNewPw(""); setForgotConfirmPw("");
    setForgotError(""); setForgotHint("");
    setForgotOpen(true);
  };

  const sendResetCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!forgotEmail.trim()) { setForgotError("Please enter your account email."); return; }
    setForgotLoading(true); setForgotError("");
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      if (!res.ok) throw new Error("Could not send the verification code. Please try again.");
      const data = await res.json();
      // Dev/simulation: backend returns the code so it can be shown here.
      if (data?.otp_code) setForgotHint(`Your verification code: ${data.otp_code}`);
      setForgotStep(2);
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : "Could not send the verification code.");
    } finally {
      setForgotLoading(false);
    }
  };

  const submitReset = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!forgotOtp.trim()) { setForgotError("Enter the verification code sent to your email."); return; }
    if (forgotNewPw.length < 6) { setForgotError("New password must be at least 6 characters."); return; }
    if (forgotNewPw !== forgotConfirmPw) { setForgotError("New passwords do not match."); return; }
    setForgotLoading(true); setForgotError("");
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim(), otp_code: forgotOtp.trim(), new_password: forgotNewPw }),
      });
      if (!res.ok) {
        let detail = "Failed to reset password.";
        try { const d = await res.json(); if (d?.detail) detail = String(d.detail); } catch { /* keep default */ }
        throw new Error(detail);
      }
      triggerToast("Password reset successfully. Please sign in with your new password.", "success");
      setEmail(forgotEmail.trim());
      setPasswordInput("");
      setForgotOpen(false);
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setForgotLoading(false);
    }
  };


  const syncSessionWithBackend = async (userEmail: string, userName: string) => {
    setIsVerifying(true);
    setErrorText("");

    try {
      const apiUrl = getApiUrl();
      
      // Exchange the verified Firebase ID token for a Voqly session. The backend
      // verifies the token against Google's public keys, so there is no shared
      // bypass code. (Firebase must be configured for this flow.)
      const idToken = isFirebaseConfigured && auth.currentUser
        ? await auth.currentUser.getIdToken()
        : null;
      if (!idToken) {
        throw new Error("Sign-in session unavailable. Please try signing in again.");
      }
      const response = await fetch(`${apiUrl}/auth/firebase-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_token: idToken,
          full_name: userName
        })
      });

      if (response.ok) {
        const data = await response.json();
        logoutOldSession();
        
        const tokenValue = data.access_token || "mock_jwt_token";
        setToken(tokenValue);

        const realName = data.user?.full_name || userName;
        const realEmail = data.user?.email || userEmail;
        const isSuper = !!data.user?.is_superuser;
        const hasCompleted = !!data.user?.has_completed_onboarding;

        setAuthUser({
          id: data.user?.id,
          full_name: realName,
          email: realEmail,
          is_superuser: isSuper,
          has_completed_onboarding: hasCompleted
        });
        setAccountInfo(realName, realEmail);
        setIsLoggedIn(true);

        if (isSuper) {
          triggerToast("Authorized as Super Admin!", "success");
          router.push("/superadmin");
        } else if (hasCompleted) {
          triggerToast("Login successful!", "success");
          router.push("/dashboard");
        } else {
          triggerToast("Login successful! Loading Onboarding Wizard...", "success");
          router.push("/onboarding");
        }
      } else {
        const errData = await response.json();
        throw new Error(errData.detail || "Database synchronization failed.");
      }
    } catch (err) {
      // No offline/mock session fallback — authentication and roles must be
      // established by the backend issuing a real signed token. Fabricating a
      // client-side "admin" session here was a privilege-escalation hole.
      console.error("Login failed:", err);
      const msg = err instanceof Error ? err.message : "Login failed. Please try again.";
      setErrorText(msg);
      triggerToast(msg, "error");
    } finally {
      setIsVerifying(false);
    }
  };

  const tryDirectBackendLogin = async (): Promise<boolean> => {
    try {
      const apiUrl = getApiUrl();
      
      const details: Record<string, string> = {
        username: email,
        password: passwordInput,
      };

      const formBody = Object.keys(details)
        .map((key) => encodeURIComponent(key) + "=" + encodeURIComponent(details[key]))
        .join("&");

      const response = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formBody,
      });

      if (response.ok) {
        const data = await response.json();
        logoutOldSession();

        const tokenValue = data.access_token || "mock_jwt_token";
        setToken(tokenValue);

        const realName = data.user?.full_name || email.split("@")[0] || "Enterprise User";
        const realEmail = data.user?.email || email;
        const isSuper = !!data.user?.is_superuser;
        const hasCompleted = !!data.user?.has_completed_onboarding;

        setAuthUser({
          id: data.user?.id,
          full_name: realName,
          email: realEmail,
          is_superuser: isSuper,
          has_completed_onboarding: hasCompleted
        });
        setAccountInfo(realName, realEmail);
        setIsLoggedIn(true);

        if (isSuper) {
          triggerToast("Authorized as Super Admin!", "success");
          router.push("/superadmin");
        } else if (hasCompleted) {
          triggerToast("Login successful!", "success");
          router.push("/dashboard");
        } else {
          triggerToast("Login successful! Loading Onboarding Wizard...", "success");
          router.push("/onboarding");
        }
        return true;
      }
    } catch (err) {
      console.error("Direct backend auth failed:", err);
    }
    return false;
  };

  // Sign In function using Firebase Authentication with automatic local DB fallback
  const handleSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!email) {
      setErrorText("Please enter your email address.");
      return;
    }
    if (!passwordInput) {
      setErrorText("Please enter your password.");
      return;
    }

    setIsVerifying(true);
    setErrorText("");

    // ── When Firebase is not configured, skip directly to local DB auth ──────
    if (!isFirebaseConfigured) {
      try {
        const directSuccess = await tryDirectBackendLogin();
        if (directSuccess) return;
        setErrorText("Invalid email or password.");
        triggerToast("Invalid email or password.", "error");
      } catch {
        setErrorText("Login failed. Please check your credentials.");
        triggerToast("Login failed. Please check your credentials.", "error");
      } finally {
        setIsVerifying(false);
      }
      return;
    }

    try {
      // Authenticate via Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, passwordInput);
      const emailToUse = userCredential.user.email || email;
      const displayName = userCredential.user.displayName || emailToUse.split("@")[0] || "Enterprise User";

      await syncSessionWithBackend(emailToUse, displayName);

    } catch (err) {
      const error = err as AuthError;
      // Check if fallback to direct backend authentication succeeds
      if (
        error.code === "auth/operation-not-allowed" || 
        error.code === "auth/operation-not-supported" || 
        error.message?.includes("operation-not-allowed")
      ) {
        triggerToast("Firebase auth disabled. Logging in via direct database...", "info");
        const directSuccess = await tryDirectBackendLogin();
        if (directSuccess) return;
      }

      // If Firebase credentials check fails, check if the user exists in the local backend database
      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password"
      ) {
        const directSuccess = await tryDirectBackendLogin();
        if (directSuccess) return;
      }

      let friendlyMsg = error.message || "Failed to sign in.";
      if (error.code === "auth/invalid-credential" || error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
        friendlyMsg = "Invalid email address or password.";
      } else if (error.code === "auth/invalid-email") {
        friendlyMsg = "The email address is badly formatted.";
      }
      setErrorText(friendlyMsg);
      triggerToast(friendlyMsg, "error");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#faf9f5] flex items-center justify-center p-4 sm:p-6 font-sans selection:bg-orange-500 selection:text-white">
      <div className="fixed top-0 inset-x-0 h-[380px] -z-10 pointer-events-none bg-gradient-to-b from-orange-200/40 via-orange-100/10 to-transparent" />

      <div className="w-full max-w-5xl bg-white rounded-[32px] border border-slate-200/70 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.25)] overflow-hidden grid md:grid-cols-2 min-h-[600px]">

        {/* Left: animated AI brand panel */}
        <div className="relative hidden md:block bg-[#0c0a09] overflow-hidden">
          <iframe src="/auth-demo/index.html" title="Voqly AI assistant" loading="lazy" className="absolute inset-0 w-full h-full border-0" />
          <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />
          <div className="absolute top-7 left-7 z-10 flex items-center gap-1.5">
            <span className="text-base font-extrabold tracking-wider text-white lowercase">voqly</span>
            <div className="px-2 py-0.5 rounded-lg bg-orange-500 text-white font-black text-[9px] uppercase tracking-wider">AI</div>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-44 bg-gradient-to-t from-black/75 to-transparent pointer-events-none" />
          <div className="absolute bottom-8 left-8 right-8 z-10 pointer-events-none">
            <h3 className="text-xl font-black text-white tracking-tight">Powering enterprise voice</h3>
            <p className="text-xs text-white/55 font-semibold leading-relaxed mt-1">Scalable, secure and intelligent voice for the modern AI workforce.</p>
          </div>
        </div>

        {/* Right: sign-in form */}
        <div className="p-8 sm:p-12 flex flex-col justify-center text-left">
          <div className="w-full max-w-sm mx-auto space-y-6">

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 md:hidden mb-5">
                <span className="text-base font-extrabold tracking-wider text-slate-800 lowercase">voqly</span>
                <div className="px-2 py-0.5 rounded-lg bg-black text-white font-black text-[9px] uppercase tracking-wider">AI</div>
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Welcome back</h2>
              <p className="text-sm text-slate-500 font-semibold">Sign in to your Voqly AI account.</p>
            </div>

            {loginReason === "session_expired" && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-2.5">
                <RefreshCw className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-wider">Session Expired</h4>
                  <p className="text-[11px] text-amber-700 font-semibold leading-normal mt-0.5">Your session has expired. Please sign in again to continue.</p>
                </div>
              </div>
            )}

            {loginReason === "unauthorized" && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[10px] font-black text-red-800 uppercase tracking-wider">Access Denied</h4>
                  <p className="text-[11px] text-red-700 font-semibold leading-normal mt-0.5">You don&apos;t have permission to access that page. Please sign in with the correct account.</p>
                </div>
              </div>
            )}

            {!isFirebaseConfigured && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3.5 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[10px] font-black text-orange-800 uppercase tracking-wider">Local Auth Mode</h4>
                  <p className="text-[11px] text-orange-700 font-semibold leading-normal mt-0.5">Sign in with your registered email &amp; password. Super admin: <code className="bg-orange-100 px-1 py-0.5 rounded font-mono text-[10px] text-orange-900 font-extrabold">admin@voqly.com</code></p>
                </div>
              </div>
            )}

            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Work Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 text-sm font-semibold text-slate-900 placeholder-slate-400 outline-none focus:border-orange-500 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Password</label>
                  <button
                    type="button"
                    onClick={openForgot}
                    className="text-[10px] font-black text-orange-600 hover:text-orange-700 uppercase tracking-wider cursor-pointer transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter your password"
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 pr-11 text-sm font-semibold text-slate-900 placeholder-slate-400 outline-none focus:border-orange-500 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {errorText && (
                <p className="text-xs text-red-600 font-bold animate-fade-in">{errorText}</p>
              )}

              <button
                type="submit"
                disabled={isVerifying}
                className="h-12 w-full bg-black hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-black rounded-full shadow-lg active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider"
              >
                {isVerifying && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                <span>Sign In</span>
              </button>
            </form>

            <div className="flex items-center gap-3">
              <span className="h-px bg-slate-200 flex-1" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">or continue with</span>
              <span className="h-px bg-slate-200 flex-1" />
            </div>

            <button
              type="button"
              onClick={async () => {
                if (isFirebaseConfigured) {
                  try {
                    const userCredential = await signInWithPopup(auth, googleProvider);
                    const emailToUse = userCredential.user.email || "google@voqly.ai";
                    const displayName = userCredential.user.displayName || "Google User";
                    await syncSessionWithBackend(emailToUse, displayName);
                  } catch (err) {
                    const error = err as AuthError;
                    let friendlyMsg = error.message || "Google Sign-In failed.";
                    if (error.code === "auth/popup-closed-by-user") {
                      friendlyMsg = "Google Sign-In popup closed before completion.";
                    }
                    setErrorText(friendlyMsg);
                    triggerToast(friendlyMsg, "error");
                  }
                } else {
                  const errMsg = "Firebase is not configured. Please add keys in .env.local";
                  setErrorText(errMsg);
                  triggerToast(errMsg, "error");
                }
              }}
              className="h-12 w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-full flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-[0.99]"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-.1.85-1.12 1.53v2.54h1.8c1.05-.97 1.6-2.4 1.6-4.13" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-4v3.1A12 12 0 0012 24" />
                <path fill="#FBBC05" d="M5.27 14.29A7.18 7.18 0 014.88 12c0-.8.14-1.59.39-2.29V6.61h-4a11.94 11.94 0 000 10.78l4-3.1" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A11.92 11.92 0 0012 0C7.32 0 3.28 2.69 1.28 6.61l4 3.1c.95-2.85 3.6-4.96 6.72-4.96" />
              </svg>
              <span>Google Sign In</span>
            </button>

            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => router.push("/register")}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                Don&apos;t have an account? <span className="text-orange-600 hover:underline">Create an account</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot-password modal */}
      {forgotOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-orange-600" /> Reset your password
              </h3>
              <button onClick={() => setForgotOpen(false)} aria-label="Close" className="p-1.5 rounded-full text-slate-400 hover:bg-slate-200 transition cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {forgotError && (
                <div className="p-2.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold border border-red-100">{forgotError}</div>
              )}
              {forgotHint && (
                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">{forgotHint}</div>
              )}

              {forgotStep === 1 ? (
                <form onSubmit={sendResetCode} className="space-y-4">
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">Enter your account email and we&apos;ll send a verification code to reset your password.</p>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Email Address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email" required value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="name@company.com"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-4 text-sm font-semibold text-slate-900 placeholder-slate-400 outline-none focus:border-orange-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                  <button type="submit" disabled={forgotLoading} className="h-11 w-full bg-black hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-black rounded-full transition flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider">
                    {forgotLoading && <Loader2 className="w-4 h-4 animate-spin" />}<span>Send verification code</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={submitReset} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Verification Code</label>
                    <input
                      type="text" inputMode="numeric" required value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value)}
                      placeholder="6-digit code"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 text-sm font-bold tracking-widest text-slate-900 placeholder-slate-400 outline-none focus:border-orange-500 focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">New Password</label>
                    <input
                      type="password" required value={forgotNewPw}
                      onChange={(e) => setForgotNewPw(e.target.value)}
                      placeholder="At least 6 characters"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 text-sm font-semibold text-slate-900 placeholder-slate-400 outline-none focus:border-orange-500 focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Confirm New Password</label>
                    <input
                      type="password" required value={forgotConfirmPw}
                      onChange={(e) => setForgotConfirmPw(e.target.value)}
                      placeholder="Re-enter new password"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 text-sm font-semibold text-slate-900 placeholder-slate-400 outline-none focus:border-orange-500 focus:bg-white transition-all"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => { setForgotStep(1); setForgotError(""); }} className="h-11 px-4 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-full transition cursor-pointer">Back</button>
                    <button type="submit" disabled={forgotLoading} className="h-11 flex-1 bg-black hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-black rounded-full transition flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider">
                      {forgotLoading && <Loader2 className="w-4 h-4 animate-spin" />}<span>Reset password</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// useSearchParams() requires a Suspense boundary during static prerendering
// (next build). Wrap the client component so /login can be statically generated.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
