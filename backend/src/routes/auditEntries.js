import { Router } from "express";
import { normalizeAuditEntryData, auditEntryInclude } from "../auditEntryHelpers.js";
import { prisma } from "../prisma.js";
import { HttpError, asyncHandler } from "../http.js";
import { requireAuth } from "../session.js";
import { serializeAuditEntry } from "../serializers.js";

export const auditEntriesRouter = Router();

auditEntriesRouter.use(requireAuth);

auditEntriesRouter.patch(
  "/:entryId",
  asyncHandler(async (req, res) => {
    const existing = await prisma.auditEntry.findUnique({
      where: { id: req.params.entryId },
      include: {
        session: true,
      },
    });

    if (!existing) {
      throw new HttpError(404, "Audit entry not found.");
    }

    if (existing.session.status === "approved") {
      throw new HttpError(409, "Approved audit sessions cannot be changed.");
    }

    const updated = await prisma.auditEntry.update({
      where: { id: existing.id },
      data: normalizeAuditEntryData(req.body, { partial: true }),
      include: auditEntryInclude,
    });

    res.json({ entry: serializeAuditEntry(updated) });
  }),
);
