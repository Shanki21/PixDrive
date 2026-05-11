ALTER TABLE "Gallery"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Gallery_userId_deletedAt_idx" ON "Gallery"("userId", "deletedAt");

CREATE TABLE IF NOT EXISTS "FaceMatch" (
  "id" TEXT NOT NULL,
  "galleryId" TEXT NOT NULL,
  "photoId" TEXT NOT NULL,
  "clientKey" TEXT NOT NULL,
  "confidence" DOUBLE PRECISION,
  "provider" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FaceMatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FaceMatch_galleryId_photoId_clientKey_key" ON "FaceMatch"("galleryId", "photoId", "clientKey");
CREATE INDEX IF NOT EXISTS "FaceMatch_galleryId_clientKey_idx" ON "FaceMatch"("galleryId", "clientKey");
CREATE INDEX IF NOT EXISTS "FaceMatch_photoId_idx" ON "FaceMatch"("photoId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FaceMatch_galleryId_fkey'
  ) THEN
    ALTER TABLE "FaceMatch"
      ADD CONSTRAINT "FaceMatch_galleryId_fkey"
      FOREIGN KEY ("galleryId") REFERENCES "Gallery"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FaceMatch_photoId_fkey'
  ) THEN
    ALTER TABLE "FaceMatch"
      ADD CONSTRAINT "FaceMatch_photoId_fkey"
      FOREIGN KEY ("photoId") REFERENCES "Photo"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
