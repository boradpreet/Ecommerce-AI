"use client";

import React from "react";
import { useOnboardingStore } from "src/store/useOnboardingStore";
import { Globe, Lock, Clock, Phone } from "lucide-react";

export const StepRegional: React.FC = () => {
  const { timezoneLock, setBusinessDetails } = useOnboardingStore();

  return (
    <div className="w-full space-y-6 text-slate-800 text-left animate-fade-in">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-slate-950 tracking-tight">Regional Settings</h2>
        <p className="text-xs text-slate-500 font-medium">
          Configure telephony locales, dialing zones, and calling time compliance guidelines.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Locale Dialing */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
          <span className="text-xs font-bold text-slate-900 flex items-center">
            <Globe className="w-4 h-4 mr-2 text-blue-600" /> Locale Dialing
          </span>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Target Phone Country</label>
              <select className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-600">
                <option value="US">United States (+1)</option>
                <option value="UK">United Kingdom (+44)</option>
                <option value="IN">India (+91)</option>
                <option value="AU">Australia (+61)</option>
                <option value="CA">Canada (+1)</option>
                <option value="DE">Germany (+49)</option>
                <option value="SG">Singapore (+65)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Accent Match Model</label>
              <select className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-600">
                <option value="Default">Default Regional Accent</option>
                <option value="Midwest">US Midwest Neutral</option>
                <option value="London">UK London Standard</option>
                <option value="Indian">Indian English</option>
                <option value="Australian">Australian English</option>
              </select>
            </div>
          </div>
        </div>

        {/* Timezone Dial Locks */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <span className="text-xs font-bold text-slate-900 flex items-center">
              <Lock className="w-4 h-4 mr-2 text-blue-600" /> Timezone Dial Locks
            </span>
            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
              Automated TCPA guidelines restrict telephone solicitation outside 8:00 AM – 9:00 PM local recipient timezone. Voqly automatically locks active calling loops outside compliance hours.
            </p>
          </div>
          <div
            onClick={() => setBusinessDetails({ timezoneLock: !timezoneLock })}
            className={`p-3.5 rounded-lg border cursor-pointer select-none transition-all duration-300 flex justify-between items-center ${
              timezoneLock ? "bg-blue-50/50 border-blue-600" : "bg-slate-50 border-slate-200"
            }`}
          >
            <div>
              <h5 className="text-xs font-bold text-slate-900">Enforce compliance timezone lock</h5>
              <p className="text-[9px] text-slate-400 font-bold mt-0.5">Recommended</p>
            </div>
            <input type="checkbox" checked={timezoneLock} readOnly className="w-4 h-4 accent-blue-600 rounded" />
          </div>
        </div>

        {/* Calling Hours */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
          <span className="text-xs font-bold text-slate-900 flex items-center">
            <Clock className="w-4 h-4 mr-2 text-blue-600" /> Calling Hours
          </span>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Start Time</label>
              <select className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-600">
                <option>08:00 AM</option>
                <option>09:00 AM</option>
                <option>10:00 AM</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">End Time</label>
              <select className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-600">
                <option>05:00 PM</option>
                <option>07:00 PM</option>
                <option>09:00 PM</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Active Days</label>
            <div className="flex flex-wrap gap-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <button key={day} type="button"
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                    ["Mon","Tue","Wed","Thu","Fri"].includes(day)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-500 border-slate-200 hover:border-blue-400"
                  }`}>
                  {day}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dialing Configuration */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
          <span className="text-xs font-bold text-slate-900 flex items-center">
            <Phone className="w-4 h-4 mr-2 text-blue-600" /> Dialing Configuration
          </span>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Max Concurrent Calls</label>
              <select className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-600">
                <option>5 concurrent calls</option>
                <option>10 concurrent calls</option>
                <option>25 concurrent calls</option>
                <option>50 concurrent calls</option>
                <option>100 concurrent calls</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Retry Attempts</label>
              <select className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-600">
                <option>1 attempt</option>
                <option>2 attempts</option>
                <option>3 attempts</option>
                <option>5 attempts</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Retry Delay</label>
              <select className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-600">
                <option>30 minutes</option>
                <option>1 hour</option>
                <option>2 hours</option>
                <option>4 hours</option>
                <option>24 hours</option>
              </select>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
