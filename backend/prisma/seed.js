import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { buildSeedPayload, loadInventoryData, validateSeedPayload } from "../src/importStaticData.js";
import { loadBackendEnv } from "../src/env.js";

loadBackendEnv();

const prisma = new PrismaClient();

function getTeacherSeed() {
  return {
    email: process.env.SEED_TEACHER_EMAIL || "teacher@example.com",
    password: process.env.SEED_TEACHER_PASSWORD || "change-me-before-use",
    name: process.env.SEED_TEACHER_NAME || "Physics Lab Teacher",
  };
}

async function upsertTeacher() {
  const teacher = getTeacherSeed();
  const passwordHash = await bcrypt.hash(teacher.password, 12);

  return prisma.user.upsert({
    where: { email: teacher.email },
    update: {
      name: teacher.name,
      passwordHash,
      role: "teacher",
    },
    create: {
      email: teacher.email,
      name: teacher.name,
      passwordHash,
      role: "teacher",
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });
}

async function main() {
  const inventoryData = loadInventoryData();
  const payload = buildSeedPayload(inventoryData);
  const errors = validateSeedPayload(payload);

  if (errors.length) {
    throw new Error(`Static inventory validation failed:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  }

  const teacher = await upsertTeacher();

  for (const location of payload.locations) {
    await prisma.location.upsert({
      where: { code: location.code },
      update: {
        label: location.label,
        type: location.type,
        mapMeta: location.mapMeta,
        itemCountSnapshot: location.itemCountSnapshot,
      },
      create: location,
    });
  }

  for (const photo of payload.photos) {
    await prisma.photo.upsert({
      where: { path: photo.path },
      update: {
        publicPath: photo.publicPath,
        sourceFolder: photo.sourceFolder,
        originalFilename: photo.originalFilename,
        isUploaded: photo.isUploaded,
      },
      create: photo,
    });
  }

  for (const item of payload.items) {
    await prisma.item.upsert({
      where: { id: item.id },
      update: {
        category: item.category,
        source: item.source,
        section: item.section,
        name: item.name,
        reference: item.reference,
        description: item.description,
        utility: item.utility,
        status: item.status,
        searchText: item.searchText,
      },
      create: item,
    });
  }

  for (const count of payload.counts) {
    await prisma.inventoryCount.upsert({
      where: {
        itemId_locationCode: {
          itemId: count.itemId,
          locationCode: count.locationCode,
        },
      },
      update: {
        quantityText: count.quantityText,
        quantityValue: count.quantityValue,
        unit: count.unit,
        confidence: count.confidence,
      },
      create: count,
    });
  }

  const photosByPath = new Map(
    (await prisma.photo.findMany({
      where: { path: { in: payload.photos.map((photo) => photo.path) } },
      select: { id: true, path: true },
    })).map((photo) => [photo.path, photo.id]),
  );

  for (const itemPhoto of payload.itemPhotos) {
    const photoId = photosByPath.get(itemPhoto.path);

    if (!photoId) {
      throw new Error(`Missing seeded photo row for ${itemPhoto.path}`);
    }

    await prisma.itemPhoto.upsert({
      where: {
        itemId_photoId_locationCode: {
          itemId: itemPhoto.itemId,
          photoId,
          locationCode: itemPhoto.locationCode,
        },
      },
      update: {},
      create: {
        itemId: itemPhoto.itemId,
        photoId,
        locationCode: itemPhoto.locationCode,
      },
    });
  }

  console.log(
    JSON.stringify(
      {
        teacher,
        imported: {
          items: payload.items.length,
          locations: payload.locations.length,
          photos: payload.photos.length,
          itemPhotoLinks: payload.itemPhotos.length,
          counts: payload.counts.length,
        },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

