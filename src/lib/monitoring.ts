import * as Sentry from "@sentry/nextjs";

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!process.env.SENTRY_DSN?.trim()) return;
  return Sentry.captureException(error, context ? { extra: context } : undefined);
}
