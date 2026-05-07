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

export async function checkIpThrottle({
  key,
  limit,
  windowMs,
}: ThrottleInput): Promise<ThrottleResult> {
  const now = Date.now();

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