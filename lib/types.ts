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
  goal: z.string().trim().min(3).max(200),
  level: z.enum(["absolute beginner", "some basics", "intermediate", "advanced"]),
  hoursPerWeek: z.coerce.number().int().min(1).max(60),
  durationWeeks: z.coerce.number().int().min(2).max(104),
  background: z.string().trim().max(1500).default(""),
  preferences: z.array(z.string().max(60)).max(6).default([]),
});

export const TransitionInputSchema = z.object({
  currentRole: z.string().trim().min(2).max(160),
  yearsExperience: z.coerce.number().min(0).max(50),
  currentSkills: z.string().trim().min(3).max(2500),
  targetRole: z.string().trim().min(2).max(160),
  targetIndustry: z.string().trim().max(160).default(""),
  hoursPerWeek: z.coerce.number().int().min(1).max(60),
  timelineMonths: z.coerce.number().int().min(1).max(60),
  constraints: z.string().trim().max(1200).default(""),
});
