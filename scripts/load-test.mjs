import { performance } from "node:perf_hooks";

const target = process.env.LOAD_TEST_URL || "http://localhost:3000";
const durationSeconds = Number(process.env.LOAD_TEST_DURATION_SECONDS || 30);
const concurrency = Number(process.env.LOAD_TEST_CONCURRENCY || 20);
const timeoutMs = Number(process.env.LOAD_TEST_TIMEOUT_MS || 10_000);

const paths = [
  { path: "/", weight: 2 },
  { path: "/login", weight: 1 },
  { path: "/signup", weight: 1 },
  { path: "/api/auth/me", weight: 2 },
  { path: "/api/billing/status", weight: 1 },
];

const expandedPaths = paths.flatMap((item) => Array.from({ length: item.weight }, () => item.path));
const deadline = performance.now() + durationSeconds * 1000;
const samples = [];

let ok = 0;
let failed = 0;
let index = 0;

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const i = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[i];
}

function nextPath() {
  const value = expandedPaths[index % expandedPaths.length];
  index += 1;
  return value;
}

async function requestOnce(workerId) {
  const path = nextPath();
  const url = new URL(path, target).toString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = performance.now();

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": `pixora-load-test/${workerId}`,
      },
      redirect: "manual",
    });
    const elapsed = performance.now() - startedAt;
    samples.push(elapsed);
    if (response.status < 500) {
      ok += 1;
    } else {
      failed += 1;
    }
  } catch {
    failed += 1;
    samples.push(performance.now() - startedAt);
  } finally {
    clearTimeout(timeout);
  }
}

async function worker(workerId) {
  while (performance.now() < deadline) {
    await requestOnce(workerId);
  }
}

async function main() {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error("LOAD_TEST_DURATION_SECONDS must be a positive number.");
  }
  if (!Number.isFinite(concurrency) || concurrency <= 0) {
    throw new Error("LOAD_TEST_CONCURRENCY must be a positive number.");
  }

  console.log(`[load-test] Target: ${target}`);
  console.log(`[load-test] Duration: ${durationSeconds}s, concurrency: ${concurrency}`);
  console.log(`[load-test] Paths: ${paths.map((item) => `${item.path}x${item.weight}`).join(", ")}`);

  const startedAt = performance.now();
  await Promise.all(Array.from({ length: concurrency }, (_, i) => worker(i + 1)));
  const elapsedSeconds = (performance.now() - startedAt) / 1000;
  const total = ok + failed;

  console.log("\n[load-test] Results");
  console.log(`Requests: ${total}`);
  console.log(`OK: ${ok}`);
  console.log(`Failed: ${failed}`);
  console.log(`RPS: ${(total / elapsedSeconds).toFixed(2)}`);
  console.log(`p50: ${percentile(samples, 50).toFixed(0)}ms`);
  console.log(`p95: ${percentile(samples, 95).toFixed(0)}ms`);
  console.log(`p99: ${percentile(samples, 99).toFixed(0)}ms`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[load-test] ${error instanceof Error ? error.message : "Failed"}`);
  process.exitCode = 1;
});
