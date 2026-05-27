import crypto from "crypto";

const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";

type RazorpayRequestOptions = {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
};

export function isRazorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID?.trim() && process.env.RAZORPAY_KEY_SECRET?.trim());
}

export function getRazorpayKeyId() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  if (!keyId) throw new Error("Razorpay is not configured. Set RAZORPAY_KEY_ID.");
  return keyId;
}

function getRazorpaySecret() {
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!secret) throw new Error("Razorpay is not configured. Set RAZORPAY_KEY_SECRET.");
  return secret;
}

export async function razorpayRequest<T>(path: string, options: RazorpayRequestOptions = {}) {
  const auth = Buffer.from(`${getRazorpayKeyId()}:${getRazorpaySecret()}`).toString("base64");
  const response = await fetch(`${RAZORPAY_API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const payload = (await response.json().catch(() => ({}))) as T & { error?: { description?: string } };
  if (!response.ok) {
    throw new Error(payload.error?.description || `Razorpay request failed with status ${response.status}.`);
  }
  return payload as T;
}

export function verifyRazorpaySignature(payload: string, signature: string, secret = getRazorpaySecret()) {
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function verifyRazorpayWebhook(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret) throw new Error("RAZORPAY_WEBHOOK_SECRET is not configured.");
  return verifyRazorpaySignature(rawBody, signature, secret);
}
