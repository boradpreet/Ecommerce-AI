"use client";

import React, { useState } from "react";
import { useOnboardingStore } from "src/store/useOnboardingStore";
import { useAuthStore } from "src/store/authStore";
import { Loader2, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { 
  auth, 
  googleProvider, 
  isFirebaseConfigured 
} from "src/lib/firebase";
import { signInWithPopup, createUserWithEmailAndPassword } from "firebase/auth";
import { getApiUrl } from "src/lib/api";

interface AuthError {
  code?: string;
  message?: string;
}

export default function RegisterPage() {
  const { setIsLoggedIn, setAccountInfo, triggerToast } = useOnboardingStore();
  const setToken = useAuthStore((s) => s.setToken);
  const setAuthUser = useAuthStore((s) => s.setUser);
  const logoutOldSession = useAuthStore((s) => s.logout);
  const router = useRouter();

  // Form input states
  const [email, setEmail] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");

  const [isVerifying, setIsVerifying] = useState(false);
  const [errorText, setErrorText] = useState("");

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
        throw new Error("Sign-in session unavailable. Please try signing up again.");
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
      // No offline/mock session fallback — a session must come from a real
      // backend-issued token. Fabricating an "admin" session client-side was a
      // privilege-escalation hole.
      console.error("Registration sync failed:", err);
      const msg = err instanceof Error ? err.message : "Registration failed. Please try again.";
      setErrorText(msg);
      triggerToast(msg, "error");
    } finally {
      setIsVerifying(false);
    }
  };

  // Sign Up function for the Split-Pane view
  const handleSignUp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!fullName) {
      setErrorText("Please enter your name/username.");
      return;
    }
    if (!email) {
      setErrorText("Please enter your work email.");
      return;
    }
    if (!passwordInput) {
      setErrorText("Please enter your password.");
      return;
    }

    if (passwordInput.length < 6) {
      setErrorText("Password must be at least 6 characters.");
      return;
    }

    if (!isFirebaseConfigured) {
      await syncSessionWithBackend(email, fullName);
      return;
    }

    setIsVerifying(true);
    setErrorText("");

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, passwordInput);
      const emailToUse = userCredential.user.email || email;
      const displayName = fullName.trim() || userCredential.user.displayName || emailToUse.split("@")[0] || "Enterprise User";

      await syncSessionWithBackend(emailToUse, displayName);
    } catch (err) {
      const error = err as AuthError;
      if (
        error.code === "auth/operation-not-allowed" ||
        error.code === "auth/operation-not-supported" ||
        error.message?.includes("operation-not-allowed")
      ) {
        triggerToast("Firebase auth disabled. Registering via direct database...", "info");
        await syncSessionWithBackend(email, fullName);
        return;
      }

      let friendlyMsg = error.message || "Registration failed.";
      if (error.code === "auth/email-already-in-use") {
        friendlyMsg = "A user with this email address already exists.";
      } else if (error.code === "auth/invalid-email") {
        friendlyMsg = "The email address is badly formatted.";
      } else if (error.code === "auth/weak-password") {
        friendlyMsg = "The password must be at least 6 characters long.";
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
            <h3 className="text-xl font-black text-white tracking-tight">Start calling with AI</h3>
            <p className="text-xs text-white/55 font-semibold leading-relaxed mt-1">Create your account and get 100 free AI calls - no credit card required.</p>
          </div>
        </div>

        {/* Right: sign-up form */}
        <div className="p-8 sm:p-12 flex flex-col justify-center text-left">
          <div className="w-full max-w-sm mx-auto space-y-6">

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 md:hidden mb-5">
                <span className="text-base font-extrabold tracking-wider text-slate-800 lowercase">voqly</span>
                <div className="px-2 py-0.5 rounded-lg bg-black text-white font-black text-[9px] uppercase tracking-wider">AI</div>
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Create your account</h2>
              <p className="text-sm text-slate-500 font-semibold">Start with 100 free AI calls.</p>
            </div>

            {!isFirebaseConfigured && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3.5 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[10px] font-black text-orange-800 uppercase tracking-wider">Local Auth Mode</h4>
                  <p className="text-[11px] text-orange-700 font-semibold leading-normal mt-0.5">Authentication is in local mode. To enable full auth, configure your keys in <code className="bg-orange-100 px-1 py-0.5 rounded font-mono text-[10px] text-orange-900 font-extrabold">.env.local</code>.</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Name / Username</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jane Cooper"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 text-sm font-semibold text-slate-900 placeholder-slate-400 outline-none focus:border-orange-500 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Work Email</label>
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
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="At least 6 characters"
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
                <span>Create free account</span>
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
              <span>Google Sign Up</span>
            </button>

            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                Already have an account? <span className="text-orange-600 hover:underline">Sign in here</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
