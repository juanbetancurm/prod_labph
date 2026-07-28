import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(__dirname, "..", "..");
const inventoryKeys = ["physics", "electronics"];

export function loadInventoryData(root = repoRoot) {
  const dataFile = path.join(root, "js", "data.js");
  const source = fs.readFileSync(dataFile, "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, { filename: dataFile });

  if (!sandbox.window.inventoryData) {
    throw new Error("js/data.js did not define window.inventoryData");
  }

  return sandbox.window.inventoryData;
}

export function getAllStaticItems(inventoryData) {
  return inventoryKeys.flatMap((category) => {
    return (inventoryData[category]?.items || []).map((item) => ({
      ...item,
      category,
    }));
  });
}

export function normalizeAssetPath(assetPath) {
  return String(assetPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
}

export function getSourceFolder(assetPath) {
  const parts = normalizeAssetPath(assetPath).split("/");
  return parts.length > 2 ? parts.slice(0, -1).join("/") : null;
}

export function getOriginalFilename(assetPath) {
  return path.basename(normalizeAssetPath(assetPath));
}

export function parseQuantityText(quantityText) {
  const text = quantityText == null ? "" : String(quantityText).trim();

  if (!text) {
    return {
      quantityText: null,
      quantityValue: null,
      unit: null,
      confidence: "missing_text",
    };
  }

  const exactMatch = text.match(/^(\d+(?:\.\d+)?)\s*(pcs|pc|pieces|piece|units|unit)?$/i);

  if (!exactMatch) {
    return {
      quantityText: text,
      quantityValue: null,
      unit: null,
      confidence: "imported_text",
    };
  }

  return {
    quantityText: text,
    quantityValue: Number(exactMatch[1]),
    unit: exactMatch[2] ? exactMatch[2].toLowerCase() : null,
    confidence: "exact_text",
  };
}

function getLocationsForImage(item, imagePath) {
  const normalizedPath = normalizeAssetPath(imagePath);
  const locations = new Set();

  for (const locationSource of item.locationSources || []) {
    const sourceImages = (locationSource.images || []).map(normalizeAssetPath);
    if (sourceImages.includes(normalizedPath)) {
      locations.add(locationSource.location);
    }
  }

  if (!locations.size) {
    for (const location of item.locations || []) {
      locations.add(location);
    }
  }

  return Array.from(locations);
}

export function buildSeedPayload(inventoryData, root = repoRoot) {
  const items = getAllStaticItems(inventoryData);
  const locationCodes = new Set(Object.keys(inventoryData.locations || {}));
  const photosByPath = new Map();
  const itemPhotos = new Map();
  const counts = new Map();

  for (const item of items) {
    const quantity = parseQuantityText(item.quantity);

    for (const locationCode of item.locations || []) {
      counts.set(`${item.id}:${locationCode}`, {
        itemId: item.id,
        locationCode,
        ...quantity,
      });
    }

    for (const image of item.images || []) {
      const normalizedPath = normalizeAssetPath(image);
      photosByPath.set(normalizedPath, {
        path: normalizedPath,
        publicPath: `/${normalizedPath}`,
        sourceFolder: getSourceFolder(normalizedPath),
        originalFilename: getOriginalFilename(normalizedPath),
        isUploaded: false,
      });

      for (const locationCode of getLocationsForImage(item, normalizedPath)) {
        itemPhotos.set(`${item.id}:${normalizedPath}:${locationCode}`, {
          itemId: item.id,
          path: normalizedPath,
          locationCode,
        });
      }
    }
  }

  const locations = Object.entries(inventoryData.locations || {}).map(([code, location]) => ({
    code,
    label: location.label || code,
    type: code === "Outside" ? "outside" : code === "BlueShelf" ? "shelf" : "shelf",
    itemCountSnapshot: location.itemCount ?? null,
    mapMeta: null,
  }));

  return {
    locations,
    items: items.map((item) => ({
      id: item.id,
      category: item.category,
      source: item.source,
      section: item.section,
      name: item.name,
      reference: item.reference || null,
      description: item.description || null,
      utility: item.utility || null,
      status: "active",
      searchText: item.searchText || null,
    })),
    counts: Array.from(counts.values()),
    photos: Array.from(photosByPath.values()),
    itemPhotos: Array.from(itemPhotos.values()),
    summary: {
      expectedTotal: inventoryData.itemCounts?.total ?? null,
      expectedPhysics: inventoryData.itemCounts?.physics ?? null,
      expectedElectronics: inventoryData.itemCounts?.electronics ?? null,
      actualTotal: items.length,
      actualPhysics: items.filter((item) => item.category === "physics").length,
      actualElectronics: items.filter((item) => item.category === "electronics").length,
      root,
      locationCodes,
    },
  };
}

export function validateSeedPayload(payload) {
  const errors = [];
  const ids = payload.items.map((item) => item.id);
  const uniqueIds = new Set(ids);
  const locationCodes = new Set(payload.locations.map((location) => location.code));

  if (payload.summary.expectedTotal != null && payload.summary.expectedTotal !== payload.summary.actualTotal) {
    errors.push(`Expected ${payload.summary.expectedTotal} total items, found ${payload.summary.actualTotal}.`);
  }

  if (payload.summary.expectedPhysics != null && payload.summary.expectedPhysics !== payload.summary.actualPhysics) {
    errors.push(`Expected ${payload.summary.expectedPhysics} physics items, found ${payload.summary.actualPhysics}.`);
  }

  if (payload.summary.expectedElectronics != null && payload.summary.expectedElectronics !== payload.summary.actualElectronics) {
    errors.push(`Expected ${payload.summary.expectedElectronics} electronics items, found ${payload.summary.actualElectronics}.`);
  }

  if (uniqueIds.size !== ids.length) {
    errors.push(`Expected unique item IDs, found ${ids.length - uniqueIds.size} duplicate IDs.`);
  }

  for (const count of payload.counts) {
    if (!uniqueIds.has(count.itemId)) {
      errors.push(`Inventory count references missing item ${count.itemId}.`);
    }

    if (!locationCodes.has(count.locationCode)) {
      errors.push(`Inventory count for ${count.itemId} references missing location ${count.locationCode}.`);
    }
  }

  for (const itemPhoto of payload.itemPhotos) {
    if (!uniqueIds.has(itemPhoto.itemId)) {
      errors.push(`Item-photo link references missing item ${itemPhoto.itemId}.`);
    }

    if (!locationCodes.has(itemPhoto.locationCode)) {
      errors.push(`Item-photo link for ${itemPhoto.itemId} references missing location ${itemPhoto.locationCode}.`);
    }
  }

  for (const photo of payload.photos) {
    if (!fs.existsSync(path.join(payload.summary.root, photo.path))) {
      errors.push(`Referenced image does not exist: ${photo.path}`);
    }
  }

  return errors;
}
