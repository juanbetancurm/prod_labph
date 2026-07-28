import { Router } from "express";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../http.js";
import { serializeInventoryChange } from "../serializers.js";

export const dashboardRouter = Router();

dashboardRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [itemCount, locationCount, unresolvedReviewCount, recentChanges] = await Promise.all([
      prisma.item.count({ where: { status: "active" } }),
      prisma.location.count(),
      prisma.auditSession.count({ where: { status: { in: ["draft", "submitted"] } } }),
      prisma.inventoryChange.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          item: true,
          location: true,
        },
      }),
    ]);

    res.json({
      itemCount,
      locationCount,
      unresolvedReviewCount,
      recentChanges: recentChanges.map(serializeInventoryChange),
    });
  }),
);
