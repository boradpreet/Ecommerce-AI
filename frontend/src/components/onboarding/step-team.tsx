"use client";

import React, { useState } from "react";
import { useOnboardingStore } from "src/store/useOnboardingStore";
import { Plus, ShieldCheck, Zap, Mail } from "lucide-react";

export const StepTeam: React.FC = () => {
  const { teamMembers, addTeamMember } = useOnboardingStore();
  const [emailInput, setEmailInput] = useState("");
  const [roleInput, setRoleInput] = useState("Developer");
  const [error, setError] = useState("");

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) return;
    
    // Simple email regex validation
    if (!/\S+@\S+\.\S+/.test(emailInput)) {
      setError("Please enter a valid email address");
      return;
    }
    
    addTeamMember(emailInput, roleInput);
    setEmailInput("");
    setError("");
  };

  return (
    <div className="w-full space-y-6 text-slate-800 animate-fade-in">
      
      {/* Title */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-slate-950 tracking-tight">Invite your team <span className="text-slate-400 font-medium">(optional)</span></h2>
        <p className="text-xs text-slate-500 font-medium">
          Collaborate with your engineers and project managers to streamline the voice AI integration.
        </p>
      </div>

      {/* Invite box card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <form onSubmit={handleAddMember} className="flex flex-col md:flex-row items-end gap-4">
          
          {/* Email input */}
          <div className="flex-1 space-y-1.5 text-left w-full">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                placeholder="e.g. sarah@company.ai"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-950 placeholder-slate-400 pl-10 outline-none focus:border-blue-600"
              />
            </div>
            {error && (
              <p className="text-[10px] text-red-600 font-bold">{error}</p>
            )}
          </div>

          {/* Role select */}
          <div className="w-full md:w-48 space-y-1.5 text-left">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Role</label>
            <select
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-600"
            >
              <option value="Developer">Developer</option>
              <option value="Administrator">Administrator</option>
              <option value="Product Manager">Product Manager</option>
              <option value="Member">Member</option>
            </select>
          </div>

          {/* Add trigger */}
          <button
            type="submit"
            className="h-10 px-5 text-xs font-bold text-white bg-[#0f2e5c] hover:bg-[#1e40af] rounded-lg transition-all flex items-center justify-center space-x-1.5 w-full md:w-auto shrink-0 cursor-pointer active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>

        </form>
      </div>

      {/* Team members list card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-3">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Team Members ({teamMembers.length})
        </h4>

        <div className="divide-y divide-slate-100">
          {teamMembers.map((member) => {
            const initials = member.email
              .split("@")[0]
              .substring(0, 2)
              .toUpperCase();
            
            // Set dynamic status badge styles
            const statusStyles = {
              ACTIVE: "bg-slate-100 text-slate-600 border border-slate-200",
              PENDING: "bg-amber-100 text-amber-700 border border-amber-200",
              INVITED: "bg-blue-50 text-blue-600 border border-blue-100",
            };

            return (
              <div key={member.id} className="flex justify-between items-center py-3.5 first:pt-0 last:pb-0">
                <div className="flex items-center space-x-3">
                  {/* Avatar Initial circle */}
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                    {initials}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-900">{member.email}</p>
                    <p className="text-[9px] font-semibold text-slate-400 mt-0.5">{member.role}</p>
                  </div>
                </div>

                {/* Status Badges */}
                <span className={`text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-full ${statusStyles[member.status]}`}>
                  {member.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Columns visual helper bottom */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Column 1 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start space-x-3.5 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 text-left">
            <h4 className="text-xs font-bold text-slate-900">Centralized Control</h4>
            <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
              Assign granular permissions to ensure your voice models are only edited by authorized personnel.
            </p>
          </div>
        </div>

        {/* Column 2 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start space-x-3.5 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 text-left">
            <h4 className="text-xs font-bold text-slate-900">Fast Onboarding</h4>
            <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
              Invited members get immediate access to the API documentation and test environment keys.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
