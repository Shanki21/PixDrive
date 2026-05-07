import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const apply =
  process.argv.includes("--apply") ||
  process.env.PIN_BACKFILL_APPLY === "1";

function asTrimmedString(value) {
  if (value == null) return null;
  const next = String(value).trim();
  return next.length > 0 ? next : null;
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : null;
}

async function main() {
  const galleries = await prisma.gallery.findMany({
    select: { id: true, settings: true },
  });

  let candidates = 0;
  let changed = 0;
  const changedIds = [];

  for (const gallery of galleries) {
    const settings = asRecord(gallery.settings);
    if (!settings) continue;

    const fullPin = asTrimmedString(settings.fullAccessPin);
    const guestPin = asTrimmedString(settings.guestPin);
    const fullHash = asTrimmedString(settings.fullAccessPinHash);
    const guestHash = asTrimmedString(settings.guestPinHash);
    if (!fullPin && !guestPin) continue;

    candidates += 1;
    const nextSettings = { ...settings };
    let didChange = false;

    if (fullPin && !fullHash) {
      nextSettings.fullAccessPinHash = await bcrypt.hash(fullPin, 10);
      didChange = true;
    }
    if (guestPin && !guestHash) {
      nextSettings.guestPinHash = await bcrypt.hash(guestPin, 10);
      didChange = true;
    }

    if (nextSettings.fullAccessPin !== null || nextSettings.guestPin !== null) {
      nextSettings.fullAccessPin = null;
      nextSettings.guestPin = null;
      didChange = true;
    }

    if (!didChange) continue;
    changed += 1;
    changedIds.push(gallery.id);

    if (apply) {
      await prisma.gallery.update({
        where: { id: gallery.id },
        data: { settings: nextSettings },
      });
    }
  }

  console.log(`[pins:backfill] Galleries scanned: ${galleries.length}`);
  console.log(`[pins:backfill] Candidate galleries with plaintext PIN: ${candidates}`);
  console.log(`[pins:backfill] Galleries needing update: ${changed}`);

  if (changed > 0) {
    console.log(`[pins:backfill] IDs: ${changedIds.join(", ")}`);
  }

  if (!apply && changed > 0) {
    console.log("[pins:backfill] Dry run only. Re-run with --apply to persist changes.");
  }
}

main()
  .catch((error) => {
    console.error("[pins:backfill] Failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
