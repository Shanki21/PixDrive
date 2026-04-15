type HeaderCarrier = {
  headers: {
    get: (name: string) => string | null;
  };
};

function sanitizeIp(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 100);
}

export function getClientIp(req: HeaderCarrier) {
  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  if (forwarded) {
    const first = forwarded.split(",")[0] ?? "";
    const ip = sanitizeIp(first);
    if (ip) return ip;
  }

  const realIp = sanitizeIp(req.headers.get("x-real-ip") ?? "");
  if (realIp) return realIp;

  return null;
}
