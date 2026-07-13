"use client";

import React from "react";
import { LegalPage } from "src/components/marketing/legal-page";

export default function LegalPageRoute() {
  return (
    <LegalPage
      eyebrow="Legal Disclosures"
      title="Compliance and"
      highlight="disclosures"
      intro="Key legal and compliance information about the Voqly AI platform and the company that operates it."
      updated="June 2026"
      sections={[
        { h: "Company", p: [
          "The Voqly AI platform is owned and operated by Onewebmart Solution. For all legal correspondence, email business@onewebmart.com.",
        ]},
        { h: "Compliance frameworks", p: [
          "Voqly AI is built with HIPAA-, GDPR- and TCPA-aligned controls: encryption in transit and at rest, role-based access, consent capture and full audit logging.",
          "Compliance posture depends in part on how you configure and use the platform; you remain responsible for your own regulatory obligations.",
        ]},
        { h: "Calling & do-not-call", p: [
          "The platform supports automatic do-not-call scrubbing, configurable calling windows and consent capture. You are responsible for ensuring each campaign complies with the telemarketing and privacy laws that apply to you.",
        ]},
        { h: "AI-generated conversations", p: [
          "Calls are handled by AI voice agents. Outputs are generated automatically and may contain errors; they are not professional, legal, medical or financial advice. Review important outcomes before acting on them.",
        ]},
        { h: "Trademarks", p: [
          "“Voqly”, “Voqly AI” and related marks and logos are the property of their respective owners. Other names are used for identification only.",
        ]},
        { h: "Contact", p: [
          "For compliance, security or legal enquiries, email business@onewebmart.com.",
        ]},
      ]}
    />
  );
}
