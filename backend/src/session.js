import crypto from "node:crypto";
import { prisma } from "./prisma.js";
import { HttpError, asyncHandler } from "./http.js";
import { loadBackendEnv } from "./env.js";

loadBackendEnv();

const sessions = new Map();
const sessionCookieName = process.env.SESSION_COOKIE_NAME || "physics_lab_session";
const ttlMs = Number(process.env.SESSION_TTL_HOURS || 12) * 60 * 60 * 1000;

function parseCookies(cookieHeader = "") {
  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const index = cookie.indexOf("=");
        if (index === -1) {
          return [cookie, ""];
        }

        return [decodeURIComponent(cookie.slice(0, index)), decodeURIComponent(cookie.slice(index + 1))];
      }),
  );
}

function pruneExpiredSessions() {
  const now = Date.now();

  for (const [token, session] of sessions.entries()) {
    if (session.expiresAt <= now) {
      sessions.delete(token);
    }
  }
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production",
    maxAge: ttlMs,
    path: "/",
  };
}

export function publicUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export function attachSession(req, _res, next) {
  pruneExpiredSessions();

  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[sessionCookieName];
  const session = token ? sessions.get(token) : null;

  if (session && session.expiresAt > Date.now()) {
    req.sessionToken = token;
    req.session = session;
  }

  next();
}

export function startSession(res, userId) {
  const token = crypto.randomBytes(32).toString("base64url");
  sessions.set(token, {
    userId,
    createdAt: Date.now(),
    expiresAt: Date.now() + ttlMs,
  });
  res.cookie(sessionCookieName, token, cookieOptions());
}

export function clearSession(req, res) {
  if (req.sessionToken) {
    sessions.delete(req.sessionToken);
  }

  res.clearCookie(sessionCookieName, { ...cookieOptions(), maxAge: undefined });
}

export const requireAuth = asyncHandler(async (req, _res, next) => {
  if (!req.session?.userId) {
    throw new HttpError(401, "Login required.");
  }

  const user = await prisma.user.findUnique({
    where: { id: req.session.userId },
  });

  if (!user) {
    throw new HttpError(401, "Login required.");
  }

  req.user = user;
  next();
});

