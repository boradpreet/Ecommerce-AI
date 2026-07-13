"use client";

import React from "react";
import { useOnboardingStore } from "src/store/useOnboardingStore";
import { 
  Headphones, TrendingUp, MessageSquare, Wrench, CreditCard, Network,
  Sparkles, CheckCircle
} from "lucide-react";

interface WorkflowItem {
  id: string;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}

const workflows: WorkflowItem[] = [
  { id: "Customer Support", label: "Customer Support", desc: "Resolve tickets, handle FAQs, and manage account queries in real-time.", icon: Headphones },
  { id: "Outbound Sales", label: "Outbound Sales", desc: "Lead qualification, appointment setting, and personalized cold outreach.", icon: TrendingUp },
  { id: "Feedback & Surveys", label: "Feedback & Surveys", desc: "Conduct CSAT surveys, market research, and post-call feedback loops.", icon: MessageSquare },
  { id: "Technical Support", label: "Technical Support", desc: "Guided troubleshooting, system status updates, and ticket escalation.", icon: Wrench },
  { id: "Debt Collection", label: "Debt Collection", desc: "Professional payment reminders and structured settlement negotiations.", icon: CreditCard },
  { id: "Internal Operations", label: "Internal Operations", desc: "Staff scheduling, HR assistance, and internal knowledge retrieval.", icon: Network },
];

export const StepWorkflow: React.FC = () => {
  const { selectedWorkflows, toggleWorkflow } = useOnboardingStore();

  return (
    <div className="w-full space-y-6 text-slate-800 animate-fade-in">
      
      {/* Title */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-slate-950 tracking-tight">What will your AI agent do?</h2>
        <p className="text-xs text-slate-500 font-medium">
          Select all that apply. Your selection helps us pre-configure the specialized neural models and response logic optimized for these workflows.
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {workflows.map((item) => {
          const isSelected = selectedWorkflows.includes(item.id);
          const Icon = item.icon;

          return (
            <div
              key={item.id}
              onClick={() => toggleWorkflow(item.id)}
              className={`relative bg-white rounded-xl border p-5 cursor-pointer select-none transition-all duration-300 ${
                isSelected
                  ? "border-blue-600 ring-2 ring-blue-600/10 shadow-md"
                  : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
              }`}
            >
              {/* Header inside card */}
              <div className="flex justify-between items-start mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  <Icon className="w-5 h-5" />
                </div>

                {isSelected && (
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                )}
              </div>

              {/* Title & Desc */}
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-900">{item.label}</h4>
                <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                  {item.desc}
                </p>
              </div>

              {/* SVG Decal background */}
              <div className="absolute right-0 bottom-0 opacity-[0.03] pointer-events-none">
                <Icon className="w-20 h-20" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Logic Preview Card */}
      <div className="bg-[#f1f5f9] border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
        
        <div className="flex items-start space-x-3 flex-1">
          <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-900">AI Logic Preview</h4>
            <p className="text-[11px] text-slate-500 font-semibold italic leading-relaxed">
              {"\"I'll help you configure specialized response kernels based on your choices above. Each use case triggers unique guardrails and compliance layers.\""}
            </p>
          </div>
        </div>

        {/* Small UI Mock panel */}
        <div className="w-48 bg-white border border-slate-200 rounded-lg p-3 flex flex-col space-y-2 shadow-inner shrink-0 pointer-events-none">
          <div className="w-full h-2 bg-blue-600 rounded-full" />
          <div className="w-2/3 h-1.5 bg-slate-200 rounded-full" />
          <div className="w-1/2 h-1.5 bg-slate-100 rounded-full" />
        </div>

      </div>

    </div>
  );
};
