import { Router } from "express";
import { prisma } from "../prisma.js";
import { HttpError, asyncHandler, normalizeText, optionalDecimal, requireBodyFields, slugify } from "../http.js";
import { requireAuth } from "../session.js";
import { serializeItem, serializePhoto } from "../serializers.js";

export const itemsRouter = Router();

const itemInclude = {
  inventoryCounts: {
    include: {
      location: true,
    },
    orderBy: {
      locationCode: "asc",
    },
  },
  itemPhotos: {
    include: {
      photo: true,
      location: true,
    },
    orderBy: [{ isPrimary: "desc" }, { locationCode: "asc" }, { createdAt: "desc" }],
  },
};

function buildItemWhere(query) {
  const where = {};

  for (const field of ["category", "source", "section", "status"]) {
    if (query[field]) {
      where[field] = String(query[field]);
    }
  }

  if (query.locationCode) {
    where.inventoryCounts = {
      some: {
        locationCode: String(query.locationCode),
      },
    };
  }

  if (query.q) {
    const q = String(query.q).trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { section: { contains: q, mode: "insensitive" } },
      { source: { contains: q, mode: "insensitive" } },
      { reference: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { utility: { contains: q, mode: "insensitive" } },
      { searchText: { contains: q, mode: "insensitive" } },
    ];
  }

  return where;
}

function itemDataFromBody(body) {
  return {
    category: normalizeText(body.category),
    source: normalizeText(body.source),
    section: normalizeText(body.section),
    name: normalizeText(body.name),
    reference: normalizeText(body.reference),
    description: normalizeText(body.description),
    utility: normalizeText(body.utility),
    status: normalizeText(body.status) || "active",
    searchText: normalizeText(body.searchText),
  };
}

function countDataFromBody(count) {
  return {
    locationCode: normalizeText(count.locationCode),
    quantityText: normalizeText(count.quantityText),
    quantityValue: optionalDecimal(count.quantityValue),
    unit: normalizeText(count.unit),
    confidence: normalizeText(count.confidence) || "teacher_edit",
  };
}

async function upsertCounts(tx, itemId, counts = []) {
  for (const count of counts) {
    const data = countDataFromBody(count);

    if (!data.locationCode) {
      throw new HttpError(400, "Each count requires a locationCode.");
    }

    await tx.inventoryCount.upsert({
      where: {
        itemId_locationCode: {
          itemId,
          locationCode: data.locationCode,
        },
      },
      update: {
        quantityText: data.quantityText,
        quantityValue: data.quantityValue,
        unit: data.unit,
        confidence: data.confidence,
      },
      create: {
        itemId,
        ...data,
      },
    });
  }
}

itemsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await prisma.item.findMany({
      where: buildItemWhere(req.query),
      include: itemInclude,
      orderBy: [{ source: "asc" }, { section: "asc" }, { name: "asc" }],
      take: Math.min(Number(req.query.limit) || 500, 1000),
    });

    res.json({
      total: items.length,
      items: items.map(serializeItem),
    });
  }),
);

itemsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const item = await prisma.item.findUnique({
      where: { id: req.params.id },
      include: itemInclude,
    });

    if (!item) {
      throw new HttpError(404, "Item not found.");
    }

    res.json({ item: serializeItem(item) });
  }),
);

itemsRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    requireBodyFields(req.body, ["name", "category", "source", "section"]);

    const baseData = itemDataFromBody(req.body);
    const id = normalizeText(req.body.id) || slugify(baseData.name);

    if (!id) {
      throw new HttpError(400, "Unable to derive an item ID.");
    }

    const created = await prisma.$transaction(async (tx) => {
      const item = await tx.item.create({
        data: {
          id,
          ...baseData,
        },
      });

      await upsertCounts(tx, item.id, req.body.counts || []);
      await tx.inventoryChange.create({
        data: {
          itemId: item.id,
          userId: req.user.id,
          changeType: "item_created",
          before: null,
          after: baseData,
        },
      });

      return tx.item.findUnique({
        where: { id: item.id },
        include: itemInclude,
      });
    });

    res.status(201).json({ item: serializeItem(created) });
  }),
);

