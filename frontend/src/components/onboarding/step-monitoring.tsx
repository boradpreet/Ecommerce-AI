"use client";

import React from "react";
import { useOnboardingStore } from "src/store/useOnboardingStore";
import { Activity, Bell, MessageSquare } from "lucide-react";

export const StepMonitoring: React.FC = () => {
  const { slackWebhook, setBusinessDetails } = useOnboardingStore();

  return (
    <div className="w-full space-y-6 text-slate-800 text-left animate-fade-in">
      
      {/* Title */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-slate-950 tracking-tight">Monitoring Setup</h2>
        <p className="text-xs text-slate-500 font-medium">
          Set up automated webhooks and Slack integrations to monitor call metrics and sentiments in real-time.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Slack Alerts */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
          <span className="text-xs font-bold text-slate-900 flex items-center">
            <MessageSquare className="w-4.5 h-4.5 mr-2 text-indigo-600" /> Slack Notifications
          </span>

          <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
            Automatically post outbound calling sentiments, transcription summaries, and fallback alerts directly to a company Slack channel.
          </p>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Slack Webhook URL</label>
            <input
              type="url"
              placeholder="https://hooks.slack.com/services/..."
              value={slackWebhook}
              onChange={(e) => setBusinessDetails({ slackWebhook: e.target.value })}
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-950 placeholder-slate-400 outline-none focus:border-blue-600 font-mono"
            />
          </div>
        </div>

        {/* Telemetry charts */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-900 flex items-center">
              <Activity className="w-4.5 h-4.5 mr-2 text-blue-600 animate-pulse" /> Telemetry Stream
            </span>

            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
              Voqly automatically queries real-time sentiment metrics, audio jitter profiles, and model performance traces. No extra SDK installation is required.
            </p>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-[10px] text-blue-800 font-semibold flex items-center">
            <Bell className="w-4 h-4 text-blue-600 mr-2 shrink-0 animate-bounce" />
            <span>Default Webhooks are active for all outbound dials.</span>
          </div>
        </div>

      </div>

    </div>
  );
};
