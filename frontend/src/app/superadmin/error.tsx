"use client";

import React, { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function SuperAdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Super Admin Console Error Boundary:", error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8 bg-red-50/10 border border-red-100/50 rounded-3xl select-none">
      <div className="w-12 h-12 bg-red-50 border border-red-150 flex items-center justify-center rounded-2xl text-red-655 mb-4 shadow-3xs">
        <AlertCircle className="w-6 h-6 animate-bounce" />
      </div>
      <h2 className="text-base font-black text-slate-900 tracking-tight">Console Exception Caught</h2>
      <p className="text-xs text-slate-550 max-w-md mt-2 font-medium leading-relaxed">
        {error.message || "An unexpected error occurred while communicating with the administrative cluster nodes."}
      </p>
      <button
        onClick={() => reset()}
        className="mt-6 h-10 px-5 bg-[#0F2D67] hover:bg-slate-950 text-xs font-bold text-white rounded-xl transition flex items-center space-x-2 shadow-md cursor-pointer"
      >
        <RotateCcw className="w-4 h-4" />
        <span>Re-Calibrate System</span>
      </button>
    </div>
  );
}
