export type SocialAccount = {
  platform: string;
  url: string;
};

export type DashboardProfile = {
  name: string;
  occupation: string;
  phone: string;
  email: string;
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
  window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
}