itemsRouter.patch(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const existing = await prisma.item.findUnique({
      where: { id: req.params.id },
      include: itemInclude,
    });

    if (!existing) {
      throw new HttpError(404, "Item not found.");
    }

    const incoming = itemDataFromBody({ ...existing, ...req.body });
    const updated = await prisma.$transaction(async (tx) => {
      await tx.item.update({
        where: { id: existing.id },
        data: incoming,
      });

      if (Array.isArray(req.body.counts)) {
        await upsertCounts(tx, existing.id, req.body.counts);
      }

      await tx.inventoryChange.create({
        data: {
          itemId: existing.id,
          userId: req.user.id,
          changeType: "item_updated",
          before: serializeItem(existing),
          after: {
            ...incoming,
            counts: req.body.counts || undefined,
          },
        },
      });

      return tx.item.findUnique({
        where: { id: existing.id },
        include: itemInclude,
      });
    });

    res.json({ item: serializeItem(updated) });
  }),
);
itemsRouter.post(
  "/:id/photos/:photoId/primary",
  requireAuth,
  asyncHandler(async (req, res) => {
    const locationCode = normalizeText(req.body.locationCode || req.query.locationCode);

    if (!locationCode) {
      throw new HttpError(400, "locationCode is required.");
    }

    const existingLink = await prisma.itemPhoto.findUnique({
      where: {
        itemId_photoId_locationCode: {
          itemId: req.params.id,
          photoId: req.params.photoId,
          locationCode,
        },
      },
      include: {
        photo: true,
      },
    });

    if (!existingLink) {
      throw new HttpError(404, "Photo link not found for this item and location.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.itemPhoto.updateMany({
        where: {
          itemId: req.params.id,
          locationCode,
        },
        data: {
          isPrimary: false,
        },
      });

      await tx.itemPhoto.update({
        where: {
          itemId_photoId_locationCode: {
            itemId: req.params.id,
            photoId: req.params.photoId,
            locationCode,
          },
        },
        data: {
          isPrimary: true,
        },
      });

      await tx.inventoryChange.create({
        data: {
          itemId: req.params.id,
          locationCode,
          userId: req.user.id,
          changeType: "item_primary_photo_set",
          before: {
            photo: serializePhoto(existingLink.photo),
            wasPrimary: existingLink.isPrimary,
          },
          after: {
            photo: serializePhoto(existingLink.photo),
            isPrimary: true,
          },
        },
      });
    });

    const item = await prisma.item.findUnique({
      where: { id: req.params.id },
      include: itemInclude,
    });

    res.json({ item: serializeItem(item) });
  }),
);

itemsRouter.delete(
  "/:id/photos/:photoId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const locationCode = normalizeText(req.query.locationCode || req.body?.locationCode);

    if (!locationCode) {
      throw new HttpError(400, "locationCode is required.");
    }

    const existingLink = await prisma.itemPhoto.findUnique({
      where: {
        itemId_photoId_locationCode: {
          itemId: req.params.id,
          photoId: req.params.photoId,
          locationCode,
        },
      },
      include: {
        photo: true,
      },
    });

    if (!existingLink) {
      throw new HttpError(404, "Photo link not found for this item and location.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.itemPhoto.delete({
        where: {
          itemId_photoId_locationCode: {
            itemId: req.params.id,
            photoId: req.params.photoId,
            locationCode,
          },
        },
      });

      await tx.inventoryChange.create({
        data: {
          itemId: req.params.id,
          locationCode,
          userId: req.user.id,
          changeType: "item_photo_unlinked",
          before: {
            photo: serializePhoto(existingLink.photo),
            isPrimary: existingLink.isPrimary,
          },
          after: null,
        },
      });
    });

    res.json({ ok: true });
  }),
);

