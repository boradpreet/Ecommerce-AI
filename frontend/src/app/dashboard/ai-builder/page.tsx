"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardAiBuilderPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/agents");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-slate-500">
      Loading...
    </div>
  );
}
