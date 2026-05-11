-- Improve dashboard, gallery detail, public gallery, and client-action lookup performance.
CREATE INDEX IF NOT EXISTS "Gallery_userId_createdAt_idx" ON "Gallery"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Photo_galleryId_id_idx" ON "Photo"("galleryId", "id");
CREATE INDEX IF NOT EXISTS "ClientPhotoAction_galleryId_clientKey_action_idx" ON "ClientPhotoAction"("galleryId", "clientKey", "action");
CREATE INDEX IF NOT EXISTS "Review_galleryId_published_createdAt_idx" ON "Review"("galleryId", "published", "createdAt");
