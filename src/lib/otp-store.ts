import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

// Simple rate limit and lock thresholds.
const REQUEST_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 5;
const VERIFY_LOCK_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_ATTEMPTS = 5;

// Dummy hash to keep timing consistent when the email does not exist.
const DUMMY_HASH = bcrypt.hashSync("000000", 10);

export class OtpRateLimitError extends Error {
  constructor(message?: string) {
    super(message ?? "Too many requests");
    this.name = "OtpRateLimitError";
  }
}

export async function createOtp(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  const now = new Date();

  const entry = await prisma.otp.findUnique({ where: { email: normalizedEmail } });
  const codeHash = await bcrypt.hash(code, 10);

  if (entry) {
    if (entry.lastRequestedAt && now.getTime() - entry.lastRequestedAt.getTime() < REQUEST_WINDOW_MS) {
      const nextCount = entry.requestCount + 1;
      if (nextCount > MAX_REQUESTS_PER_WINDOW) {
        throw new OtpRateLimitError("Too many OTP requests for this address");
      }
      await prisma.otp.update({
        where: { email: normalizedEmail },
        data: {
          codeHash,
          expiresAt,
          requestCount: nextCount,
          lastRequestedAt: now,
          failedAttempts: 0,
          lastFailedAt: null,
        },
      });
    } else {
      await prisma.otp.update({
        where: { email: normalizedEmail },
        data: {
          codeHash,
          expiresAt,
          requestCount: 1,
          lastRequestedAt: now,
          failedAttempts: 0,
          lastFailedAt: null,
        },
      });
    }
  } else {
    await prisma.otp.create({
      data: {
        email: normalizedEmail,
        codeHash,
        expiresAt,
        requestCount: 1,
        lastRequestedAt: now,
        failedAttempts: 0,
      },
    });
  }

  return code;
}

export async function verifyOtp(email: string, code: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const entry = await prisma.otp.findUnique({ where: { email: normalizedEmail } });
  const now = new Date();

  if (!entry) {
    await bcrypt.compare(code, DUMMY_HASH);
    return false;
  }

  if (entry.expiresAt < now) {
    await prisma.otp.delete({ where: { email: normalizedEmail } }).catch(() => {});
    return false;
  }

  if (
    entry.lastFailedAt &&
    now.getTime() - entry.lastFailedAt.getTime() < VERIFY_LOCK_WINDOW_MS &&
    entry.failedAttempts >= MAX_FAILED_ATTEMPTS
  ) {
    throw new OtpRateLimitError("Too many failed verification attempts");
  }

  const ok = await bcrypt.compare(code, entry.codeHash);
  if (ok) {
    await prisma.otp.delete({ where: { email: normalizedEmail } }).catch(() => {});
    return true;
  }

  try {
    const nextFailed =
      !entry.lastFailedAt || now.getTime() - entry.lastFailedAt.getTime() > VERIFY_LOCK_WINDOW_MS
        ? 1
        : entry.failedAttempts + 1;

    await prisma.otp.update({
      where: { email: normalizedEmail },
      data: {
        failedAttempts: nextFailed,
        lastFailedAt: now,
      },
    });
  } catch {
    // Keep verify response resilient even if failure-counter update fails.
  }

  return false;
}
