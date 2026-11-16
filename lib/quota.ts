import { ObjectId } from "mongodb";
import { users, type UserDoc } from "./db";

/** Free generations before the (currently dummy) upgrade is required. */
export const FREE_GENERATIONS = 3;

export type Quota = {
  used: number;
  limit: number;
  remaining: number;
  unlimited: boolean;
};

export function quotaFor(user: UserDoc): Quota {
  if (user.plan === "pro")
    return {
      used: user.usedGenerations,
      limit: FREE_GENERATIONS,
      remaining: 0,
      unlimited: true,
    };
  return {
    used: user.usedGenerations,
    limit: FREE_GENERATIONS,
    remaining: Math.max(0, FREE_GENERATIONS - user.usedGenerations),
    unlimited: false,
  };
}

export type Reservation = {
  allowed: boolean;
  /** true when a free generation slot was consumed (and must be released on failure). */
  reserved: boolean;
  user?: UserDoc;
};

/**
 * Claim a free generation before the model is called, so two tabs cannot both spend the
 * last slot. Failures release the slot again.
 */
export async function reserveGeneration(userId: string): Promise<Reservation> {
  if (!ObjectId.isValid(userId)) return { allowed: false, reserved: false };
  const collection = await users();
  const _id = new ObjectId(userId);

  const user = await collection.findOne({ _id });
  if (!user) return { allowed: false, reserved: false };
  if (user.plan === "pro") return { allowed: true, reserved: false, user };
  if (user.usedGenerations >= FREE_GENERATIONS)
    return { allowed: false, reserved: false, user };

  const updated = await collection.findOneAndUpdate(
    { _id, plan: "free", usedGenerations: { $lt: FREE_GENERATIONS } },
    { $inc: { usedGenerations: 1 } },
    { returnDocument: "after" },
  );

  if (!updated) return { allowed: false, reserved: false, user };
  return { allowed: true, reserved: true, user: updated };
}

export async function releaseGeneration(userId: string): Promise<void> {
  if (!ObjectId.isValid(userId)) return;
  await (
    await users()
  ).updateOne(
    { _id: new ObjectId(userId), plan: "free", usedGenerations: { $gt: 0 } },
    { $inc: { usedGenerations: -1 } },
  );
}
