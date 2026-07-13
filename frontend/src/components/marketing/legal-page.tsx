"use client";

import React from "react";
import { MarketingShell, PageHero } from "src/components/marketing/marketing-shell";

export interface LegalSection {
  h: string;
  p: string[];
}

export function LegalPage({ eyebrow, title, highlight, intro, updated, sections }: {
  eyebrow: string;
  title: string;
  highlight?: string;
  intro: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <MarketingShell>
      <div className="space-y-12">
        <PageHero eyebrow={eyebrow} title={title} highlight={highlight} subtitle={intro} />

        <article className="max-w-3xl mx-auto w-full bg-white border border-slate-200/70 rounded-3xl p-8 sm:p-10 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Last updated: {updated}</p>
          <div className="mt-6 space-y-8">
            {sections.map((s, i) => (
              <section key={i} className="space-y-3">
                <h2 className="text-lg font-black text-slate-900">{i + 1}. {s.h}</h2>
                {s.p.map((para, j) => (
                  <p key={j} className="text-sm text-slate-600 font-medium leading-relaxed">{para}</p>
                ))}
              </section>
            ))}
          </div>
          <p className="mt-10 pt-6 border-t border-slate-100 text-sm text-slate-500 font-medium">
            Questions about this page? Email{" "}
            <a href="mailto:business@onewebmart.com" className="font-bold text-slate-700 hover:text-orange-600">business@onewebmart.com</a>.
          </p>
        </article>
      </div>
    </MarketingShell>
  );
}
