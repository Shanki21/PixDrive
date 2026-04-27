type NormalizeUrlOptions = {
  allowHttpLocalhost?: boolean;
  allowPrivateHosts?: boolean;
};

const MAX_URL_LENGTH = 2048;

function normalizeHostname(hostname: string) {
  return hostname.trim().replace(/\.$/, "").toLowerCase();
}

function isLocalDevHostname(hostname: string) {
  const normalized = normalizeHostname(hostname);
  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "127.0.0.1" ||
    normalized === "::1"
  );
}

export function isPrivateHostname(hostname: string) {
  const lower = normalizeHostname(hostname);
  if (!lower) return true;
  if (
    lower === "localhost" ||
    lower.endsWith(".localhost") ||
    lower.endsWith(".local") ||
    lower.endsWith(".internal") ||
    lower === "::1"
  ) {
    return true;
  }

  if (/^\d+\.\d+\.\d+\.\d+$/.test(lower)) {
    const [a, b] = lower.split(".").map((value) => Number(value));
    if (!Number.isFinite(a) || !Number.isFinite(b)) return true;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }

  if (lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80")) {
    return true;
  }

  return false;
}

export function normalizePublicUrl(raw: string, options: NormalizeUrlOptions = {}) {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_URL_LENGTH) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    const hostname = normalizeHostname(parsed.hostname);
    const allowHttpLocalhost = options.allowHttpLocalhost ?? false;
    const allowPrivateHosts = options.allowPrivateHosts ?? false;

    if (parsed.username || parsed.password) {
      return null;
    }

    if (
      parsed.protocol !== "https:" &&
      !(allowHttpLocalhost && parsed.protocol === "http:" && isLocalDevHostname(hostname))
    ) {
      return null;
    }

    if (!allowPrivateHosts && isPrivateHostname(hostname)) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

export function normalizePublicOrigin(raw: string, options: NormalizeUrlOptions = {}) {
  const normalizedUrl = normalizePublicUrl(raw, options);
  if (!normalizedUrl) {
    return null;
  }

  try {
    return new URL(normalizedUrl).origin;
  } catch {
    return null;
  }
}
