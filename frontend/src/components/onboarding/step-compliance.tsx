"use client";

import React, { useState } from "react";
import { useOnboardingStore } from "src/store/useOnboardingStore";
import { Landmark, ShieldCheck } from "lucide-react";

export const StepCompliance: React.FC = () => {
  const { complianceHipaa } = useOnboardingStore();
  const [tcpaChecked, setTcpaChecked] = useState(true);
  const [gdprChecked, setGdprChecked] = useState(true);

  return (
    <div className="w-full space-y-6 text-slate-800 text-left animate-fade-in">
      
      {/* Title */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-slate-950 tracking-tight">Compliance & Audits</h2>
        <p className="text-xs text-slate-500 font-medium">
          Certify regulatory compliance requirements before deploying outbound voice networks.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
        <span className="text-xs font-bold text-slate-900 flex items-center">
          <Landmark className="w-4.5 h-4.5 mr-2 text-blue-600" /> Regulatory Certifications
        </span>

        <div className="space-y-3.5">
          {/* TCPA Checkbox */}
          <div 
            onClick={() => setTcpaChecked(!tcpaChecked)}
            className="flex items-start space-x-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer select-none"
          >
            <input 
              type="checkbox"
              checked={tcpaChecked}
              readOnly
              className="w-4.5 h-4.5 accent-blue-600 rounded mt-0.5" 
            />
            <div className="space-y-0.5">
              <h5 className="text-xs font-bold text-slate-900">TCPA Consent Compliance</h5>
              <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                Confirm all lead spreadsheet uploads have provided express written consent to receive artificial/synthetic voice outreach.
              </p>
            </div>
          </div>

          {/* GDPR Checkbox */}
          <div 
            onClick={() => setGdprChecked(!gdprChecked)}
            className="flex items-start space-x-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer select-none"
          >
            <input 
              type="checkbox"
              checked={gdprChecked}
              readOnly
              className="w-4.5 h-4.5 accent-blue-600 rounded mt-0.5" 
            />
            <div className="space-y-0.5">
              <h5 className="text-xs font-bold text-slate-900">Data Redaction & GDPR Right-to-Erasure</h5>
              <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                Automatically redact credit cards, SSNs, and private credentials from dialogue JSON transcript logs.
              </p>
            </div>
          </div>
        </div>

        {/* HIPAA notice if active */}
        {complianceHipaa && (
          <div className="p-4 bg-emerald-50 border border-emerald-150 rounded-xl flex items-center space-x-3 text-[10px] text-emerald-850 font-bold">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>HIPAA priority active: Your agents will be hosted on dedicated encrypted servers with active BAA agreements.</span>
          </div>
        )}

      </div>

    </div>
  );
};
