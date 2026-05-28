-- Backend production hardening: webhook replay protection and hot-path indexes.

CREATE TABLE "WebhookEvent" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebhookEvent_provider_eventId_key" ON "WebhookEvent"("provider", "eventId");
CREATE INDEX "WebhookEvent_provider_receivedAt_idx" ON "WebhookEvent"("provider", "receivedAt");

CREATE INDEX "ClientPhotoAction_galleryId_action_idx" ON "ClientPhotoAction"("galleryId", "action");
CREATE INDEX "ClientPhotoAction_galleryId_action_clientKey_idx" ON "ClientPhotoAction"("galleryId", "action", "clientKey");
