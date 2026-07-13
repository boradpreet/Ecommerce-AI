"use client";

import React from "react";
import { AlertTriangle, Info, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  isDestructive?: boolean;
  isAlert?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  isDestructive = false,
  isAlert = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
        onClick={onCancel || onConfirm}
      />

      {/* Modal Card */}
      <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl shadow-2xl relative z-[101] overflow-hidden transform scale-100 transition-all duration-300 animate-in fade-in zoom-in-95 ease-out">
        {/* Close Button */}
        <button
          onClick={onCancel || onConfirm}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6">
          <div className="flex items-start gap-4">
            {/* Icon Container */}
            <div className={`p-3 rounded-2xl flex-shrink-0 ${
              isAlert 
                ? 'bg-blue-50 text-blue-500' 
                : isDestructive 
                  ? 'bg-red-50 text-red-500' 
                  : 'bg-amber-50 text-amber-500'
            }`}>
              {isAlert ? <Info className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>

            <div className="space-y-1.5 text-left">
              <h3 className="text-base font-extrabold text-slate-950 leading-6 tracking-tight">
                {title}
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                {message}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2.5">
          {!isAlert && onCancel && (
            <button
              onClick={onCancel}
              className="h-9 px-4 bg-white border border-slate-250 rounded-lg text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50/50 cursor-pointer transition-colors"
            >
              {cancelLabel}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`h-9 px-4 rounded-lg text-xs font-bold text-white shadow-xs cursor-pointer transition-colors ${
              isDestructive 
                ? "bg-red-600 hover:bg-red-750 active:bg-red-800" 
                : "bg-blue-650 hover:bg-blue-750 active:bg-blue-800"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
