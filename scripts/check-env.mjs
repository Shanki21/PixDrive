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
  validateOneOf(["NEXTAUTH_SECRET", "AUTH_SECRET"], errors);
  validateEmailProvider(errors);
  validateRateLimitProvider(warnings);

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
