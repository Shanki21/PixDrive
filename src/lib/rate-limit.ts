import { checkIpThrottle } from "@/lib/ip-throttle";
import { getClientIp } from "@/lib/request-ip";
import type { NextRequest, NextResponse } from "next/server";
import { NextResponse as NR } from "next/server";

declare global {
  var wfRateLimitIdemp: Map<string, number> | undefined;
}

export function withRateLimit(
  handler: (
    req: NextRequest,
    ...rest: unknown[]
  ) => Promise<NextResponse> | NextResponse,
  opts?: {
    keyPrefix?: string;
    limit?: number;
    windowMs?: number;
    dedupeMs?: number;
  }
) {
  const prefix = opts?.keyPrefix ?? "rl:ip";
  const limit = opts?.limit ?? 100;
  const windowMs = opts?.windowMs ?? 60 * 1000;
  const dedupeMs = opts?.dedupeMs ?? 5_000;

  const idempStore =
    globalThis.wfRateLimitIdemp ?? new Map<string, number>();

  if (!globalThis.wfRateLimitIdemp) {
    globalThis.wfRateLimitIdemp = idempStore;
  }

  function cleanupIdemp(now: number) {
    for (const [k, v] of idempStore.entries()) {
      if (now >= v) {
        idempStore.delete(k);
      }
    }
  }

  return async function (
    req: NextRequest,
    ...rest: unknown[]
  ): Promise<NextResponse> {
    try {
      // Idempotency protection
      const idKey =
        req.headers.get("Idempotency-Key") ??
        req.headers.get("X-Idempotency-Key") ??
        req.headers.get("x-idempotency-key");

      if (idKey) {
        const now = Date.now();

        cleanupIdemp(now);

        const idempKey = `${prefix}:idem:${idKey}`;

        if (idempStore.has(idempKey)) {
          return NR.json(
            {
              ok: false,
              message: "Duplicate request in flight",
            },
            { status: 202 }
          );
        }

        idempStore.set(idempKey, now + dedupeMs);
      }

      // Lazy-load session utility
      let principalKey: string | null = null;

      try {
        const { getSessionEmailFromRequestAsync } = await import(
          "@/lib/session"
        );

        const email =
          await getSessionEmailFromRequestAsync(req);

        if (email) {
          principalKey = `user:${email}`;
        }
      } catch {
        // fallback to IP
      }

      const ip = getClientIp(req) ?? "unknown";

      const keyPrincipal = principalKey
        ? `${prefix}:${principalKey}`
        : `${prefix}:ip:${ip}`;

      const throttle = await checkIpThrottle({
        key: keyPrincipal,
        limit,
        windowMs,
      });

      if (!throttle.ok) {
        return NR.json(
          {
            ok: false,
            message: "Too many requests",
            retryAfterSeconds: throttle.retryAfterSeconds,
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(
                throttle.retryAfterSeconds
              ),
            },
          }
        );
      }

      return await handler(req, ...rest);
    } catch (error) {
      console.error("[rate-limit-wrapper]", error);

      return NR.json(
        {
          ok: false,
          message: "Internal server error",
        },
        { status: 500 }
      );
    }
  };
}