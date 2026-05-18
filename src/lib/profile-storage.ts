export type SocialAccount = {
  platform: string;
  url: string;
};

export type DashboardProfile = {
  name: string;
  occupation: string;
  phone: string;
  email: string;
  country: string;
  state: string;
  city: string;
  companyName: string;
  industry: string;
  industryArea: string;
  averageEventsPerYear: string;
  billingCompanyName: string;
  taxNumber: string;
  avatarDataUrl: string;
  showOnWebsite: boolean;
  socialAccounts: SocialAccount[];
};

export const PROFILE_STORAGE_KEY = "pixora_dashboard_profile";

export const DEFAULT_PROFILE: DashboardProfile = {
  name: "",
  occupation: "",
  phone: "",
  email: "",
  country: "",
  state: "",
  city: "",
  companyName: "",
  industry: "Photographer",
  industryArea: "",
  averageEventsPerYear: "",
  billingCompanyName: "",
  taxNumber: "",
  avatarDataUrl: "",
  showOnWebsite: true,
  socialAccounts: [],
};

export function loadProfile(): DashboardProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw) as Partial<DashboardProfile>;
    const normalizedSocials = Array.isArray(parsed.socialAccounts)
      ? parsed.socialAccounts
          .map((item) => {
            if (typeof item === "string") {
              return { platform: item, url: "" };
            }

            if (item && typeof item === "object") {
              const platform = String((item as Partial<SocialAccount>).platform ?? "").trim();
              const url = String((item as Partial<SocialAccount>).url ?? "").trim();
              if (platform) {
                return { platform, url };
              }
            }

            return null;
          })
          .filter((item): item is SocialAccount => item !== null)
      : [];

    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      socialAccounts: normalizedSocials,
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(next: DashboardProfile) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore localStorage write failures
  }

  // Fire-and-forget: persist profile to server for authenticated users
  (async () => {
    try {
      const { default: fetchWithRetry } = await import("@/lib/fetchWithRetry");
      await fetchWithRetry("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: next.name || undefined,
          occupation: next.occupation || undefined,
          phone: next.phone || undefined,
          country: next.country || undefined,
          state: next.state || undefined,
          city: next.city || undefined,
          companyName: next.companyName || undefined,
          industry: next.industry || undefined,
          industryArea: next.industryArea || undefined,
          averageEventsPerYear: next.averageEventsPerYear || undefined,
          billingCompanyName: next.billingCompanyName || undefined,
          taxNumber: next.taxNumber || undefined,
          avatarUrl: next.avatarDataUrl || undefined,
          socialAccounts: next.socialAccounts || undefined,
        }),
      }, { dedupeKey: `client:profile:save:${next.email || "unknown"}` });
    } catch {
      // ignore network failures; profile remains in localStorage as fallback
    }
  })();
}

