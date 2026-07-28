import { Router } from "express";
import { prisma } from "../prisma.js";
import { HttpError, asyncHandler } from "../http.js";
import { serializeItem, serializeLocation } from "../serializers.js";

export const locationsRouter = Router();

locationsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const locations = await prisma.location.findMany({
      orderBy: { code: "asc" },
      include: {
        _count: {
          select: {
            inventoryCounts: true,
          },
        },
      },
    });

    res.json({ locations: locations.map(serializeLocation) });
  }),
);

locationsRouter.get(
  "/:code/inventory",
  asyncHandler(async (req, res) => {
    const location = await prisma.location.findUnique({
      where: { code: req.params.code },
      include: {
        _count: {
          select: {
            inventoryCounts: true,
          },
        },
        inventoryCounts: {
          include: {
            item: {
              include: {
                inventoryCounts: {
                  include: {
                    location: true,
                  },
                },
                itemPhotos: {
                  where: {
                    locationCode: req.params.code,
                  },
                  include: {
                    photo: true,
                    location: true,
                  },
                  orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
                },
              },
            },
          },
          orderBy: [{ item: { section: "asc" } }, { item: { name: "asc" } }],
        },
      },
    });

    if (!location) {
      throw new HttpError(404, "Location not found.");
    }

    res.json({
      location: serializeLocation(location),
      items: location.inventoryCounts.map((count) => serializeItem(count.item)),
    });
  }),
);



