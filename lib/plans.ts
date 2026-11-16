import { ObjectId } from "mongodb";
import { plans, type PlanDoc } from "./db";
import type { Mode, SavedItem } from "./types";
import type { Roadmap, TransitionResult } from "./schemas";

export type PlanSummary = {
  id: string;
  kind: Mode;
  title: string;
  subtitle: string;
  targetRole: string;
  totalWeeks: number;
  createdAt: string;
  progress: Record<string, boolean>;
  taskCount: number;
  completedTasks: number;
};

function toItem(doc: PlanDoc): SavedItem {
  return {
    id: doc._id!.toString(),
    kind: doc.kind,
    createdAt: doc.createdAt.toISOString(),
    title: doc.title,
    subtitle: doc.subtitle,
    input: doc.input,
    roadmap: doc.roadmap,
    transition: doc.transition,
    progress: doc.progress ?? {},
  };
}

export async function createPlan(
  userId: string,
  data: {
    kind: Mode;
    title: string;
    subtitle: string;
    input: PlanDoc["input"];
    roadmap: Roadmap;
    transition?: TransitionResult;
  },
): Promise<SavedItem> {
  const now = new Date();
  const doc: PlanDoc = {
    userId: new ObjectId(userId),
    kind: data.kind,
    title: data.title,
    subtitle: data.subtitle,
    input: data.input,
    roadmap: data.roadmap,
    transition: data.transition,
    progress: {},
    createdAt: now,
    updatedAt: now,
  };

  const result = await (await plans()).insertOne(doc);
  return toItem({ ...doc, _id: result.insertedId });
}

export async function listPlans(userId: string): Promise<PlanSummary[]> {
  const docs = await (
    await plans()
  )
    .find({ userId: new ObjectId(userId) }, { projection: { transition: 0 } })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  return docs.map((doc) => {
    const taskCount = doc.roadmap.phases.reduce(
      (sum, phase) => sum + phase.tasks.length,
      0,
    );
    const completedTasks = Object.values(doc.progress ?? {}).filter(
      Boolean,
    ).length;
    return {
      id: doc._id!.toString(),
      kind: doc.kind,
      title: doc.title,
      subtitle: doc.subtitle,
      targetRole: doc.roadmap.targetRole,
      totalWeeks: doc.roadmap.totalWeeks,
      createdAt: doc.createdAt.toISOString(),
      progress: doc.progress ?? {},
      taskCount,
      completedTasks,
    };
  });
}

export async function countPlans(userId: string): Promise<number> {
  return (await plans()).countDocuments({ userId: new ObjectId(userId) });
}

export async function getPlan(
  userId: string,
  planId: string,
): Promise<SavedItem | null> {
  if (!ObjectId.isValid(planId)) return null;
  const doc = await (
    await plans()
  ).findOne({ _id: new ObjectId(planId), userId: new ObjectId(userId) });
  return doc ? toItem(doc) : null;
}

export async function saveProgress(
  userId: string,
  planId: string,
  progress: Record<string, boolean>,
): Promise<boolean> {
  if (!ObjectId.isValid(planId)) return false;
  const result = await (
    await plans()
  ).updateOne(
    { _id: new ObjectId(planId), userId: new ObjectId(userId) },
    { $set: { progress, updatedAt: new Date() } },
  );
  return result.matchedCount > 0;
}

export async function deletePlan(
  userId: string,
  planId: string,
): Promise<boolean> {
  if (!ObjectId.isValid(planId)) return false;
  const result = await (
    await plans()
  ).deleteOne({ _id: new ObjectId(planId), userId: new ObjectId(userId) });
  return result.deletedCount > 0;
}
