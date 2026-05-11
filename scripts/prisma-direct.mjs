import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function parseEnvValue(value) {
  const trimmed = value.trim();
  const quote = trimmed[0];
  if ((quote === `"` || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadEnvFile(path) {
  if (!existsSync(path)) return;

  const raw = readFileSync(path, "utf8");
  for (const line of raw.split(/\r?\n/g)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;

    const [, key, value] = match;
    if (!process.env[key]) {
      process.env[key] = parseEnvValue(value);
    }
  }
}

loadEnvFile(resolve(process.cwd(), ".env"));
loadEnvFile(resolve(process.cwd(), ".env.local"));

function withRequiredSupabaseSsl(value) {
  try {
    const url = new URL(value);
    if (url.hostname.endsWith(".supabase.com") && !url.searchParams.has("sslmode")) {
      if (url.pathname.endsWith("sslmode=require")) {
        url.pathname = url.pathname.replace(/sslmode=require$/g, "").replace(/\/?$/g, "");
      }
      url.searchParams.set("sslmode", "require");
      return url.toString();
    }
  } catch {
    // Let Prisma report malformed connection strings with its normal error.
  }

  return value;
}

const directUrl = withRequiredSupabaseSsl((process.env.DIRECT_URL ?? "").trim());

if (!directUrl) {
  console.error("[prisma-direct] DIRECT_URL is required for Supabase Prisma CLI commands.");
  console.error("[prisma-direct] Add your Supabase direct or session-pooler connection string to .env.");
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("[prisma-direct] Missing Prisma command. Example: node scripts/prisma-direct.mjs migrate deploy");
  process.exit(1);
}

const prismaCli = resolve(process.cwd(), "node_modules", "prisma", "build", "index.js");
if (!existsSync(prismaCli)) {
  console.error("[prisma-direct] Prisma CLI was not found. Run npm install first.");
  process.exit(1);
}

const result = spawnSync(process.execPath, [prismaCli, ...args], {
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: directUrl,
  },
});

if (result.error) {
  console.error("[prisma-direct] Failed to start Prisma CLI:", result.error.message);
}

process.exit(result.status ?? 1);
