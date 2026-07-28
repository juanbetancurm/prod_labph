CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "password_hash" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'teacher',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "locations" (
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "type" TEXT,
  "map_meta" JSONB,
  "item_count_snapshot" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "locations_pkey" PRIMARY KEY ("code")
);

CREATE TABLE "items" (
  "id" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "section" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "reference" TEXT,
  "description" TEXT,
  "utility" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "search_text" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_counts" (
  "id" TEXT NOT NULL,
  "item_id" TEXT NOT NULL,
  "location_code" TEXT NOT NULL,
  "quantity_text" TEXT,
  "quantity_value" DECIMAL(12,3),
  "unit" TEXT,
  "confidence" TEXT NOT NULL DEFAULT 'imported_text',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_counts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "photos" (
  "id" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "public_path" TEXT NOT NULL,
  "source_folder" TEXT,
  "original_filename" TEXT,
  "is_uploaded" BOOLEAN NOT NULL DEFAULT false,
  "uploaded_by_id" TEXT,
  "uploaded_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "item_photos" (
  "id" TEXT NOT NULL,
  "item_id" TEXT NOT NULL,
  "photo_id" TEXT NOT NULL,
  "location_code" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "item_photos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_sessions" (
  "id" TEXT NOT NULL,
  "location_code" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "teacher_id" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submitted_at" TIMESTAMP(3),
  "approved_at" TIMESTAMP(3),
  CONSTRAINT "audit_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_entries" (
  "id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "item_id" TEXT,
  "photo_id" TEXT,
  "expected_quantity_text" TEXT,
  "expected_quantity_value" DECIMAL(12,3),
  "observed_quantity_text" TEXT,
  "observed_quantity_value" DECIMAL(12,3),
  "proposed_quantity_text" TEXT,
  "proposed_quantity_value" DECIMAL(12,3),
  "status" TEXT NOT NULL DEFAULT 'uncertain',
  "notes" TEXT,
  "extra_item_name" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_changes" (
  "id" TEXT NOT NULL,
  "session_id" TEXT,
  "item_id" TEXT,
  "location_code" TEXT,
  "user_id" TEXT,
  "change_type" TEXT NOT NULL,
  "before" JSONB,
  "after" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_changes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "items_category_idx" ON "items"("category");
CREATE INDEX "items_source_idx" ON "items"("source");
CREATE INDEX "items_section_idx" ON "items"("section");
CREATE INDEX "items_status_idx" ON "items"("status");
CREATE UNIQUE INDEX "inventory_counts_item_id_location_code_key" ON "inventory_counts"("item_id", "location_code");
CREATE INDEX "inventory_counts_location_code_idx" ON "inventory_counts"("location_code");
CREATE UNIQUE INDEX "photos_path_key" ON "photos"("path");
CREATE INDEX "photos_source_folder_idx" ON "photos"("source_folder");
CREATE UNIQUE INDEX "item_photos_item_id_photo_id_location_code_key" ON "item_photos"("item_id", "photo_id", "location_code");
CREATE INDEX "item_photos_photo_id_idx" ON "item_photos"("photo_id");
CREATE INDEX "item_photos_location_code_idx" ON "item_photos"("location_code");
CREATE INDEX "audit_sessions_location_code_idx" ON "audit_sessions"("location_code");
CREATE INDEX "audit_sessions_status_idx" ON "audit_sessions"("status");
CREATE INDEX "audit_entries_session_id_idx" ON "audit_entries"("session_id");
CREATE INDEX "audit_entries_item_id_idx" ON "audit_entries"("item_id");
CREATE INDEX "audit_entries_photo_id_idx" ON "audit_entries"("photo_id");
CREATE INDEX "inventory_changes_session_id_idx" ON "inventory_changes"("session_id");
CREATE INDEX "inventory_changes_item_id_idx" ON "inventory_changes"("item_id");
CREATE INDEX "inventory_changes_location_code_idx" ON "inventory_changes"("location_code");
CREATE INDEX "inventory_changes_created_at_idx" ON "inventory_changes"("created_at");

ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_location_code_fkey" FOREIGN KEY ("location_code") REFERENCES "locations"("code") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "photos" ADD CONSTRAINT "photos_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "item_photos" ADD CONSTRAINT "item_photos_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "item_photos" ADD CONSTRAINT "item_photos_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "item_photos" ADD CONSTRAINT "item_photos_location_code_fkey" FOREIGN KEY ("location_code") REFERENCES "locations"("code") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_sessions" ADD CONSTRAINT "audit_sessions_location_code_fkey" FOREIGN KEY ("location_code") REFERENCES "locations"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_sessions" ADD CONSTRAINT "audit_sessions_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_entries" ADD CONSTRAINT "audit_entries_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "audit_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_entries" ADD CONSTRAINT "audit_entries_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_entries" ADD CONSTRAINT "audit_entries_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "photos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_changes" ADD CONSTRAINT "inventory_changes_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "audit_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_changes" ADD CONSTRAINT "inventory_changes_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_changes" ADD CONSTRAINT "inventory_changes_location_code_fkey" FOREIGN KEY ("location_code") REFERENCES "locations"("code") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_changes" ADD CONSTRAINT "inventory_changes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
