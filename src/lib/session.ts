import crypto from "crypto";
import type { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const SESSION_COOKIE_NAME = "wf_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const DEV_FALLBACK_SESSION_SECRET = "pixora-dev-session-secret-not-for-production";
let didWarnAboutMissingSecret = false;

type SessionPayload = {
  email: string;
  exp: number;
};

function toBase64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
}

function getSessionSecret() {
  const raw = process.env.NEXTAUTH_SECRET?.trim() || process.env.AUTH_SECRET?.trim();
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      return null;
    }
    if (!didWarnAboutMissingSecret) {
      didWarnAboutMissingSecret = true;
      console.warn(
        "[session] NEXTAUTH_SECRET/AUTH_SECRET is missing. Using development fallback secret. Set NEXTAUTH_SECRET in .env."
      );
    }
    return DEV_FALLBACK_SESSION_SECRET;
  }
  return raw;
}

function sign(input: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(input).digest("base64url");
}

function digestEquals(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

function buildSessionToken(payload: SessionPayload) {
  const secret = getSessionSecret();
  if (!secret) return null;
  const payloadJson = JSON.stringify(payload);
  const encoded = toBase64Url(payloadJson);
  const signature = sign(encoded, secret);
  return `${encoded}.${signature}`;
}

function parseSessionToken(token: string): SessionPayload | null {
  const secret = getSessionSecret();
  if (!secret) return null;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expected = sign(encodedPayload, secret);
  if (!digestEquals(signature, expected)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fromBase64Url(encodedPayload)) as Partial<SessionPayload>;
    const email = String(parsed.email ?? "").trim().toLowerCase();
    const exp = Number(parsed.exp ?? 0);
    if (!email || !Number.isFinite(exp)) return null;
    if (exp <= Date.now()) return null;
    return { email, exp };
  } catch {
    return null;
  }
}

export function createSessionForEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const payload: SessionPayload = {
    email: normalized,
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  };
  return buildSessionToken(payload);
}

export function getSessionEmailFromRequest(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value ?? "";
  const session = parseSessionToken(token);
  return session?.email ?? null;
}

export async function getSessionEmailFromRequestAsync(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value ?? "";
  if (!token) return null;
  const payload = parseSessionToken(token);
  if (!payload) return null;

  try {
    const row = await prisma.session.findUnique({ where: { token } });
    if (!row) return null;
    if (new Date(row.expiresAt).getTime() <= Date.now()) {
      // expired session, remove
      await prisma.session.deleteMany({ where: { token } }).catch(() => {});
      return null;
    }
    return row.email ?? payload.email ?? null;
  } catch {
    return null;
  }
}

export function getSessionEmailFromCookieStore(cookieStore: {
  get: (name: string) => { value?: string } | undefined;
}) {
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? "";
  const session = parseSessionToken(token);
  return session?.email ?? null;
}

export async function setSessionCookie(response: NextResponse, email: string) {
  const token = createSessionForEmail(email);
  if (!token) {
    return false;
  }

  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  try {
    await prisma.session.create({ data: { token, email: email.trim().toLowerCase(), expiresAt } });
  } catch {
    // ignore DB write failures; still set cookie so signed token works as fallback
  }

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return true;
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
