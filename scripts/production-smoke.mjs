const target = String(process.env.PRODUCTION_SMOKE_URL || "").trim().replace(/\/+$/, "");
const token = String(
  process.env.PRODUCTION_SMOKE_TOKEN ||
    process.env.SENTRY_TEST_TOKEN ||
    process.env.HEALTHCHECK_TOKEN ||
    ""
).trim();
const allowInsecure = process.env.PRODUCTION_SMOKE_ALLOW_INSECURE === "1";
const skipMonitoring = process.env.PRODUCTION_SMOKE_SKIP_MONITORING === "1";
const timeoutMs = Number(process.env.PRODUCTION_SMOKE_TIMEOUT_MS || 15_000);

const checks = [];

function record(ok, name, detail) {
  checks.push({ ok, name, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${detail}`);
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(`${target}${path}`, {
      ...options,
      headers: {
        "User-Agent": "pixora-production-smoke/1.0",
        ...options.headers,
      },
      redirect: options.redirect || "manual",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function expectStatus(name, path, expectedStatus, options = {}) {
  try {
    const response = await request(path, options);
    const ok = response.status === expectedStatus;
    record(ok, name, `HTTP ${response.status}; expected ${expectedStatus}`);
    return response;
  } catch (error) {
    record(false, name, error instanceof Error ? error.message : "request failed");
    return null;
  }
}

async function checkDashboardRedirect() {
  try {
    const response = await request("/dashboard");
    const location = response.headers.get("location") || "";
    const ok = response.status === 307 && location.startsWith("/login?next=");
    record(ok, "Protected dashboard redirect", `HTTP ${response.status}; location=${location || "missing"}`);
  } catch (error) {
    record(false, "Protected dashboard redirect", error instanceof Error ? error.message : "request failed");
  }
}

async function checkMonitoringProbe(name, path) {
  const response = await expectStatus(name, path, 200, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: target,
      "x-sentry-test-token": token,
    },
  });
  if (!response?.ok) return;

  try {
    const payload = await response.json();
    record(Boolean(payload?.ok), `${name} payload`, payload?.ok ? "ok=true" : JSON.stringify(payload));
  } catch {
    record(false, `${name} payload`, "response was not valid JSON");
  }
}

async function checkDatabase() {
  const response = await expectStatus("Authorized database readiness", "/api/monitoring/database-check", 200, {
    headers: {
      "x-sentry-test-token": token,
    },
  });
  if (!response?.ok) return;

  try {
    const payload = await response.json();
    const columnsOk = Array.isArray(payload?.checks) && payload.checks.every((check) => check.ok);
    record(Boolean(payload?.ok && columnsOk), "Database schema readiness", columnsOk ? "required columns present" : JSON.stringify(payload));
  } catch {
    record(false, "Database schema readiness", "response was not valid JSON");
  }
}

async function main() {
  console.log("[production-smoke] Pixora deployed-environment smoke test");

  if (!target) {
    throw new Error("Set PRODUCTION_SMOKE_URL to the deployed Pixora origin.");
  }

  let origin;
  try {
    origin = new URL(target);
  } catch {
    throw new Error("PRODUCTION_SMOKE_URL must be a valid URL.");
  }

  if (!allowInsecure && origin.protocol !== "https:") {
    throw new Error("PRODUCTION_SMOKE_URL must use HTTPS. Set PRODUCTION_SMOKE_ALLOW_INSECURE=1 only for local testing.");
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("PRODUCTION_SMOKE_TIMEOUT_MS must be a positive number.");
  }
  if (!token) {
    throw new Error("Set PRODUCTION_SMOKE_TOKEN, SENTRY_TEST_TOKEN, or HEALTHCHECK_TOKEN.");
  }

  await expectStatus("Homepage", "/", 200);
  await expectStatus("Login page", "/login", 200);
  await expectStatus("Signup page", "/signup", 200);
  await checkDashboardRedirect();
  await expectStatus("Protected auth API", "/api/auth/me", 401);
  await expectStatus("Protected galleries API", "/api/galleries", 401);
  await checkDatabase();

  if (skipMonitoring) {
    console.warn("SKIP Monitoring probes: PRODUCTION_SMOKE_SKIP_MONITORING=1");
  } else {
    await checkMonitoringProbe("Sentry smoke event", "/api/monitoring/sentry-test");
    await checkMonitoringProbe("PostHog smoke event", "/api/monitoring/posthog-test");
  }

  const failed = checks.filter((check) => !check.ok);
  console.log(`\n[production-smoke] ${checks.length - failed.length}/${checks.length} checks passed.`);
  if (failed.length > 0) {
    console.error("[production-smoke] Launch gate failed.");
    process.exitCode = 1;
    return;
  }

  console.log("[production-smoke] Automated launch gate passed.");
  if (skipMonitoring) {
    console.log("[production-smoke] Monitoring probes were skipped. Run without PRODUCTION_SMOKE_SKIP_MONITORING before launch.");
  } else {
    console.log("[production-smoke] Confirm the Sentry issue and PostHog event in their dashboards, then complete the manual checklist.");
  }
}

main().catch((error) => {
  console.error(`[production-smoke] ${error instanceof Error ? error.message : "Failed"}`);
  process.exitCode = 1;
});
