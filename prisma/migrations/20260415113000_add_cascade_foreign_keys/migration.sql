-- Enforce DB-level cascades for gallery-owned records and user-owned profile.
-- This complements API-level delete transactions and protects against orphan rows.

ALTER TABLE "Gallery" DROP CONSTRAINT IF EXISTS "Gallery_userId_fkey";
ALTER TABLE "Gallery"
  ADD CONSTRAINT "Gallery_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Gallery" DROP CONSTRAINT IF EXISTS "Gallery_coverPhotoId_fkey";
ALTER TABLE "Gallery"
  ADD CONSTRAINT "Gallery_coverPhotoId_fkey"
  FOREIGN KEY ("coverPhotoId") REFERENCES "Photo"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Photo" DROP CONSTRAINT IF EXISTS "Photo_galleryId_fkey";
ALTER TABLE "Photo"
  ADD CONSTRAINT "Photo_galleryId_fkey"
  FOREIGN KEY ("galleryId") REFERENCES "Gallery"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientPhotoAction" DROP CONSTRAINT IF EXISTS "ClientPhotoAction_galleryId_fkey";
ALTER TABLE "ClientPhotoAction"
  ADD CONSTRAINT "ClientPhotoAction_galleryId_fkey"
  FOREIGN KEY ("galleryId") REFERENCES "Gallery"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientPhotoAction" DROP CONSTRAINT IF EXISTS "ClientPhotoAction_photoId_fkey";
ALTER TABLE "ClientPhotoAction"
  ADD CONSTRAINT "ClientPhotoAction_photoId_fkey"
  FOREIGN KEY ("photoId") REFERENCES "Photo"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GalleryVisit" DROP CONSTRAINT IF EXISTS "GalleryVisit_galleryId_fkey";
ALTER TABLE "GalleryVisit"
  ADD CONSTRAINT "GalleryVisit_galleryId_fkey"
  FOREIGN KEY ("galleryId") REFERENCES "Gallery"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Review" DROP CONSTRAINT IF EXISTS "Review_galleryId_fkey";
ALTER TABLE "Review"
  ADD CONSTRAINT "Review_galleryId_fkey"
  FOREIGN KEY ("galleryId") REFERENCES "Gallery"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientProfile" DROP CONSTRAINT IF EXISTS "ClientProfile_galleryId_fkey";
ALTER TABLE "ClientProfile"
  ADD CONSTRAINT "ClientProfile_galleryId_fkey"
  FOREIGN KEY ("galleryId") REFERENCES "Gallery"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserProfile" DROP CONSTRAINT IF EXISTS "UserProfile_userId_fkey";
ALTER TABLE "UserProfile"
  ADD CONSTRAINT "UserProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
