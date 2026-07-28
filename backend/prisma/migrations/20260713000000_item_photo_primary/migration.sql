ALTER TABLE "item_photos"
ADD COLUMN "is_primary" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "item_photos_item_id_location_code_is_primary_idx"
ON "item_photos"("item_id", "location_code", "is_primary");
