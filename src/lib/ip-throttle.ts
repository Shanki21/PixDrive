type CounterEntry = {
  count: number;
  windowStartedAt: number;
};

declare global {
  var wfIpThrottleStore: Map<string, CounterEntry> | undefined;
}

const store = globalThis.wfIpThrottleStore ?? new Map<string, CounterEntry>();
if (!globalThis.wfIpThrottleStore) {
  globalThis.wfIpThrottleStore = store;
}

type ThrottleInput = {
  key: string;
  limit: number;
  windowMs: number;
};

type ThrottleResult = {
  ok: boolean;
  retryAfterSeconds: number;
};

type UpstashResultRow = {
  result?: unknown;
  error?: string;
};

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL?.trim() ?? "";
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ?? "";

function cleanup(now: number) {
  // Keep memory bounded for long-running sessions.
  for (const [key, value] of store.entries()) {
    if (now - value.windowStartedAt > 24 * 60 * 60 * 1000) {
      store.delete(key);
    }
  }
}

function checkLocalThrottle(input: ThrottleInput): ThrottleResult {
  const now = Date.now();
  cleanup(now);

  const existing = store.get(input.key);
  if (!existing || now - existing.windowStartedAt >= input.windowMs) {
    store.set(input.key, { count: 1, windowStartedAt: now });
    return { ok: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= input.limit) {
    const retryMs = input.windowMs - (now - existing.windowStartedAt);
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil(retryMs / 1000)),
    };
  }

  existing.count += 1;
  store.set(input.key, existing);
  return { ok: true, retryAfterSeconds: 0 };
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

async function runUpstashPipeline(commands: Array<Array<string | number>>) {
  if (!upstashUrl || !upstashToken) return null;
  const { default: fetchWithRetry } = await import("@/lib/fetchWithRetry");
  const response = await fetchWithRetry(`${upstashUrl}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${upstashToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
    cache: "no-store",
  }, { dedupeKey: `upstash:pipeline:${JSON.stringify(commands).slice(0,200)}` });

  if (!response.ok) {
    throw new Error(`Upstash request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as UpstashResultRow[];
  if (!Array.isArray(payload)) {
    throw new Error("Unexpected Upstash payload");
  }
  return payload;
}

async function checkDistributedThrottle(input: ThrottleInput): Promise<ThrottleResult | null> {
  if (!upstashUrl || !upstashToken) return null;

  const redisKey = `wf:throttle:${input.key}`;
  const result = await runUpstashPipeline([
    ["INCR", redisKey],
    ["PTTL", redisKey],
  ]);
  if (!result || result.length < 2) return null;

  const count = toNumber(result[0]?.result);
  let ttlMs = toNumber(result[1]?.result) ?? -1;
  if (count == null) return null;

  if (count === 1 || ttlMs < 0) {
    const expireResult = await runUpstashPipeline([
      ["PEXPIRE", redisKey, input.windowMs],
      ["PTTL", redisKey],
    ]);
    if (expireResult && expireResult.length >= 2) {
      ttlMs = toNumber(expireResult[1]?.result) ?? input.windowMs;
    } else {
      ttlMs = input.windowMs;
    }
  }

  if (count > input.limit) {
    const safeRetryMs = ttlMs > 0 ? ttlMs : input.windowMs;
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil(safeRetryMs / 1000)),
    };
  }

  return { ok: true, retryAfterSeconds: 0 };
}

export async function checkIpThrottle(input: ThrottleInput): Promise<ThrottleResult> {
  try {
    const distributed = await checkDistributedThrottle(input);
    if (distributed) return distributed;
  } catch (error) {
    console.error("[ip-throttle] distributed throttle failed, using local fallback", error);
  }
  return checkLocalThrottle(input);
}

