import { checkIpThrottle } from "@/lib/ip-throttle";
import { getClientIp } from "@/lib/request-ip";
import { getSessionEmailFromRequestAsync } from "@/lib/session";
import type { NextRequest, NextResponse } from "next/server";
import { NextResponse as NR } from "next/server";

export function withRateLimit(
  handler: (req: NextRequest, ...rest: unknown[]) => Promise<NextResponse> | NextResponse,
  opts?: { keyPrefix?: string; limit?: number; windowMs?: number; dedupeMs?: number }
) {
  const prefix = opts?.keyPrefix ?? "rl:ip";
  const limit = opts?.limit ?? 100;
  const windowMs = opts?.windowMs ?? 60 * 1000;
  const dedupeMs = opts?.dedupeMs ?? 5_000;

  // simple in-memory dedupe map for Idempotency-Key to avoid processing duplicate
  declare global {
    // global variable to store recent idempotency entries between HMR reloads
    // eslint rules not needed here
    var wfRateLimitIdemp: Map<string, number> | undefined;
  }

  const idempStore = globalThis.wfRateLimitIdemp ?? new Map<string, number>();
  if (!globalThis.wfRateLimitIdemp) globalThis.wfRateLimitIdemp = idempStore;

  function cleanupIdemp(now: number) {
    for (const [k, v] of idempStore.entries()) {
      if (now >= v) idempStore.delete(k);
    }
  }

  return async function (req: NextRequest, ...rest: unknown[]) {

    // idempotency dedupe: if client provides an Idempotency-Key, avoid processing duplicates
    const idKey = req?.headers?.get?.("Idempotency-Key") ?? req?.headers?.get?.("X-Idempotency-Key") ?? req?.headers?.get?.("x-idempotency-key");
    if (idKey) {
      const now = Date.now();
      cleanupIdemp(now);
      const idempKey = `${prefix}:idem:${idKey}`;
      if (idempStore.has(idempKey)) {
        // Duplicate request recently seen; return a short-circuit response indicating duplicate
        return NR.json({ ok: false, message: "Duplicate request in flight" }, { status: 202 });
      }
      idempStore.set(idempKey, now + dedupeMs);
    }

    // Prefer user-specific throttle when a session email is available
    let principalKey: string | null = null;
    try {
      const email = await getSessionEmailFromRequestAsync(req as unknown as Request);
      if (email) principalKey = `user:${email}`;
    } catch {
      // ignore errors reading session; fallback to IP
    }

    const ip = getClientIp(req as unknown as Request) ?? "unknown";
    const keyPrincipal = principalKey ? `${prefix}:${principalKey}` : `${prefix}:ip:${ip}`;
    const throttle = await checkIpThrottle({ key: keyPrincipal, limit, windowMs });
    if (!throttle.ok) {
      const headers: Record<string, string> = {};
      try {
        headers["Retry-After"] = String(throttle.retryAfterSeconds);
      } catch {}
      return NR.json({ ok: false, message: "Too many requests", retryAfterSeconds: throttle.retryAfterSeconds }, { status: 429, headers });
    }

    return handler(req, ...rest);
  };
}
