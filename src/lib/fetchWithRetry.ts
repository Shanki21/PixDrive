type RetryOpts = {
  maxAttempts?: number;
  initialDelayMs?: number;
  factor?: number;
  dedupeKey?: string;
  idempotencyKey?: string;
};

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

type InflightMap = Map<string, Promise<Response>>;
declare global {
  // global for storing short-lived in-flight request map between HMR reloads
  // Use `| undefined` instead of optional modifier to keep valid JS emit
  var __wf_client_inflight_map: InflightMap | undefined;
}

const inFlight: InflightMap =
  globalThis.__wf_client_inflight_map ?? (globalThis.__wf_client_inflight_map = new Map());

export async function fetchWithRetry(input: RequestInfo, init?: RequestInit, opts?: RetryOpts) {
  const maxAttempts = opts?.maxAttempts ?? 4;
  const initialDelayMs = opts?.initialDelayMs ?? 300;
  const factor = opts?.factor ?? 2;

  const headers = new Headers(init?.headers as HeadersInit | undefined);

  // generate or reuse idempotency key for server-side dedupe
  let idempotencyKey =
    opts?.idempotencyKey ??
    (headers.get("Idempotency-Key") || headers.get("X-Idempotency-Key") || undefined);
  if (!idempotencyKey) {
    try {
      const c = typeof crypto !== "undefined" ? (crypto as unknown as { randomUUID?: () => string }) : undefined;
      idempotencyKey = c?.randomUUID ? c.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    } catch {
      idempotencyKey = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
    headers.set("Idempotency-Key", idempotencyKey);
  }

  const dedupeKey = opts?.dedupeKey ?? `idem:${idempotencyKey}`;

  // If an identical request is in-flight, reuse its promise
  if (inFlight.has(dedupeKey)) {
    try {
      const shared = inFlight.get(dedupeKey)!;
      const resp = await shared;
      return resp.clone ? resp.clone() : resp;
    } catch {
      // fall through to new attempt on shared promise failure
    }
  }

  const attempt = async () => {
    let attemptCount = 0;
    let delay = initialDelayMs;
    while (true) {
      attemptCount += 1;
      try {
        const res = await fetch(input, { ...(init ?? {}), headers });
        if (res.ok) return res;

        // on 429, respect Retry-After header then retry (up to maxAttempts)
        if (res.status === 429 && attemptCount < maxAttempts) {
          const ra = res.headers.get("Retry-After");
          const raSec = ra ? Number(ra) || Math.ceil(delay / 1000) : Math.ceil(delay / 1000);
          await sleep(raSec * 1000 + Math.random() * 250);
          delay = Math.max(100, delay * factor);
          continue;
        }

        return res;
      } catch (err) {
        if (attemptCount >= maxAttempts) throw err;
        await sleep(delay + Math.random() * 200);
        delay = Math.max(100, delay * factor);
      }
    }
  };

  const promise = attempt();
  inFlight.set(dedupeKey, promise);

  try {
    const res = await promise;
    return res.clone ? res.clone() : res;
  } finally {
    // keep dedupe entry for a short time to avoid immediate duplicates
    setTimeout(() => inFlight.delete(dedupeKey), 5000);
  }
}

export default fetchWithRetry;
