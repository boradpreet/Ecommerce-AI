import * as React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, ...props }, ref) => {
    return (
      <div className="relative w-full group">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-400 transition-colors duration-200">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={twMerge(
            clsx(
              "flex h-11 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-slate-500",
              "transition-all duration-300 backdrop-blur-md outline-none",
              "focus:border-indigo-500/50 focus:bg-white/[0.05] focus:shadow-[0_0_15px_rgba(99,102,241,0.15)]",
              "disabled:cursor-not-allowed disabled:opacity-50",
              icon ? "pl-11" : "pl-4"
            ),
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
