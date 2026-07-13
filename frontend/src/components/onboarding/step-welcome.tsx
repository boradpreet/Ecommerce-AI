"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { User, Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useOnboardingStore } from "src/store/useOnboardingStore";
import { Input } from "src/components/ui/input";
import { Button } from "src/components/ui/button";

const schema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormData = z.infer<typeof schema>;

export const StepWelcome: React.FC = () => {
  const { setStep, setAccountInfo } = useOnboardingStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    // Simulate API registration delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setAccountInfo(data.fullName, data.email);
    setIsLoading(false);
    setStep(2);  // Proceed to Step 2
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setAccountInfo("Enterprise User", "user@enterprise.com");
    setIsGoogleLoading(false);
    setStep(2);  // Proceed
  };

  return (
    <div className="w-full flex flex-col space-y-6">
      {/* Title block */}
      <div className="space-y-1.5">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
          Create your enterprise voice pipeline
        </h2>
        <p className="text-sm text-slate-400">
          Get started with Voqly AI calling system in under 2 minutes.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Full Name input */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Full Name</label>
          <Input
            type="text"
            placeholder="John Doe"
            icon={<User className="w-4 h-4" />}
            {...register("fullName")}
            disabled={isLoading || isGoogleLoading}
          />
          {errors.fullName && (
            <p className="text-xs text-red-400 mt-1">{errors.fullName.message}</p>
          )}
        </div>

        {/* Email input */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email Address</label>
          <Input
            type="email"
            placeholder="name@company.com"
            icon={<Mail className="w-4 h-4" />}
            {...register("email")}
            disabled={isLoading || isGoogleLoading}
          />
          {errors.email && (
            <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* Password input */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4" />}
              {...register("password")}
              disabled={isLoading || isGoogleLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>
          )}
        </div>

        {/* Continue button */}
        <Button
          type="submit"
          className="w-full mt-2 justify-between"
          isLoading={isLoading}
          disabled={isGoogleLoading}
        >
          <span>Create Free Account</span>
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </form>

      {/* Divider */}
      <div className="relative flex items-center justify-center my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/[0.08]" />
        </div>
        <span className="relative px-3 text-xs uppercase text-slate-500 font-semibold bg-black/40 backdrop-blur-md">
          Or continue with
        </span>
      </div>

      {/* Google Sign-in */}
      <Button
        type="button"
        variant="glass"
        className="w-full space-x-2"
        onClick={handleGoogleLogin}
        isLoading={isGoogleLoading}
        disabled={isLoading}
      >
        {/* Simple Google SVG Icon */}
        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        <span>Sign up with Google</span>
      </Button>

      {/* Footer login redirect */}
      <p className="text-center text-xs text-slate-500">
        Already have an account?{" "}
        <a href="#" className="text-indigo-400 hover:text-indigo-300 font-medium underline transition-colors">
          Sign In
        </a>
      </p>
    </div>
  );
};
