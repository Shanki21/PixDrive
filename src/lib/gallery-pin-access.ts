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

export function getGalleryAccessCookieName(galleryId: string) {
  const safeId = galleryId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "gallery";
  return `wf_ga_${safeId}`;
}

export function getRequiredGalleryPin(settings: unknown) {
  const normalized = normalizeEventSettings(settings);
  if (!normalized) return null;

  const fullPin = normalized.fullAccessPin?.trim() || null;
  const guestPin = normalized.guestPin?.trim() || null;
  const hasAnyPin = Boolean(fullPin || guestPin);
  if (!hasAnyPin && !normalized.oneQrRequirePin) {
    return null;
  }

  if (normalized.oneQrRequirePin) {
    if (normalized.oneQrAccessLevel === "full") {
      return fullPin || guestPin || null;
    }
    return guestPin || fullPin || null;
  }

  return guestPin || fullPin || null;
}

export function verifyGalleryPin(settings: unknown, pin: string) {
  const required = getRequiredGalleryPin(settings);
  if (!required) return true;
  return pin.trim() === required;
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
