import bcrypt from "bcryptjs";
import crypto from "crypto";
import type { NextRequest, NextResponse } from "next/server";
import { normalizeEventSettings } from "./gallery-config";

const DEV_FALLBACK_SECRET = "pixora-dev-session-secret-not-for-production";
const GALLERY_ACCESS_MAX_AGE_SECONDS = 60 * 60 * 24;

type GalleryAccessPayload = {
  galleryId: string;
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

function getAppSecret() {
  const raw = process.env.NEXTAUTH_SECRET?.trim() || process.env.AUTH_SECRET?.trim();
  if (raw) return raw;
  return process.env.NODE_ENV === "production" ? null : DEV_FALLBACK_SECRET;
}

function sign(input: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(input).digest("base64url");
}

function safeEquals(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function normalizePinValue(value: unknown) {
  if (value == null) return null;
  const next = String(value).trim();
  return next.length > 0 ? next : null;
}

function isBcryptHash(value: string) {
  return /^\$2[aby]\$\d{2}\$/.test(value);
}

function getPreferredPinValues(settings: unknown) {
  const normalized = normalizeEventSettings(settings);
  if (!normalized) return [];

  const fullHash = normalizePinValue(normalized.fullAccessPinHash);
  const fullPlain = normalizePinValue(normalized.fullAccessPin);
  const guestHash = normalizePinValue(normalized.guestPinHash);
  const guestPlain = normalizePinValue(normalized.guestPin);

  const fullCandidates = [fullHash, fullPlain].filter((value): value is string => Boolean(value));
  const guestCandidates = [guestHash, guestPlain].filter((value): value is string => Boolean(value));
  const hasAnyPin = fullCandidates.length > 0 || guestCandidates.length > 0;
  if (!hasAnyPin && !normalized.oneQrRequirePin) {
    return [];
  }

  if (normalized.oneQrRequirePin) {
    if (normalized.oneQrAccessLevel === "full") {
      return [...fullCandidates, ...guestCandidates];
    }
    return [...guestCandidates, ...fullCandidates];
  }

  return [...guestCandidates, ...fullCandidates];
}

function buildToken(payload: GalleryAccessPayload) {
  const secret = getAppSecret();
  if (!secret) return null;
  const encoded = toBase64Url(JSON.stringify(payload));
  const signature = sign(encoded, secret);
  return `${encoded}.${signature}`;
}

function parseToken(token: string) {
  const secret = getAppSecret();
  if (!secret) return null;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;
  const expected = sign(encodedPayload, secret);
  if (!safeEquals(signature, expected)) return null;
  try {
    const parsed = JSON.parse(fromBase64Url(encodedPayload)) as Partial<GalleryAccessPayload>;
    const galleryId = String(parsed.galleryId ?? "").trim();
    const exp = Number(parsed.exp ?? 0);
    if (!galleryId || !Number.isFinite(exp) || exp <= Date.now()) return null;
    return { galleryId, exp };
  } catch {
    return null;
  }
}

async function verifyPinValue(pin: string, expected: string) {
  if (isBcryptHash(expected)) {
    return bcrypt.compare(pin, expected);
  }
  return safeEquals(pin, expected);
}

export function getGalleryAccessCookieName(galleryId: string) {
  const safeId = galleryId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "gallery";
  return `wf_ga_${safeId}`;
}

export function getRequiredGalleryPin(settings: unknown) {
  const candidates = getPreferredPinValues(settings);
  return candidates[0] ?? null;
}

export async function hashGalleryPin(pin: string) {
  return bcrypt.hash(pin.trim(), 10);
}

export async function verifyGalleryPin(settings: unknown, pin: string) {
  const normalizedPin = pin.trim();
  if (!normalizedPin) return false;

  const candidates = getPreferredPinValues(settings);
  if (candidates.length === 0) return true;

  for (const candidate of candidates) {
    if (await verifyPinValue(normalizedPin, candidate)) {
      return true;
    }
  }
  return false;
}

export function setGalleryAccessCookie(response: NextResponse, galleryId: string) {
  const token = buildToken({
    galleryId,
    exp: Date.now() + GALLERY_ACCESS_MAX_AGE_SECONDS * 1000,
  });
  if (!token) return false;

  response.cookies.set({
    name: getGalleryAccessCookieName(galleryId),
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: GALLERY_ACCESS_MAX_AGE_SECONDS,
  });
  return true;
}

export function hasGalleryAccessCookieValue(galleryId: string, token: string) {
  const parsed = parseToken(token);
  if (!parsed) return false;
  return parsed.galleryId === galleryId;
}

export function hasGalleryAccessFromRequest(req: NextRequest, galleryId: string) {
  const token = req.cookies.get(getGalleryAccessCookieName(galleryId))?.value ?? "";
  return hasGalleryAccessCookieValue(galleryId, token);
}

export function hasGalleryAccessFromCookieStore(
  cookieStore: { get: (name: string) => { value?: string } | undefined },
  galleryId: string
) {
  const token = cookieStore.get(getGalleryAccessCookieName(galleryId))?.value ?? "";
  return hasGalleryAccessCookieValue(galleryId, token);
}
