import fs from "node:fs";
import path from "node:path";

const REQUIRED = [
  "DATABASE_URL",
  "NEXT_PUBLIC_CLIENT_GALLERY_BASE_URL",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
];

const RECOMMENDED = [
  "SENTRY_DSN",
  "NEXT_PUBLIC_SENTRY_DSN",
  "SENTRY_TEST_TOKEN",
  "NEXT_PUBLIC_POSTHOG_KEY",
  "NEXT_PUBLIC_POSTHOG_HOST",
  "CUSTOM_DOMAIN_CNAME_TARGET",
];

const PLACEHOLDERS = new Set([
  "",
  "replace-me",
  "replace_with_me",
  "change-me",
  "changeme",
  "your-key-here",
  "undefined",
  "null",
]);

function stripQuotes(value) {
  const trimmed = String(value ?? "").trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadEnvFile(fileName) {
  const filePath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, name, value] = match;
    if (!name || name.startsWith("#")) continue;
    process.env[name] = stripQuotes(value);
  }
}

function isConfigured(name) {
  const value = stripQuotes(process.env[name] ?? "");
  return !PLACEHOLDERS.has(value.toLowerCase());
}

async function checkUpstash() {
  if (!isConfigured("UPSTASH_REDIS_REST_URL") || !isConfigured("UPSTASH_REDIS_REST_TOKEN")) {
    return { ok: false, message: "Upstash env is missing." };
  }

  const url = process.env.UPSTASH_REDIS_REST_URL.replace(/\/+$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const probeKey = `pixora:readiness:${Date.now()}`;

  try {
    const response = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["SET", probeKey, "ok", "EX", 30],
        ["GET", probeKey],
        ["DEL", probeKey],
      ]),
      cache: "no-store",
    });

    if (!response.ok) {
      return { ok: false, message: `Upstash returned HTTP ${response.status}.` };
    }

    const payload = await response.json();
    const value = payload?.[1]?.result;
    return value === "ok"
      ? { ok: true, message: "Upstash read/write probe passed." }
      : { ok: false, message: "Upstash responded, but probe value was unexpected." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Upstash probe failed.",
    };
  }
}

function printList(label, names, missing) {
  console.log(`\n${label}`);
  for (const name of names) {
    const ok = !missing.includes(name);
    console.log(`${ok ? "PASS" : "MISS"} ${name}`);
  }
}

async function main() {
  loadEnvFile(".env");
  loadEnvFile(".env.local");

  const missingRequired = REQUIRED.filter((name) => !isConfigured(name));
  const missingRecommended = RECOMMENDED.filter((name) => !isConfigured(name));

  console.log("[readiness] Pixora production readiness check");
  printList("Required services", REQUIRED, missingRequired);
  printList("Recommended services", RECOMMENDED, missingRecommended);

  const upstash = await checkUpstash();
  console.log(`\n${upstash.ok ? "PASS" : "FAIL"} Redis probe: ${upstash.message}`);

  if (missingRecommended.length > 0) {
    console.warn(
      `\n[readiness] Recommended before paid beta: ${missingRecommended.join(", ")}`
    );
  }

  if (missingRequired.length > 0 || !upstash.ok) {
    console.error("\n[readiness] Production readiness failed.");
    process.exitCode = 1;
    return;
  }

  console.log("\n[readiness] Production readiness passed.");
}

main();
