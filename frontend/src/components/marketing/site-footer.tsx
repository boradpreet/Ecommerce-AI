import React from "react";

/* ------------------------------------------------------------------ */
/* Shared site footer — used on the landing page and every marketing  */
/* page so the footer is identical everywhere.                         */
/* ------------------------------------------------------------------ */
export function SiteFooter() {
  return (
    <footer className="relative bg-[#03060b] text-white py-16 px-6 sm:px-12 select-none text-left rounded-t-[40px] border-t border-slate-900/60 overflow-hidden bg-dotted-grid">
      {/* Glow decorative background elements */}
      <div className="absolute top-0 left-1/4 -translate-y-1/2 w-80 h-80 rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 translate-y-1/2 w-96 h-96 rounded-full bg-purple-500/10 blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-8 border-b border-slate-900/60 pb-12">

          {/* Brand details */}
          <div className="col-span-2 md:col-span-3 space-y-6">
            <div className="flex items-center space-x-1.5">
              <span className="text-base font-extrabold tracking-wider text-white lowercase">voqly</span>
              <div className="px-2 py-0.5 rounded-lg bg-white flex items-center justify-center text-slate-900 font-black text-[9px] uppercase tracking-wider">AI</div>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-semibold max-w-xs">
              Premium cloud conversational calling framework powered by real-time voice synthesis engines and secure HIPAA-locked systems.
            </p>

            <div className="space-y-1.5 pt-1">
              <p className="text-[9px] text-slate-450 font-black uppercase tracking-wider">Get in touch</p>
              <a href="mailto:business@onewebmart.com" className="block text-[11px] text-slate-300 hover:text-white font-semibold transition-colors break-all">business@onewebmart.com</a>
              <a href="tel:+919033806717" className="block text-[11px] text-slate-300 hover:text-white font-semibold transition-colors">+91 9033806717</a>
              <a href="tel:+919408307302" className="block text-[11px] text-slate-300 hover:text-white font-semibold transition-colors">+91 9408307302</a>
            </div>

            <div className="space-y-2 pt-2">
              <p className="text-[9px] text-slate-450 font-black uppercase tracking-wider">Connect with us</p>
              <div className="flex items-center space-x-3.5">
                <a href="https://www.instagram.com/onewebmart/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-slate-400 hover:text-white transition-all hover:scale-110">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                </a>
                <a href="https://www.linkedin.com/company/onewebmart-solution" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-slate-400 hover:text-white transition-all hover:scale-110">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Footer link columns */}
          <div className="space-y-3 col-span-1 md:col-span-3 md:pl-4">
            <h5 className="text-[10px] font-black uppercase text-white tracking-widest pb-1 w-max">Industries</h5>
            <ul className="space-y-2 text-[10px] font-semibold text-slate-400">
              <li><a href="/industries" className="hover:text-white transition-colors inline-flex items-center gap-1.5">Hotel <span className="text-[8px] font-black uppercase tracking-wider text-orange-400">New</span></a></li>
              <li><a href="/industries" className="hover:text-white transition-colors">E-commerce</a></li>
              <li><a href="/industries" className="hover:text-white transition-colors">Healthcare</a></li>
              <li><a href="/industries" className="hover:text-white transition-colors">Real Estate</a></li>
              <li><a href="/industries" className="hover:text-white transition-colors">Banking &amp; Finance</a></li>
              <li><a href="/industries" className="hover:text-white transition-colors text-slate-300 font-bold">View all 13 →</a></li>
            </ul>
          </div>

          <div className="space-y-3 col-span-1 md:col-span-3">
            <h5 className="text-[10px] font-black uppercase text-white tracking-widest pb-1 w-max">Solutions</h5>
            <ul className="space-y-2 text-[10px] font-semibold text-slate-400">
              <li><a href="/solutions/support-agents" className="hover:text-white transition-colors">Support Agents</a></li>
              <li><a href="/solutions/inbound-calls" className="hover:text-white transition-colors">Inbound Calls</a></li>
              <li><a href="/solutions/outbound-sales" className="hover:text-white transition-colors">Outbound Sales</a></li>
              <li><a href="/solutions/campaign-desk" className="hover:text-white transition-colors">Campaign Desk</a></li>
              <li><a href="/pricing" className="hover:text-white transition-colors">Pricing</a></li>
            </ul>
          </div>

          <div className="space-y-3 col-span-1 md:col-span-3">
            <h5 className="text-[10px] font-black uppercase text-white tracking-widest pb-1 w-max">Company</h5>
            <ul className="space-y-2 text-[10px] font-semibold text-slate-400">
              <li><a href="/solutions" className="hover:text-white transition-colors">Solutions</a></li>
              <li><a href="/functionality" className="hover:text-white transition-colors">Functionality</a></li>
              <li><a href="/pricing" className="hover:text-white transition-colors">Pricing</a></li>
              <li><a href="/contact" className="hover:text-white transition-colors">Contact Us</a></li>
              <li><a href="/login" className="hover:text-white transition-colors">Login</a></li>
            </ul>
          </div>

        </div>

        {/* Giant logo text block with shifting gradient flow and glow */}
        <div className="pt-12 text-center select-none relative overflow-hidden flex items-center justify-center">
          <h2 className="text-[10vw] font-black tracking-tighter animate-gradient-flow select-none pointer-events-none opacity-90 leading-none py-4">
            voqly<span className="tracking-normal text-orange-500 font-extrabold">AI</span>
          </h2>
        </div>

        {/* Bottom copyright details */}
        <div className="pt-8 border-t border-slate-900/60 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-500 font-semibold gap-4">
          <span>
            © 2026 Voqly AI. All rights reserved by{" "}
            <a href="https://onewebmart.com/" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-white transition-colors font-bold">
              Onewebmart Solution
            </a>.
          </span>
          <div className="flex space-x-6">
            <a href="/privacy" className="hover:underline hover:text-slate-400">Privacy Policy</a>
            <a href="/terms" className="hover:underline hover:text-slate-400">Terms of Service</a>
            <a href="/legal" className="hover:underline hover:text-slate-400">Legal Disclosures</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
