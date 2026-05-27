import fs from "node:fs";
import path from "node:path";

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
  const trimmed = value.trim();
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
    process.env[name] = stripQuotes(value ?? "");
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

function readEnv(name) {
  return (process.env[name] ?? "").trim();
}

function isConfigured(value) {
  return !PLACEHOLDERS.has(value.toLowerCase());
}

function validateRequired(name, errors) {
  const value = readEnv(name);
  if (!isConfigured(value)) {
    errors.push(`${name} is missing or still set to a placeholder.`);
  }
}

function validateNextAuthUrl(errors, warnings) {
  const nextAuthUrl = readEnv("NEXTAUTH_URL");
  if (isConfigured(nextAuthUrl)) return;

  const vercelUrl = readEnv("VERCEL_URL");
  if (isConfigured(vercelUrl)) {
    warnings.push("NEXTAUTH_URL is not set; using VERCEL_URL as the hosted deployment URL fallback.");
    return;
  }

  errors.push("NEXTAUTH_URL is missing or still set to a placeholder.");
}

function validateOneOf(names, errors) {
  const hasAny = names.some((name) => isConfigured(readEnv(name)));
  if (!hasAny) {
    errors.push(`${names.join(" or ")} must be configured with a strong secret.`);
  }
}

function validateEmailProvider(errors) {
  const resendApiKey = readEnv("RESEND_API_KEY");
  const resendFromEmail = readEnv("RESEND_FROM_EMAIL");
  const smtpHost = readEnv("SMTP_HOST");
  const smtpPort = readEnv("SMTP_PORT");
  const smtpUser = readEnv("SMTP_USER");
  const smtpPass = readEnv("SMTP_PASS");
  const smtpFromEmail = readEnv("SMTP_FROM_EMAIL");

  const hasResend = isConfigured(resendApiKey) && isConfigured(resendFromEmail);
  const hasSmtp =
    isConfigured(smtpHost) &&
    isConfigured(smtpPort) &&
    isConfigured(smtpUser) &&
    isConfigured(smtpPass) &&
    isConfigured(smtpFromEmail);

  if (!hasResend && !hasSmtp) {
    errors.push(
      "Email provider is not configured. Set RESEND_API_KEY + RESEND_FROM_EMAIL, or configure full SMTP credentials."
    );
  }
}

function validateRateLimitProvider(warnings) {
  const upstashUrl = readEnv("UPSTASH_REDIS_REST_URL");
  const upstashToken = readEnv("UPSTASH_REDIS_REST_TOKEN");
  const hasUpstash = isConfigured(upstashUrl) && isConfigured(upstashToken);
  if (!hasUpstash) {
    warnings.push(
      "Distributed rate limiting is not configured. Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN for multi-instance production."
    );
  }
}

function validateStripeBilling(errors) {
  const stripeKey = readEnv("STRIPE_SECRET_KEY");
  const hasStripe = isConfigured(stripeKey);
  if (!hasStripe) {
    return;
  }

  const required = [
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRICE_STARTER_MONTHLY",
    "STRIPE_PRICE_STARTER_YEARLY",
    "STRIPE_PRICE_STUDIO_MONTHLY",
    "STRIPE_PRICE_STUDIO_YEARLY",
    "STRIPE_PRICE_ELITE_MONTHLY",
    "STRIPE_PRICE_ELITE_YEARLY",
    "STRIPE_PRICE_SCALE_MONTHLY",
    "STRIPE_PRICE_SCALE_YEARLY",
  ];

  for (const name of required) {
    validateRequired(name, errors);
  }
}

function validateRazorpayBilling(errors) {
  const enabled = readEnv("PAYMENTS_ENABLED") === "1" || readEnv("RAZORPAY_ENABLED") === "1";
  if (!enabled) return;

  const required = [
    "RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET",
    "RAZORPAY_WEBHOOK_SECRET",
    "RAZORPAY_PLAN_STARTER_MONTHLY",
    "RAZORPAY_PLAN_STARTER_YEARLY",
    "RAZORPAY_PLAN_STUDIO_MONTHLY",
    "RAZORPAY_PLAN_STUDIO_YEARLY",
    "RAZORPAY_PLAN_ELITE_MONTHLY",
    "RAZORPAY_PLAN_ELITE_YEARLY",
    "RAZORPAY_PLAN_SCALE_MONTHLY",
    "RAZORPAY_PLAN_SCALE_YEARLY",
  ];

  for (const name of required) {
    validateRequired(name, errors);
  }
}

function validateObservability(errors, warnings) {
  const required = readEnv("MONITORING_REQUIRED") === "1" || readEnv("SENTRY_REQUIRED") === "1";
  if (required) {
    validateRequired("SENTRY_DSN", errors);
  } else if (!isConfigured(readEnv("SENTRY_DSN"))) {
    warnings.push("Sentry is not configured. Set SENTRY_DSN before public launch if you want error monitoring.");
  }
  if (!isConfigured(readEnv("NEXT_PUBLIC_POSTHOG_KEY"))) {
    warnings.push("PostHog is not configured. Set NEXT_PUBLIC_POSTHOG_KEY for paid-beta product analytics.");
  }
}

function main() {
  const strict =
    process.env.CHECK_ENV_STRICT === "1" ||
    process.env.NODE_ENV === "production";
  const requireDirectUrl =
    process.env.CHECK_ENV_REQUIRE_DIRECT_URL === "1" ||
    process.env.CHECK_ENV_MODE === "migrate";

  if (!strict) {
    console.log("[env:check] Skipping strict checks (development mode).");
    return;
  }

  const errors = [];
  const warnings = [];
  validateRequired("DATABASE_URL", errors);
  if (requireDirectUrl) {
    validateRequired("DIRECT_URL", errors);
  } else if (!isConfigured(readEnv("DIRECT_URL"))) {
    warnings.push(
      "DIRECT_URL is not configured. Runtime builds can continue, but Prisma migrate/deploy commands require DIRECT_URL."
    );
  }
  validateRequired("NEXT_PUBLIC_CLIENT_GALLERY_BASE_URL", errors);
  validateNextAuthUrl(errors, warnings);
  validateOneOf(["NEXTAUTH_SECRET", "AUTH_SECRET"], errors);
  validateEmailProvider(errors);
  validateRateLimitProvider(warnings);
  validateObservability(errors, warnings);
  validateRazorpayBilling(errors);
  validateStripeBilling(errors);

  if (errors.length === 0) {
    console.log("[env:check] Environment validation passed.");
    for (const warning of warnings) {
      console.warn(`[env:check] Warning: ${warning}`);
    }
    return;
  }

  console.error("[env:check] Environment validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
}

main();
