import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { AppError } from "@/lib/errors";
import { isPrismaUnavailableError, getPrismaUnavailableMessage } from "@/lib/prisma-errors";

export function withApiHandler<T extends unknown[]>(handler: (...args: T) => Promise<NextResponse> | NextResponse) {
  return async function (...args: T) {
    try {
      const result = await handler(...args);
      return result;
    } catch (error: unknown) {
      logger.error("[api] unhandled error", error);
      if (isPrismaUnavailableError(error)) {
        return NextResponse.json({ ok: false, message: getPrismaUnavailableMessage() }, { status: 503 });
      }
      if (error instanceof AppError) {
        const status = (error as AppError).status ?? 500;
        return NextResponse.json({ ok: false, message: (error as AppError).message }, { status });
      }
      return NextResponse.json({ ok: false, message: "Internal server error" }, { status: 500 });
    }
  };
}
