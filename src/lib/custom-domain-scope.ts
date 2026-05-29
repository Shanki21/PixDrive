import { normalizeRequestHost, resolveVerifiedCustomDomain } from "@/lib/custom-domains";

type HeaderLike = {
  get: (name: string) => string | null;
};

export async function getCustomDomainUserScope(headers: HeaderLike) {
  const host = headers.get("x-forwarded-host") || headers.get("host");
  const customDomain = await resolveVerifiedCustomDomain(normalizeRequestHost(host));
  return customDomain?.userId ? { userId: customDomain.userId } : {};
}

