import { PrismaClient } from "@prisma/client";

function normalizeDatabaseUrl() {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) return;

  try {
    const url = new URL(raw);
    if (!url.hostname.endsWith(".supabase.com")) return;

    if (!url.searchParams.has("sslmode")) {
      url.searchParams.set("sslmode", "require");
    }

    if (url.port === "6543" && !url.searchParams.has("pgbouncer")) {
      url.searchParams.set("pgbouncer", "true");
    }

    process.env.DATABASE_URL = url.toString();
  } catch {
    // Prisma will report malformed URLs during connection.
  }
}

normalizeDatabaseUrl();

// Keep a single PrismaClient across hot reloads to avoid exhausting connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ["warn", "error"] });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Optional: in a non-serverless long-running process you may want to force connect at startup.
if (process.env.PRISMA_FORCE_CONNECT === "true") {
  prisma
    .$connect()
    .then(() => {
      // connected
    })
    .catch((err) => {
      // don't crash the process here; surface via logs
      console.error("[prisma] initial connect failed", err);
    });
}

export default prisma;
