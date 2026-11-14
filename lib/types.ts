import { z } from "zod";
import type { Roadmap, TransitionResult } from "./schemas";

export type Mode = "roadmap" | "transition";

export type RoadmapInput = {
  goal: string;
  level: "absolute beginner" | "some basics" | "intermediate" | "advanced";
  hoursPerWeek: number;
  durationWeeks: number;
  background: string;
  preferences: string[];
};

export type TransitionInput = {
  currentRole: string;
  yearsExperience: number;
  currentSkills: string;
  targetRole: string;
  targetIndustry: string;
  hoursPerWeek: number;
  timelineMonths: number;
  constraints: string;
};

export type SavedItem = {
  id: string;
  kind: Mode;
  createdAt: string;
  title: string;
  subtitle: string;
  input: RoadmapInput | TransitionInput;
  roadmap: Roadmap;
  transition?: TransitionResult;
  progress: Record<string, boolean>;
};

/* ---------- request validation (server side) ---------- */

export const RoadmapInputSchema = z.object({
  goal: z.string().trim().min(3, "Tell us what you want to learn — at least a few characters.").max(200, "Keep the goal under 200 characters."),
  level: z.enum(["absolute beginner", "some basics", "intermediate", "advanced"]),
  hoursPerWeek: z.coerce.number().int().min(1, "At least one hour per week.").max(60, "60 hours per week is the maximum."),
  durationWeeks: z.coerce.number().int().min(2, "Plans need at least two weeks.").max(104, "Two years is the maximum."),
  background: z.string().trim().max(1500, "Keep the background under 1500 characters.").default(""),
  preferences: z.array(z.string().max(60)).max(6).default([]),
});

export const TransitionInputSchema = z.object({
  currentRole: z.string().trim().min(2, "Tell us your current role.").max(160, "Keep the role under 160 characters."),
  yearsExperience: z.coerce.number().min(0, "Experience cannot be negative.").max(50, "50 years is the maximum."),
  currentSkills: z.string().trim().min(3, "List at least a few skills so we can map what carries over.").max(2500, "Keep the skill list under 2500 characters."),
  targetRole: z.string().trim().min(2, "Tell us the role you are targeting.").max(160, "Keep the role under 160 characters."),
  targetIndustry: z.string().trim().max(160).default(""),
  hoursPerWeek: z.coerce.number().int().min(1, "At least one hour per week.").max(60, "60 hours per week is the maximum."),
  timelineMonths: z.coerce.number().int().min(1, "Give the plan at least one month.").max(60, "Five years is the maximum."),
  constraints: z.string().trim().max(1200, "Keep constraints under 1200 characters.").default(""),
});
