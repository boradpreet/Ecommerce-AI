"use client";

import React from "react";
import { LegalPage } from "src/components/marketing/legal-page";

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy Policy"
      title="How we handle your"
      highlight="data"
      intro="This policy explains what information Voqly AI collects, how we use it, and the choices you have. We keep it short and plain."
      updated="June 2026"
      sections={[
        { h: "Information we collect", p: [
          "Account data you provide — name, work email, company and billing details when you sign up or contact us.",
          "Calling data generated when you use the platform — phone numbers dialled, call metadata, recordings and transcripts of AI conversations you run.",
          "Usage and device data such as log files, IP address and browser type, used to keep the service secure and reliable.",
        ]},
        { h: "How we use your information", p: [
          "To provide and operate the AI calling platform, place and receive calls on your behalf, and generate analytics for your campaigns.",
          "To bill you, provide support, send service notices, and improve our voice models and product.",
          "We do not sell your personal data.",
        ]},
        { h: "Call recordings & transcripts", p: [
          "Calls you run may be recorded and transcribed so you can review outcomes and sentiment. You are responsible for obtaining any consent required in your jurisdiction before recording a call.",
          "Recordings and transcripts are stored against your account and are deleted when you delete the related records or close your account.",
        ]},
        { h: "Data security", p: [
          "Data is encrypted in transit and at rest. Access is restricted to authorised personnel and scoped per organisation.",
          "We maintain audit logs and follow least-privilege access controls.",
        ]},
        { h: "Your rights", p: [
          "You can access, correct, export or delete your personal data. Contact us and we will action verified requests within a reasonable period.",
        ]},
        { h: "Data controller", p: [
          "Voqly AI is operated by Onewebmart Solution. For privacy questions or requests, email business@onewebmart.com.",
        ]},
      ]}
    />
  );
}
