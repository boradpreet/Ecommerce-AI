"use client";

import React from "react";
import { LegalPage } from "src/components/marketing/legal-page";

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms of Service"
      title="The terms behind your"
      highlight="account"
      intro="These terms govern your use of the Voqly AI platform. By creating an account or using the service, you agree to them."
      updated="June 2026"
      sections={[
        { h: "Acceptance of terms", p: [
          "By accessing or using Voqly AI you agree to these Terms of Service and our Privacy Policy. If you are using the service on behalf of an organisation, you accept these terms for that organisation.",
        ]},
        { h: "The service", p: [
          "Voqly AI provides AI voice agents that place and receive phone calls, qualify leads, book meetings and produce call analytics. Features and limits depend on your plan.",
        ]},
        { h: "Free minutes", p: [
          "New accounts start with 100 minutes of free AI calls so you can try the platform — no credit card required. Free minutes are for evaluation, are non-transferable and have no cash value.",
        ]},
        { h: "Acceptable use", p: [
          "You must have the legal right and any required consent to call the numbers you dial. You agree to honour do-not-call requests, calling-window rules and applicable telemarketing laws.",
          "You may not use the service for fraud, harassment, spam, or any unlawful purpose. We may suspend accounts that violate these rules.",
        ]},
        { h: "Billing", p: [
          "Paid plans are billed in advance on a recurring basis. Usage above your plan may incur top-up charges. Fees are non-refundable except where required by law.",
        ]},
        { h: "Liability", p: [
          "The service is provided “as is”. To the maximum extent permitted by law, Voqly AI and Onewebmart Solution are not liable for indirect or consequential damages arising from your use of the service.",
        ]},
        { h: "Termination", p: [
          "You may stop using the service at any time. We may suspend or terminate access for breach of these terms. On termination your data is handled per our Privacy Policy.",
        ]},
        { h: "Contact", p: [
          "Questions about these terms? Email business@onewebmart.com.",
        ]},
      ]}
    />
  );
}
