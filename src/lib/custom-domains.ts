import crypto from "node:crypto";
import { promises as dns } from "node:dns";
import prisma from "@/lib/prisma";

const MAX_DOMAIN_LENGTH = 253;
const DOMAIN_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export const CUSTOM_DOMAIN_STATUS = {
  pending: "pending",
  verified: "verified",
  misconfigured: "misconfigured",
} as const;

export type CustomDomainStatus = (typeof CUSTOM_DOMAIN_STATUS)[keyof typeof CUSTOM_DOMAIN_STATUS];

export function normalizeDomainHost(value: unknown) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "";

  let host = raw;
  try {
    host = new URL(raw.includes("://") ? raw : `https://${raw}`).hostname;
  } catch {
    host = raw.split("/")[0] ?? "";
  }

  host = host.replace(/\.$/, "");
  if (host.startsWith("www.")) host = host.slice(4);
  if (!host || host.length > MAX_DOMAIN_LENGTH || host === "localhost") return "";
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return "";

  const labels = host.split(".");
  if (labels.length < 2) return "";
  if (!labels.every((label) => DOMAIN_LABEL.test(label))) return "";
  return host;
}

export function normalizeRequestHost(value: string | null) {
  const host = String(value ?? "").toLowerCase().split(",")[0]?.trim() ?? "";
  return normalizeDomainHost(host.split(":")[0]);
}

export function createDomainVerificationToken() {
  return `pixora-verify-${crypto.randomBytes(18).toString("hex")}`;
}

export function getDomainDnsTarget() {
  const explicit = (process.env.CUSTOM_DOMAIN_CNAME_TARGET || process.env.NEXT_PUBLIC_CLIENT_GALLERY_HOST || "").trim().toLowerCase();
  if (explicit) return explicit.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  try {
    const origin = process.env.NEXT_PUBLIC_CLIENT_GALLERY_BASE_URL?.trim();
    return origin ? new URL(origin).host.toLowerCase() : "";
  } catch {
    return "";
  }
}

export function getTxtRecordName(domain: string) {
  return `_pixora-verification.${domain}`;
}

export async function resolveVerifiedCustomDomain(host: string) {
  const domain = normalizeDomainHost(host);
  if (!domain) return null;

  return prisma.customDomain.findFirst({
    where: {
      domain,
      status: CUSTOM_DOMAIN_STATUS.verified,
      verifiedAt: { not: null },
    },
    select: {
      id: true,
      domain: true,
      userId: true,
      user: { select: { email: true } },
    },
  });
}

export async function verifyDomainDns(domain: string, token: string) {
  const txtName = getTxtRecordName(domain);
  const cnameTarget = getDomainDnsTarget().replace(/\.$/, "");
  const checks = {
    txt: false,
    cname: !cnameTarget,
    txtName,
    cnameTarget,
  };

  try {
    const rows = await dns.resolveTxt(txtName);
    checks.txt = rows.flat().some((entry) => entry.trim() === token);
  } catch {
    checks.txt = false;
  }

  if (cnameTarget) {
    try {
      const records = await dns.resolveCname(domain);
      checks.cname = records.map((record) => record.replace(/\.$/, "").toLowerCase()).includes(cnameTarget);
    } catch {
      checks.cname = false;
    }
  }

  return {
    ok: checks.txt && checks.cname,
    checks,
  };
}
