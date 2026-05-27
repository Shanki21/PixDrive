CREATE TABLE "CustomDomain" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "verificationToken" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "verifiedAt" TIMESTAMP(3),
  "lastCheckedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CustomDomain_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomDomain_domain_key" ON "CustomDomain"("domain");
CREATE INDEX "CustomDomain_userId_idx" ON "CustomDomain"("userId");
CREATE INDEX "CustomDomain_status_idx" ON "CustomDomain"("status");

ALTER TABLE "CustomDomain"
  ADD CONSTRAINT "CustomDomain_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
