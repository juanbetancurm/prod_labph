import { PrismaClient } from "@prisma/client";
import { loadBackendEnv } from "./env.js";

loadBackendEnv();

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__physicsLabPrisma ||
  new PrismaClient({
    log: process.env.PRISMA_QUERY_LOG === "true" ? ["query", "error", "warn"] : ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__physicsLabPrisma = prisma;
}

