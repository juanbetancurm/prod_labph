import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { loadBackendEnv } from "./env.js";
import { HttpError } from "./http.js";

import { attachSession } from "./session.js";
import { authRouter } from "./routes/auth.js";
import { auditEntriesRouter } from "./routes/auditEntries.js";
import { auditSessionsRouter } from "./routes/auditSessions.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { itemsRouter } from "./routes/items.js";
import { locationsRouter } from "./routes/locations.js";
import { photosRouter } from "./routes/photos.js";

loadBackendEnv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const backendRoot = path.resolve(__dirname, "..");
const frontendDist = path.join(repoRoot, "frontend", "dist");

function allowedOrigins() {
  return (process.env.FRONTEND_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function createApp() {
  const app = express();
  const origins = allowedOrigins();

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || origins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new HttpError(403, "Origin not allowed."));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(attachSession);

  app.use("/Laboratory", express.static(path.join(repoRoot, "Laboratory")));
  app.use("/uploads", express.static(path.join(backendRoot, "uploads")));
  app.get("/lab_distribution1.png", (_req, res) => {
    res.sendFile(path.join(repoRoot, "lab_distribution1.png"));
  });
  app.get("/lab_distribution_map.png", (_req, res) => {
    res.sendFile(path.join(repoRoot, "lab_distribution_map.png"));
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });
  app.use("/api/auth", authRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/items", itemsRouter);
  app.use("/api/locations", locationsRouter);
  app.use("/api/photos", photosRouter);
  app.use("/api/audit-entries", auditEntriesRouter);
  app.use("/api/audit-sessions", auditSessionsRouter);

  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get("/{*splat}", (_req, res) => {
      res.sendFile(path.join(frontendDist, "index.html"));
    });
  }

  app.use((req, res) => {
    res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
  });

  app.use((error, _req, res, _next) => {
    if (error instanceof HttpError) {
      res.status(error.status).json({
        error: error.message,
        details: error.details,
      });
      return;
    }

    if (error.name === "MulterError") {
      res.status(400).json({ error: error.message });
      return;
    }

    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  });

  return app;
}










