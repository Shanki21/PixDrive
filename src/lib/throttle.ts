type ThrottleInput = {
  key: string;
  limit: number;
  windowMs: number;
};

type ThrottleResult = {
  ok: boolean;
  retryAfterSeconds: number;
};

declare global {
  var wfThrottleStore:
    | Map<string, { count: number; expiresAt: number }>
    | undefined;
}

const store =
  globalThis.wfThrottleStore ??
  new Map<string, { count: number; expiresAt: number }>();

if (!globalThis.wfThrottleStore) {
  globalThis.wfThrottleStore = store;
}

let nextCleanupAt = 0;

function getUpstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/g, ""), token };
}

async function runUpstashCommand<T>(command: unknown[]): Promise<T | null> {
  const config = getUpstashConfig();
  if (!config) return null;

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Upstash rate limit command failed with ${response.status}`);
  }

  const payload = (await response.json()) as { result?: T; error?: string };
  if (payload.error) {
    throw new Error(payload.error);
  }

  return payload.result ?? null;
}

async function checkDistributedThrottle({
  key,
  limit,
  windowMs,
}: ThrottleInput): Promise<ThrottleResult | null> {
  if (!getUpstashConfig()) return null;

  const redisKey = `pixora:${key}`;
  const count = await runUpstashCommand<number>(["INCR", redisKey]);
  if (count === null) return null;

  if (count === 1) {
    await runUpstashCommand(["PEXPIRE", redisKey, windowMs]);
  }

  if (count <= limit) {
    return {
      ok: true,
      retryAfterSeconds: 0,
    };
  }

  const ttlMs = await runUpstashCommand<number>(["PTTL", redisKey]);
  const retryAfterSeconds = ttlMs && ttlMs > 0 ? Math.ceil(ttlMs / 1000) : Math.ceil(windowMs / 1000);

  return {
    ok: false,
    retryAfterSeconds,
  };
}

function cleanupMemoryStore(now: number) {
  if (now < nextCleanupAt) return;
  nextCleanupAt = now + 60_000;

  for (const [key, value] of store.entries()) {
    if (now >= value.expiresAt) {
      store.delete(key);
    }
  }
}

export async function checkIpThrottle({
  key,
  limit,
  windowMs,
}: ThrottleInput): Promise<ThrottleResult> {
  try {
    const distributedResult = await checkDistributedThrottle({ key, limit, windowMs });
    if (distributedResult) {
      return distributedResult;
    }
  } catch (error) {
    console.error("[throttle] distributed limiter unavailable; using memory fallback", error);
  }

  const now = Date.now();
  cleanupMemoryStore(now);

  const existing = store.get(key);

  if (!existing || now >= existing.expiresAt) {
    store.set(key, {
      count: 1,
      expiresAt: now + windowMs,
    });

    return {
      ok: true,
      retryAfterSeconds: 0,
    };
  }

  existing.count += 1;

  store.set(key, existing);

  if (existing.count > limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.ceil(
        (existing.expiresAt - now) / 1000
      ),
    };
  }

  return {
    ok: true,
    retryAfterSeconds: 0,
  };
}
