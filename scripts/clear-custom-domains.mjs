#!/usr/bin/env node
import fs from "fs";
import path from "path";
import process from "process";

function loadDatabaseUrlFromEnvFiles() {
  const candidates = [".env.local", ".env", ".env.development"];
  for (const name of candidates) {
    const p = path.join(process.cwd(), name);
    if (!fs.existsSync(p)) continue;
    try {
      const raw = fs.readFileSync(p, "utf8");
      const m = raw.match(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/m);
      if (m && m[1]) {
        let val = m[1].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        return val;
      }
    } catch {
      // ignore
    }
  }
  return null;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    const found = loadDatabaseUrlFromEnvFiles();
    if (found) process.env.DATABASE_URL = found;
  }

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not found in environment or .env.* files. Aborting.");
    process.exit(1);
  }

  let PrismaClient;
  try {
    ({ PrismaClient } = await import("@prisma/client"));
  } catch (err) {
    console.error("Failed to import @prisma/client. Make sure dependencies are installed and Prisma client is generated.");
    console.error(err?.message ?? err);
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    console.log("Fetching galleries...");
    const rows = await prisma.gallery.findMany({ select: { id: true, meta: true } });
    const toUpdate = [];
    for (const r of rows) {
      const meta = r.meta ?? null;
      if (meta && typeof meta === "object") {
        const hasDomain = Object.prototype.hasOwnProperty.call(meta, "customDomain") && !!meta.customDomain;
        const hasVerified = !!meta.customDomainVerified;
        if (hasDomain || hasVerified) {
          const nextMeta = { ...meta };
          delete nextMeta.customDomain;
          nextMeta.customDomainVerified = false;
          toUpdate.push({ id: r.id, nextMeta });
        }
      }
    }

    console.log(`Found ${toUpdate.length} galleries with customDomain/customDomainVerified.`);
    if (toUpdate.length === 0) return;

    for (const u of toUpdate) {
      console.log(`Updating gallery ${u.id}...`);
      await prisma.gallery.update({ where: { id: u.id }, data: { meta: u.nextMeta } });
    }

    console.log(`Updated ${toUpdate.length} galleries.`);
  } catch (err) {
    console.error("Error while updating galleries:", err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
