-- Persist event settings and gallery meta in the database
ALTER TABLE "Gallery"
ADD COLUMN "settings" JSONB,
ADD COLUMN "meta" JSONB;

