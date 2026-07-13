"use client";

import React from "react";
import { StepSignin } from "src/components/onboarding/step-signin";

export default function RootPage() {
  return (
    <main className="min-h-screen w-full">
      <StepSignin />
    </main>
  );
}
