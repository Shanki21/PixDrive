import crypto from "crypto";

const SERVICE = "s3";
const REGION = "auto";
const EXPIRES_SECONDS = 10 * 60;

function readR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET?.trim();
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.trim()?.replace(/\/+$/, "");

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) {
    return null;
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicBaseUrl,
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  };
}

function hmac(key: string | Buffer, value: string) {
  return crypto.createHmac("sha256", key).update(value).digest();
}

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function amzDate(date = new Date()) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function dateScope(value: string) {
  return value.slice(0, 8);
}

function encodePathPart(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function canonicalUri(bucket: string, key: string) {
  return `/${encodePathPart(bucket)}/${key.split("/").map(encodePathPart).join("/")}`;
}

function signingKey(secretAccessKey: string, date: string) {
  const kDate = hmac(`AWS4${secretAccessKey}`, date);
  const kRegion = hmac(kDate, REGION);
  const kService = hmac(kRegion, SERVICE);
  return hmac(kService, "aws4_request");
}

function safeFileName(fileName: string) {
  const cleaned = fileName
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "upload";
}

function extensionFromContentType(contentType: string) {
  const lower = contentType.toLowerCase();
  if (lower.includes("image/jpeg")) return ".jpg";
  if (lower.includes("image/png")) return ".png";
  if (lower.includes("image/webp")) return ".webp";
  if (lower.includes("image/gif")) return ".gif";
  return "";
}

export function isR2Configured() {
  return Boolean(readR2Config());
}

export function createR2ObjectKey(fileName: string, contentType: string) {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const base = safeFileName(fileName);
  const hasExtension = /\.[a-z0-9]{2,8}$/i.test(base);
  const extension = hasExtension ? "" : extensionFromContentType(contentType);
  return `originals/${yyyy}/${mm}/${crypto.randomUUID()}-${base}${extension}`;
}

export function createR2SignedUploadUrl({
  key,
  contentType,
}: {
  key: string;
  contentType: string;
}) {
  const config = readR2Config();
  if (!config) {
    throw new Error("Cloudflare R2 is not configured.");
  }

  const now = amzDate();
  const shortDate = dateScope(now);
  const credentialScope = `${shortDate}/${REGION}/${SERVICE}/aws4_request`;
  const credential = `${config.accessKeyId}/${credentialScope}`;
  const signedHeaders = "host";
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const uri = canonicalUri(config.bucket, key);
  const params = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": credential,
    "X-Amz-Date": now,
    "X-Amz-Expires": String(EXPIRES_SECONDS),
    "X-Amz-SignedHeaders": signedHeaders,
  });
  const canonicalQuery = Array.from(params.entries())
    .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
    .sort()
    .join("&");
  const canonicalRequest = [
    "PUT",
    uri,
    canonicalQuery,
    `host:${host}`,
    "",
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    now,
    credentialScope,
    sha256(canonicalRequest),
  ].join("\n");
  const signature = crypto
    .createHmac("sha256", signingKey(config.secretAccessKey, shortDate))
    .update(stringToSign)
    .digest("hex");

  return {
    uploadUrl: `${config.endpoint}${uri}?${canonicalQuery}&X-Amz-Signature=${signature}`,
    publicUrl: `${config.publicBaseUrl}/${key.split("/").map(encodePathPart).join("/")}`,
    key,
    contentType,
  };
}

export async function deleteR2ObjectByUrl(url: string) {
  const config = readR2Config();
  if (!config) return false;
  if (!url.startsWith(`${config.publicBaseUrl}/`)) return false;

  const key = decodeURIComponent(url.slice(config.publicBaseUrl.length + 1));
  const signed = createR2SignedDeleteUrl(key);
  const response = await fetch(signed);
  return response.ok || response.status === 404;
}

function createR2SignedDeleteUrl(key: string) {
  const config = readR2Config();
  if (!config) {
    throw new Error("Cloudflare R2 is not configured.");
  }

  const now = amzDate();
  const shortDate = dateScope(now);
  const credentialScope = `${shortDate}/${REGION}/${SERVICE}/aws4_request`;
  const credential = `${config.accessKeyId}/${credentialScope}`;
  const signedHeaders = "host";
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const uri = canonicalUri(config.bucket, key);
  const params = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": credential,
    "X-Amz-Date": now,
    "X-Amz-Expires": String(EXPIRES_SECONDS),
    "X-Amz-SignedHeaders": signedHeaders,
  });
  const canonicalQuery = Array.from(params.entries())
    .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
    .sort()
    .join("&");
  const canonicalRequest = [
    "DELETE",
    uri,
    canonicalQuery,
    `host:${host}`,
    "",
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    now,
    credentialScope,
    sha256(canonicalRequest),
  ].join("\n");
  const signature = crypto
    .createHmac("sha256", signingKey(config.secretAccessKey, shortDate))
    .update(stringToSign)
    .digest("hex");

  return `${config.endpoint}${uri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}
