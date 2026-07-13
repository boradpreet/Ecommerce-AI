"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Building2, Users, ArrowRight, ArrowLeft } from "lucide-react";
import { useOnboardingStore } from "src/store/useOnboardingStore";
import { Input } from "src/components/ui/input";
import { Button } from "src/components/ui/button";

const schema = z.object({
  orgName: z.string().min(2, "Organization name must be at least 2 characters"),
  orgSlug: z.string().min(2, "Workspace URL must be at least 2 characters"),
  teamSize: z.string(),
});

type FormData = z.infer<typeof schema>;

export const StepOrganization: React.FC = () => {
  const { setStep, setOrgInfo, fullName } = useOnboardingStore();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      teamSize: "1-10",
    },
  });

  const orgNameWatch = watch("orgName");

  // Automatically update the slug as the user types the organization name
  useEffect(() => {
    if (orgNameWatch) {
      const generatedSlug = orgNameWatch
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      setValue("orgSlug", generatedSlug, { shouldValidate: true });
    }
  }, [orgNameWatch, setValue]);

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    // Simulate server side workspace setup
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setOrgInfo(data.orgName, data.orgSlug, data.teamSize);
    setIsLoading(false);
    setStep(3);  // Proceed to Step 3
  };

  return (
    <div className="w-full flex flex-col space-y-6">
      {/* Title block */}
      <div className="space-y-1.5">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
          Setup your workspace, {fullName.split(" ")[0]}
        </h2>
        <p className="text-sm text-slate-400">
          Define your workspace settings and team profile.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Org Name */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Organization Name</label>
          <Input
            type="text"
            placeholder="Acme Voice Corp"
            icon={<Building2 className="w-4 h-4" />}
            {...register("orgName")}
            disabled={isLoading}
          />
          {errors.orgName && (
            <p className="text-xs text-red-400 mt-1">{errors.orgName.message}</p>
          )}
        </div>

        {/* Workspace URL / Slug */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Workspace URL</label>
          <div className="relative flex items-center">
            <span className="absolute left-3.5 text-xs text-slate-500 font-medium select-none">
              voqly.ai/
            </span>
            <input
              type="text"
              placeholder="acme-voice"
              className={`flex h-11 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] pl-[68px] pr-3 py-2 text-sm text-white placeholder-slate-500 transition-all duration-300 backdrop-blur-md outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] focus:shadow-[0_0_15px_rgba(99,102,241,0.15)] disabled:cursor-not-allowed disabled:opacity-50`}
              {...register("orgSlug")}
              disabled={isLoading}
            />
          </div>
          {errors.orgSlug && (
            <p className="text-xs text-red-400 mt-1">{errors.orgSlug.message}</p>
          )}
        </div>

        {/* Team Size */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Team Size</label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <Users className="w-4 h-4" />
            </div>
            <select
              className="flex h-11 w-full rounded-lg border border-white/[0.08] bg-slate-950 px-3 py-2 text-sm text-white pl-11 outline-none transition-all focus:border-indigo-500/50"
              {...register("teamSize")}
              disabled={isLoading}
            >
              <option value="1-10">1 - 10 members</option>
              <option value="11-50">11 - 50 members</option>
              <option value="51-200">51 - 200 members</option>
              <option value="200+">200+ enterprise members</option>
            </select>
          </div>
        </div>

        {/* Nav Buttons */}
        <div className="flex space-x-3 pt-2">
          <Button
            type="button"
            variant="glass"
            className="w-1/3"
            onClick={() => setStep(1)}
            disabled={isLoading}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span>Back</span>
          </Button>

          <Button
            type="submit"
            className="flex-1 justify-between"
            isLoading={isLoading}
          >
            <span>Continue Configuration</span>
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </form>
    </div>
  );
};
