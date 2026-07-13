"use client";

import React, { useEffect } from "react";
import { useAuthStore } from "src/store/authStore";
import { useRouter } from "next/navigation";
import { VoiceLibraryTab } from "src/components/dashboard/voice-library-tab";

export default function DashboardVoiceLibraryPage() {
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const router = useRouter();

  useEffect(() => {
    if (!hasHydrated) return;
    if (!token) {
      router.replace("/");
    }
  }, [hasHydrated, router, token]);

  if (!hasHydrated || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">Loading voice library…</div>
    );
  }

  return <VoiceLibraryTab token={token} triggerSuccess={() => undefined} triggerError={() => undefined} />;
}
