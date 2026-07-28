import { Router } from "express";
import { auditEntryInclude, normalizeAuditEntryData } from "../auditEntryHelpers.js";
import { prisma } from "../prisma.js";
import { HttpError, asyncHandler, normalizeText, optionalDecimal, requireBodyFields } from "../http.js";
import { requireAuth } from "../session.js";
import { serializeAuditEntry, serializeAuditSession } from "../serializers.js";

export const auditSessionsRouter = Router();

const allowedEntryStatuses = new Set(["found", "missing", "extra", "uncertain", "count_corrected"]);

const sessionInclude = {
  location: true,
  teacher: {
    select: {
      id: true,
      email: true,
      name: true,
    },
  },
  entries: {
    include: {
      item: {
        include: {
          inventoryCounts: {
            include: {
              location: true,
            },
          },
          itemPhotos: {
            include: {
              photo: true,
              location: true,
            },
          },
        },
      },
      photo: true,
    },
    orderBy: [{ createdAt: "asc" }],
  },
  inventoryChanges: {
    include: {
      item: true,
      location: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  },
};

function normalizeEntryData(body) {
  const status = normalizeText(body.status);

  if (status && !allowedEntryStatuses.has(status)) {
    throw new HttpError(400, `Unsupported audit entry status: ${status}`);
  }

  return {
    status,
    observedQuantityText: normalizeText(body.observedQuantityText),
    observedQuantityValue: optionalDecimal(body.observedQuantityValue),
    proposedQuantityText: normalizeText(body.proposedQuantityText),
    proposedQuantityValue: optionalDecimal(body.proposedQuantityValue),
    notes: normalizeText(body.notes),
    extraItemName: normalizeText(body.extraItemName),
    itemId: normalizeText(body.itemId),
    photoId: normalizeText(body.photoId),
  };
}

function decimalJson(value) {
  return value == null ? null : Number(value);
}

function countJson(count) {
  if (!count) {
    return null;
  }

  return {
    quantityText: count.quantityText,
    quantityValue: decimalJson(count.quantityValue),
    unit: count.unit,
    confidence: count.confidence,
  };
}

function chooseApprovedCount(entry) {
  const explicitText = entry.proposedQuantityText || entry.observedQuantityText;
  const explicitValue =
    entry.proposedQuantityValue != null ? decimalJson(entry.proposedQuantityValue) : decimalJson(entry.observedQuantityValue);

  if (entry.status === "missing") {
    return {
      quantityText: explicitText || "0",
      quantityValue: explicitValue ?? 0,
      unit: null,
      confidence: "audit_approved",
    };
  }

  if (entry.status === "extra" && entry.itemId) {
    return {
      quantityText: explicitText || "1",
      quantityValue: explicitValue ?? 1,
      unit: null,
      confidence: "audit_approved",
    };
  }

  if (entry.status === "count_corrected" || explicitText || explicitValue != null) {
    return {
      quantityText: explicitText,
      quantityValue: explicitValue,
      unit: null,
      confidence: "audit_approved",
    };
  }

  return null;
}

function hasCountChanged(before, after) {
  const beforeJson = countJson(before);
  return JSON.stringify(beforeJson) !== JSON.stringify(after);
}

auditSessionsRouter.use(requireAuth);

auditSessionsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const where = {};

    if (req.query.status) {
      where.status = String(req.query.status);
    }

    if (req.query.locationCode) {
      where.locationCode = String(req.query.locationCode);
    }

    const sessions = await prisma.auditSession.findMany({
      where,
      include: {
        location: true,
        teacher: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        entries: true,
        inventoryChanges: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    res.json({ sessions: sessions.map(serializeAuditSession) });
  }),
);

auditSessionsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    requireBodyFields(req.body, ["locationCode"]);
    const locationCode = normalizeText(req.body.locationCode);

    const counts = await prisma.inventoryCount.findMany({
      where: { locationCode },
      include: {
        item: true,
      },
      orderBy: [{ item: { section: "asc" } }, { item: { name: "asc" } }],
    });

    const location = await prisma.location.findUnique({
      where: { code: locationCode },
    });

    if (!location) {
      throw new HttpError(404, "Location not found.");
    }

    const session = await prisma.auditSession.create({
      data: {
        locationCode,
        teacherId: req.user.id,
        notes: normalizeText(req.body.notes),
        entries: {
          create: counts.map((count) => ({
            itemId: count.itemId,
            expectedQuantityText: count.quantityText,
            expectedQuantityValue: count.quantityValue,
            status: "uncertain",
          })),
        },
      },
      include: sessionInclude,
    });

    res.status(201).json({ session: serializeAuditSession(session) });
  }),
);

auditSessionsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const session = await prisma.auditSession.findUnique({
      where: { id: req.params.id },
      include: sessionInclude,
    });

    if (!session) {
      throw new HttpError(404, "Audit session not found.");
    }

    res.json({ session: serializeAuditSession(session) });
  }),
);

auditSessionsRouter.post(
  "/:id/entries",
  asyncHandler(async (req, res) => {
    const session = await prisma.auditSession.findUnique({
      where: { id: req.params.id },
    });

    if (!session) {
      throw new HttpError(404, "Audit session not found.");
    }

    if (session.status === "approved") {
      throw new HttpError(409, "Approved audit sessions cannot be changed.");
    }

    const data = normalizeAuditEntryData(req.body);
    const entry = await prisma.auditEntry.create({
      data: {
        sessionId: session.id,
        itemId: data.itemId,
        photoId: data.photoId,
        status: data.status || "extra",
        observedQuantityText: data.observedQuantityText,
        observedQuantityValue: data.observedQuantityValue,
        proposedQuantityText: data.proposedQuantityText,
        proposedQuantityValue: data.proposedQuantityValue,
        notes: data.notes,
        extraItemName: data.extraItemName,
      },
      include: {
        item: {
          include: {
            inventoryCounts: {
              include: {
                location: true,
              },
            },
            itemPhotos: {
              include: {
                photo: true,
                location: true,
              },
            },
          },
        },
        photo: true,
      },
    });

    res.status(201).json({ entry: serializeAuditEntry(entry) });
  }),
);

auditSessionsRouter.patch(
  "/entries/:entryId",
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

    const updateData = normalizeAuditEntryData(req.body, { partial: true });
    const updated = await prisma.auditEntry.update({
      where: { id: existing.id },
      data: updateData,
      include: {
        item: {
          include: {
            inventoryCounts: {
              include: {
                location: true,
              },
            },
            itemPhotos: {
              include: {
                photo: true,
                location: true,
              },
            },
          },
        },
        photo: true,
      },
    });

    res.json({ entry: serializeAuditEntry(updated) });
  }),
);

auditSessionsRouter.post(
  "/:id/submit",
  asyncHandler(async (req, res) => {
    const session = await prisma.auditSession.update({
      where: { id: req.params.id },
      data: {
        status: "submitted",
        submittedAt: new Date(),
      },
      include: sessionInclude,
    });

    res.json({ session: serializeAuditSession(session) });
  }),
);

auditSessionsRouter.post(
  "/:id/approve",
  asyncHandler(async (req, res) => {
    const session = await prisma.$transaction(async (tx) => {
      const current = await tx.auditSession.findUnique({
        where: { id: req.params.id },
        include: {
          entries: true,
        },
      });

      if (!current) {
        throw new HttpError(404, "Audit session not found.");
      }

      if (current.status !== "submitted") {
        throw new HttpError(409, "Only submitted audit sessions can be approved.");
      }

      for (const entry of current.entries) {
        const approvedCount = chooseApprovedCount(entry);

        if (approvedCount && entry.itemId) {
          const before = await tx.inventoryCount.findUnique({
            where: {
              itemId_locationCode: {
                itemId: entry.itemId,
                locationCode: current.locationCode,
              },
            },
          });

          if (hasCountChanged(before, approvedCount)) {
            await tx.inventoryCount.upsert({
              where: {
                itemId_locationCode: {
                  itemId: entry.itemId,
                  locationCode: current.locationCode,
                },
              },
              update: approvedCount,
              create: {
                itemId: entry.itemId,
                locationCode: current.locationCode,
                ...approvedCount,
              },
            });

            await tx.inventoryChange.create({
              data: {
                sessionId: current.id,
                itemId: entry.itemId,
                locationCode: current.locationCode,
                userId: req.user.id,
                changeType: "count_updated",
                before: countJson(before),
                after: approvedCount,
              },
            });
          }
        }

        if (entry.status === "extra" && !entry.itemId) {
          await tx.inventoryChange.create({
            data: {
              sessionId: current.id,
              locationCode: current.locationCode,
              userId: req.user.id,
              changeType: "extra_observed",
              before: null,
              after: {
                extraItemName: entry.extraItemName,
                observedQuantityText: entry.observedQuantityText,
                observedQuantityValue: decimalJson(entry.observedQuantityValue),
                photoId: entry.photoId,
                notes: entry.notes,
              },
            },
          });
        }
      }

      await tx.auditSession.update({
        where: { id: current.id },
        data: {
          status: "approved",
          approvedAt: new Date(),
          teacherId: req.user.id,
        },
      });

      return tx.auditSession.findUnique({
        where: { id: current.id },
        include: sessionInclude,
      });
    });

    res.json({ session: serializeAuditSession(session) });
  }),
);


