import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma.js";
import { HttpError, asyncHandler, requireBodyFields } from "../http.js";
import { clearSession, publicUser, startSession } from "../session.js";

export const authRouter = Router();

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    requireBodyFields(req.body, ["email", "password"]);

    const user = await prisma.user.findUnique({
      where: { email: String(req.body.email).trim().toLowerCase() },
    });

    if (!user || !(await bcrypt.compare(String(req.body.password), user.passwordHash))) {
      throw new HttpError(401, "Invalid email or password.");
    }

    startSession(res, user.id);
    res.json({ user: publicUser(user) });
  }),
);

authRouter.post("/logout", (req, res) => {
  clearSession(req, res);
  res.json({ ok: true });
});

authRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    if (!req.session?.userId) {
      res.json({ user: null });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
    });

    res.json({ user: publicUser(user) });
  }),
);
