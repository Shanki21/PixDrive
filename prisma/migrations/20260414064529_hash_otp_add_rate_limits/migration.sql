/*
  Warnings:

  - You are about to drop the column `code` on the `Otp` table. All the data in the column will be lost.
  - Added the required column `codeHash` to the `Otp` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Otp" DROP COLUMN "code",
ADD COLUMN     "codeHash" TEXT NOT NULL,
ADD COLUMN     "failedAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastFailedAt" TIMESTAMP(3),
ADD COLUMN     "lastRequestedAt" TIMESTAMP(3),
ADD COLUMN     "requestCount" INTEGER NOT NULL DEFAULT 0;
