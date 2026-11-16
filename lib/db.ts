import { MongoClient, ObjectId, type Collection, type Db } from "mongodb";
import type { Mode, RoadmapInput, TransitionInput } from "./types";
import type { Roadmap, TransitionResult } from "./schemas";

/**
 * MongoDB is optional at build time (so `next build` works without secrets) but required for
 * accounts, the library and the free-try counter. Atlas' free M0 tier is enough.
 */

const uri = process.env.MONGODB_URI?.trim() || "";
const dbName = process.env.MONGODB_DB?.trim() || "pathforge";

export type PlanDoc = {
  _id?: ObjectId;
  userId: ObjectId;
  kind: Mode;
  title: string;
  subtitle: string;
  input: RoadmapInput | TransitionInput;
  roadmap: Roadmap;
  transition?: TransitionResult;
  progress: Record<string, boolean>;
  createdAt: Date;
  updatedAt: Date;
};

export type UserDoc = {
  _id?: ObjectId;
  googleId: string;
  email: string;
  name: string;
  picture: string;
  plan: "free" | "pro";
  usedGenerations: number;
  createdAt: Date;
};

type MongoState = {
  client: MongoClient;
  ready: Promise<MongoClient>;
  indexes?: Promise<void>;
};

const globalForMongo = globalThis as typeof globalThis & {
  __pathforgeMongo?: MongoState;
};

export function mongoConfigured(): boolean {
  return /^mongodb(\+srv)?:\/\//i.test(uri);
}

function state(): MongoState {
  if (!mongoConfigured()) {
    throw new Error(
      "MONGODB_URI is missing. Add a MongoDB Atlas connection string to .env.local.",
    );
  }
  if (!globalForMongo.__pathforgeMongo) {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8_000,
      // Serverless routes open and drop connections often; a short idle timeout keeps Atlas happy.
      maxIdleTimeMS: 60_000,
    });
    globalForMongo.__pathforgeMongo = { client, ready: client.connect() };
  }
  return globalForMongo.__pathforgeMongo;
}

export async function getDb(): Promise<Db> {
  const { ready } = state();
  const client = await ready;
  const db = client.db(dbName);
  return db;
}

async function indexes(): Promise<void> {
  const current = state();
  if (!current.indexes) {
    current.indexes = (async () => {
      const db = await getDb();
      await Promise.all([
        db
          .collection<UserDoc>("users")
          .createIndex({ googleId: 1 }, { unique: true }),
        db.collection<UserDoc>("users").createIndex({ email: 1 }),
        db
          .collection<PlanDoc>("plans")
          .createIndex({ userId: 1, createdAt: -1 }),
      ]);
    })().catch((error) => {
      // Do not cache a failed index build; retry on the next request.
      current.indexes = undefined;
      console.error("[db] index creation failed", error);
    });
  }
  return current.indexes;
}

export async function users(): Promise<Collection<UserDoc>> {
  await indexes();
  return (await getDb()).collection<UserDoc>("users");
}

export async function plans(): Promise<Collection<PlanDoc>> {
  await indexes();
  return (await getDb()).collection<PlanDoc>("plans");
}

export { ObjectId };
