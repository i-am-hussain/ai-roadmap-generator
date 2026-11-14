import type { SavedItem } from "./types";

const KEY = "pathforge.v1.items";

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function isBrowser() {
  return typeof window !== "undefined";
}

export function listItems(): SavedItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as SavedItem[])
      .filter((item) => item && typeof item.id === "string")
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  } catch {
    return [];
  }
}

export function getItem(id: string): SavedItem | null {
  return listItems().find((item) => item.id === id) ?? null;
}

export function saveItem(item: SavedItem): void {
  if (!isBrowser()) return;
  try {
    const items = listItems().filter((existing) => existing.id !== item.id);
    window.localStorage.setItem(KEY, JSON.stringify([item, ...items].slice(0, 60)));
  } catch {
    /* storage full or unavailable — the app still works for this session */
  }
}

export function deleteItem(id: string): void {
  if (!isBrowser()) return;
  try {
    const items = listItems().filter((item) => item.id !== id);
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

export function saveProgress(id: string, progress: Record<string, boolean>): void {
  const item = getItem(id);
  if (!item) return;
  saveItem({ ...item, progress });
}

export function totalTasks(item: SavedItem): number {
  return item.roadmap.phases.reduce((sum, phase) => sum + phase.tasks.length, 0);
}

export function completion(item: SavedItem): number {
  const total = totalTasks(item);
  if (!total) return 0;
  const done = Object.values(item.progress ?? {}).filter(Boolean).length;
  return Math.min(100, Math.round((done / total) * 100));
}
