import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";
import multer from "multer";
import { prisma } from "../prisma.js";
import { HttpError, asyncHandler, normalizeText } from "../http.js";
import { requireAuth } from "../session.js";
import { serializeItem, serializePhoto } from "../serializers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, "..", "..");
const uploadRoot = path.join(backendRoot, "uploads", "reviews");

fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadRoot),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const base = path
      .basename(file.originalname, extension)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
    callback(null, `${Date.now()}-${base || "review-photo"}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    callback(null, file.mimetype.startsWith("image/"));
  },
});

export const photosRouter = Router();

photosRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const locationCode = normalizeText(req.query.locationCode || req.query.locationId);
    const photos = await prisma.photo.findMany({
      where: locationCode
        ? {
            itemPhotos: {
              some: {
                locationCode,
              },
            },
          }
        : {},
      include: {
        itemPhotos: {
          where: locationCode ? { locationCode } : {},
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
                  orderBy: [{ isPrimary: "desc" }, { locationCode: "asc" }, { createdAt: "desc" }],
                },
              },
            },
          },
        },
      },
      orderBy: { path: "asc" },
    });

    res.json({
      photos: photos.map((photo) => ({
        ...serializePhoto(photo),
        items: photo.itemPhotos.map((itemPhoto) => serializeItem(itemPhoto.item)),
      })),
    });
  }),
);

photosRouter.post(
  "/",
  requireAuth,
  upload.single("photo"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "Photo file is required." });
      return;
    }

    const relativePath = path.join("uploads", "reviews", req.file.filename).replace(/\\/g, "/");
    const locationCode = normalizeText(req.body.locationCode);
    const itemIds = Array.isArray(req.body.itemIds)
      ? req.body.itemIds
      : normalizeText(req.body.itemIds)
        ? String(req.body.itemIds).split(",")
        : [];
    const mode = normalizeText(req.body.mode) || "add";

    if (!["add", "primary"].includes(mode)) {
      throw new HttpError(400, "Photo mode must be add or primary.");
    }
    const photo = await prisma.$transaction(async (tx) => {
      const created = await tx.photo.create({
        data: {
          path: relativePath,
          publicPath: `/${relativePath}`,
          sourceFolder: "uploads/reviews",
          originalFilename: req.file.originalname,
          isUploaded: true,
          uploadedById: req.user.id,
          uploadedAt: new Date(),
        },
      });

      if (locationCode) {
        for (const itemId of itemIds.map((id) => id.trim()).filter(Boolean)) {
          if (mode === "primary") {
            await tx.itemPhoto.updateMany({
              where: {
                itemId,
                locationCode,
              },
              data: {
                isPrimary: false,
              },
            });
          }

          await tx.itemPhoto.upsert({
            where: {
              itemId_photoId_locationCode: {
                itemId,
                photoId: created.id,
                locationCode,
              },
            },
            update: {
              isPrimary: mode === "primary",
            },
            create: {
              itemId,
              photoId: created.id,
              locationCode,
              isPrimary: mode === "primary",
            },
          });

          await tx.inventoryChange.create({
            data: {
              itemId,
              locationCode,
              userId: req.user.id,
              changeType: mode === "primary" ? "item_primary_photo_set" : "item_photo_added",
              before: null,
              after: {
                ...serializePhoto(created),
                isPrimary: mode === "primary",
              },
            },
          });
        }
      }

      return created;
    });

    res.status(201).json({ photo: serializePhoto(photo) });
  }),
);






