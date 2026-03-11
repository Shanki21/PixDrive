/*
  Warnings:

  - A unique constraint covering the columns `[coverPhotoId]` on the table `Gallery` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Gallery" ADD COLUMN     "coverPhotoId" TEXT;

-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "downloadCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "favoriteCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ClientPhotoAction" (
    "id" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "clientKey" TEXT NOT NULL,
    "clientName" TEXT,
    "clientEmail" TEXT,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientPhotoAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientPhotoAction_galleryId_idx" ON "ClientPhotoAction"("galleryId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientPhotoAction_photoId_clientKey_action_key" ON "ClientPhotoAction"("photoId", "clientKey", "action");

-- CreateIndex
CREATE UNIQUE INDEX "Gallery_coverPhotoId_key" ON "Gallery"("coverPhotoId");

-- AddForeignKey
ALTER TABLE "Gallery" ADD CONSTRAINT "Gallery_coverPhotoId_fkey" FOREIGN KEY ("coverPhotoId") REFERENCES "Photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPhotoAction" ADD CONSTRAINT "ClientPhotoAction_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "Gallery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPhotoAction" ADD CONSTRAINT "ClientPhotoAction_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
