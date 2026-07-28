import { buildSeedPayload, loadInventoryData, validateSeedPayload } from "../src/importStaticData.js";

const inventoryData = loadInventoryData();
const payload = buildSeedPayload(inventoryData);
const errors = validateSeedPayload(payload);

if (errors.length) {
  console.error("Static inventory validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      items: payload.items.length,
      physics: payload.summary.actualPhysics,
      electronics: payload.summary.actualElectronics,
      locations: payload.locations.length,
      photos: payload.photos.length,
      itemPhotoLinks: payload.itemPhotos.length,
      counts: payload.counts.length,
    },
    null,
    2,
  ),
);
