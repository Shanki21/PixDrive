import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const DEV_FALLBACK_SESSION_SECRET = "pixora-dev-session-secret-not-for-production";

function isPublicPath(pathname: string) {
  // Allow auth endpoints and pages, next internals, and common static files
  return (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap") ||
    pathname.startsWith("/public") ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  );
}

function base64UrlToUint8Array(input: string) {
  let base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  if (pad) base64 += "=".repeat(4 - pad);

  // atob in edge; fallback to Buffer in node
  let binary = "";
  if (typeof atob === "function") {
    binary = atob(base64);
  } else {
    binary = Buffer.from(base64, "base64").toString("binary");
  }

  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function uint8ArrayToBase64Url(bytes: Uint8Array) {
  let base64 = "";
  if (typeof btoa === "function") {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    base64 = btoa(binary);
  } else {
    base64 = Buffer.from(bytes).toString("base64");
  }
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function computeHmacBase64Url(message: string, secret: string) {
  const enc = new TextEncoder();
  const keyData = enc.encode(secret);
  // Web Crypto in edge
  const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  const bytes = new Uint8Array(sig as ArrayBuffer);
  return uint8ArrayToBase64Url(bytes);
}

async function isValidSessionToken(token: string | undefined) {
  if (!token) return false;
  const secretRaw = (process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "").trim();
  const secret = secretRaw || (process.env.NODE_ENV === "production" ? "" : DEV_FALLBACK_SESSION_SECRET);
  if (!secret) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [encoded, signature] = parts;
  try {
    const expected = await computeHmacBase64Url(encoded, secret);
    if (expected !== signature) return false;

    // decode payload
    const payloadBytes = base64UrlToUint8Array(encoded);
    const payload = new TextDecoder().decode(payloadBytes);
    const obj = JSON.parse(payload) as { email?: string; exp?: number };
    if (!obj?.email || !obj?.exp) return false;
    if (Number(obj.exp) <= Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const token = req.cookies.get("wf_session")?.value;
  const ok = await isValidSessionToken(token);
  if (ok) return NextResponse.next();

  // Redirect to login preserving original path
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: "/:path*",
};
