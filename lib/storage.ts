"use client";

import type { Roadmap } from "./schemas";
import type { SavedItem } from "./types";

/** Client access to the account-backed library. */

export type PlanSummary = {
  id: string;
  kind: "roadmap" | "transition";
  title: string;
  subtitle: string;
  targetRole: string;
  totalWeeks: number;
  createdAt: string;
  progress: Record<string, boolean>;
  taskCount: number;
  completedTasks: number;
};

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new ApiError(
      typeof data.error === "string" ? data.error : "Something went wrong.",
      response.status,
      typeof data.code === "string" ? data.code : undefined,
    );
  }
  return data as T;
}

export async function listItems(): Promise<PlanSummary[]> {
  const data = await request<{ items: PlanSummary[] }>("/api/plans");
  return data.items;
}

export async function getItem(id: string): Promise<SavedItem | null> {
  try {
    const data = await request<{ item: SavedItem }>(`/api/plans/${id}`);
    return data.item;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function deleteItem(id: string): Promise<void> {
  await request<{ ok: true }>(`/api/plans/${id}`, { method: "DELETE" });
}

export async function saveProgress(id: string, progress: Record<string, boolean>): Promise<void> {
  await request<{ ok: true }>(`/api/plans/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ progress }),
  });
}

export function totalTasks(item: { roadmap: Roadmap }): number {
  return item.roadmap.phases.reduce((sum, phase) => sum + phase.tasks.length, 0);
}

export function completion(item: { roadmap: Roadmap; progress?: Record<string, boolean> }): number {
  const total = totalTasks(item);
  if (!total) return 0;
  const done = Object.values(item.progress ?? {}).filter(Boolean).length;
  return Math.min(100, Math.round((done / total) * 100));
}
