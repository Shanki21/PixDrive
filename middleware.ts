
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const DEV_FALLBACK_SESSION_SECRET = "pixora-dev-session-secret-not-for-production";
const PUBLIC_EXACT_PATHS = new Set(["/", "/favicon.ico", "/robots.txt"]);
const PUBLIC_PREFIXES = [
  "/login",
  "/signup",
  "/_next",
  "/public",
  "/disk/",
  "/studio/",
  "/api/auth",
  "/api/disk",
  "/api/qr",
  "/api/reviews/metadata",
];
const PUBLIC_GALLERY_API_PATTERN = /^\/api\/galleries\/[^/]+\/(visit|client-actions|reviews)$/;
const NO_STORE_PREFIXES = ["/dashboard", "/api/auth", "/api/galleries", "/api/photos"];

function matchesPublicPrefix(pathname: string) {
  return PUBLIC_PREFIXES.some((prefix) =>
    prefix.endsWith("/") ? pathname.startsWith(prefix) : pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isPublicPath(pathname: string) {
  return (
    PUBLIC_EXACT_PATHS.has(pathname) ||
    matchesPublicPrefix(pathname) ||
    PUBLIC_GALLERY_API_PATTERN.test(pathname) ||
    pathname.startsWith("/sitemap") ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  );
}

function shouldForceNoStore(pathname: string) {
  return NO_STORE_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function applySecurityHeaders(response: NextResponse, req: NextRequest) {
  response.headers.set("Content-Security-Policy", "base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'");
  response.headers.set("Permissions-Policy", "camera=(self), microphone=(), geolocation=()");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Origin-Agent-Cluster", "?1");

  if (shouldForceNoStore(req.nextUrl.pathname)) {
    response.headers.set("Cache-Control", "no-store");
  }

  if (req.nextUrl.protocol === "https:") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  return response;
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
  if (isPublicPath(pathname)) {
    return applySecurityHeaders(NextResponse.next(), req);
  }

  const token = req.cookies.get("wf_session")?.value;
  const ok = await isValidSessionToken(token);
  if (ok) {
    return applySecurityHeaders(NextResponse.next(), req);
  }

  if (pathname.startsWith("/api/")) {
    return applySecurityHeaders(
      NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 }),
      req
    );
  }

  // Redirect to login preserving original path
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return applySecurityHeaders(NextResponse.redirect(loginUrl), req);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
