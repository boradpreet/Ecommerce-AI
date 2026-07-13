"use client";

import React, { useState } from "react";
import { Filter } from "lucide-react";

export interface FilterGroup {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

interface FilterMenuProps {
  groups: FilterGroup[];
  value: Record<string, string>;
  onChange: (key: string, val: string) => void;
  onClear: () => void;
  align?: "left" | "right";
}

/**
 * Reusable filter control: a Filter icon button that opens a panel of
 * single-select chip groups (e.g. Status, Category). "all" means no filter.
 * Shows a badge with the number of active (non-"all") groups.
 */
export const FilterMenu: React.FC<FilterMenuProps> = ({ groups, value, onChange, onClear, align = "right" }) => {
  const [open, setOpen] = useState(false);
  const activeCount = groups.filter((g) => value[g.key] && value[g.key] !== "all").length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Filter"
        className={`h-9 px-3.5 border rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
          activeCount > 0 ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
        }`}
      >
        <Filter className="w-4 h-4" />
        <span className="hidden sm:inline">Filters</span>
        {activeCount > 0 && (
          <span className="min-w-[16px] h-4 px-1 bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            className={`absolute mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-3 space-y-3 text-left ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Filters</span>
              {activeCount > 0 && (
                <button onClick={onClear} className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer">
                  Clear all
                </button>
              )}
            </div>
            {groups.map((g) => (
              <div key={g.key} className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{g.label}</span>
                <div className="flex flex-wrap gap-1.5">
                  {g.options.map((opt) => {
                    const active = (value[g.key] || "all") === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => onChange(g.key, opt.value)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                          active ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
