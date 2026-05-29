"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import fetchWithRetry from "@/lib/fetchWithRetry";
import {
  BadgeDollarSign,
  CheckCircle2,
  ClipboardList,
  Copy,
  ExternalLink,
  Crown,
  Globe2,
  IdCard,
  Image as ImageIcon,
  Loader2,
  ReceiptText,
  RefreshCw,
  Save,
  Sparkles,
  UserRound,
  Zap,
  Trash2,
} from "lucide-react";
import { showPixoraAlert, showPixoraToast } from "@/lib/pixora-alerts";
import {
  ENTERPRISE_PLAN,
  PAID_BILLING_PLAN_CARDS,
  PHOTO_OVERAGE_COPY,
  type PaidBillingPlan,
} from "@/lib/billing-plans";

type SettingsTab = "profile" | "domains" | "plan" | "invoices";

type ProfileResponse = {
  name?: string | null;
  occupation?: string | null;
  phone?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  companyName?: string | null;
  industry?: string | null;
  industryArea?: string | null;
  averageEventsPerYear?: string | null;
  billingCompanyName?: string | null;
  taxNumber?: string | null;
  avatarUrl?: string | null;
  socialAccounts?: Array<{ platform?: string | null; url?: string | null }> | null;
};

type GallerySummary = {
  id: string;
  name: string;
  filesCount?: number | null;
  photosCount?: number | null;
  published?: boolean | null;
};

type GalleriesPayload = {
  items?: GallerySummary[];
  galleries?: GallerySummary[];
};

type CustomDomainRecord = {
  id: string;
  domain: string;
  status: string;
  verified: boolean;
  verifiedAt: string | null;
  lastCheckedAt: string | null;
  records: {
    txt: { type: string; name: string; value: string };
    cname: { type: string; name: string; value: string };
  };
};

type BillingPlanKey = "free" | "starter" | "studio" | "elite" | "scale";

type BillingState = {
  plan: BillingPlanKey;
  planLabel: string;
  status: string;
  provider: "manual" | "razorpay" | "stripe";
  interval: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  usage: {
    galleries: number;
    photos: number;
  };
  limits: {
    galleryLimit: number;
    photoLimit: number;
    storageLimitGb: number;
    customDomains: boolean;
    customDomainLimit: number;
    prioritySupport: boolean;
  };
  hasStripeCustomer: boolean;
  hasRazorpayCustomer: boolean;
  hasRazorpaySubscription: boolean;
};

type BillingConfig = {
  razorpay?: {
    keyConfigured: boolean;
    webhookConfigured: boolean;
    plans: Record<Exclude<BillingPlanKey, "free">, Record<"monthly" | "yearly", boolean>>;
  };
};

type SettingsItem = {
  key: SettingsTab;
  label: string;
  description: string;
  icon: typeof UserRound;
};

const tabs: SettingsItem[] = [
  { key: "profile", label: "Profile", description: "Studio identity", icon: UserRound },
  { key: "domains", label: "Domains", description: "Public links", icon: Globe2 },
  { key: "plan", label: "My Plan", description: "Subscription", icon: BadgeDollarSign },
  { key: "invoices", label: "Invoices", description: "Billing history", icon: ReceiptText },
];

const IMAGE_LIMIT = 1000;

const PLAN_OPTIONS = PAID_BILLING_PLAN_CARDS;
const INDUSTRY_OPTIONS = ["Photographer", "Videographer", "Photo Studio", "Event Agency", "Creative Agency", "Other"];
const INDUSTRY_AREA_OPTIONS = ["Freelancer", "Wedding", "Events", "Portraits", "Corporate", "School", "Fashion"];
const EVENTS_PER_YEAR_OPTIONS = ["Less Than 10", "10 - 25", "26 - 50", "51 - 100", "100+"];

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayCheckout() {
  return new Promise<void>((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Unable to load Razorpay checkout.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Razorpay checkout."));
    document.head.appendChild(script);
  });
}

type ProfileDraft = {
  name: string;
  occupation: string;
  phone: string;
  country: string;
  state: string;
  city: string;
  companyName: string;
  industry: string;
  industryArea: string;
  averageEventsPerYear: string;
  billingCompanyName: string;
  taxNumber: string;
};

function toDraft(profile: ProfileResponse | null): ProfileDraft {
  return {
    name: profile?.name ?? "",
    occupation: profile?.occupation ?? "",
    phone: profile?.phone ?? "",
    country: profile?.country ?? "",
    state: profile?.state ?? "",
    city: profile?.city ?? "",
    companyName: profile?.companyName ?? "",
    industry: profile?.industry ?? "Photographer",
    industryArea: profile?.industryArea ?? "",
    averageEventsPerYear: profile?.averageEventsPerYear ?? "",
    billingCompanyName: profile?.billingCompanyName ?? "",
    taxNumber: profile?.taxNumber ?? "",
  };
}

function formatValue(value: string | null | undefined, fallback = "Not configured") {
  const next = String(value ?? "").trim();
  return next || fallback;
}

function toStudioSlug(seed: string) {
  const cleaned = seed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned || "your-studio";
}

function initialsFromEmail(email: string) {
  const local = email.split("@")[0] ?? "";
  const initials = local
    .split(/[._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return initials || "PX";
}

function getGalleryItems(payload: GalleriesPayload) {
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.galleries)) return payload.galleries;
  return [];
}

function SettingButton({
  active,
  item,
  onClick,
}: {
  active: boolean;
  item: SettingsItem;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
        active
          ? "border-[#7a3f13] bg-[#fff3e7] text-[#2a170d] shadow-[0_10px_24px_rgba(122,63,19,0.10)]"
          : "border-transparent text-[#4f6d63] hover:border-[#e7d8c8] hover:bg-[#fffaf4]"
      }`}
    >
      <span
        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          active ? "bg-[#7a3f13] text-white" : "bg-[#f4eadf] text-[#5f3b22] group-hover:bg-white"
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{item.label}</span>
        <span className="block truncate text-xs text-[#7a6a55]">{item.description}</span>
      </span>
    </button>
  );
}

function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-[#eadccf] bg-white shadow-[0_14px_34px_rgba(73,39,20,0.06)]">
      <div className="flex flex-col gap-3 border-b border-[#f0e4d7] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#2a170d]">{title}</h2>
          {description ? <p className="mt-1 text-sm text-[#7a6a55]">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function FieldView({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: typeof UserRound;
}) {
  const Icon = icon;
  return (
    <div className="rounded-2xl border border-[#eadccf] bg-[#fffdf8] p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#7a6a55]">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-3 break-words text-sm font-semibold text-[#2a170d]">{value}</p>
    </div>
  );
}

function SettingsInput({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  type = "text",
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold text-[#5f4a39]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="h-12 w-full rounded-lg border border-[#e7d8c8] bg-white px-4 text-sm text-[#2a170d] shadow-sm outline-none transition placeholder:text-[#a38d78] focus:border-[#7a3f13] focus:shadow-[0_0_0_4px_rgba(122,63,19,0.10)] disabled:bg-[#ecebf0] disabled:text-[#6d6872]"
      />
    </label>
  );
}

function SettingsSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Select option",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold text-[#5f4a39]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-lg border border-[#e7d8c8] bg-white px-4 text-sm text-[#2a170d] shadow-sm outline-none transition focus:border-[#7a3f13] focus:shadow-[0_0_0_4px_rgba(122,63,19,0.10)]"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function UsageBar({ used, limit }: { used: number; limit: number }) {
  const percentage = Math.min(100, Math.round((used / limit) * 100));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold text-[#2a170d]">Images</span>
        <span className="text-[#6b7f78]">
          {used} of {limit}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-[#f1e7dc]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#17352e,#7a3f13)] transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [draft, setDraft] = useState<ProfileDraft>(() => toDraft(null));
  const [accountEmail, setAccountEmail] = useState("");
  const [galleries, setGalleries] = useState<GallerySummary[]>([]);
  const [customDomains, setCustomDomains] = useState<CustomDomainRecord[]>([]);
  const [domainInput, setDomainInput] = useState("");
  const [domainBusy, setDomainBusy] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [billing, setBilling] = useState<BillingState | null>(null);
  const [billingConfig, setBillingConfig] = useState<BillingConfig | null>(null);
  const [billingBusy, setBillingBusy] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const params = new URLSearchParams(window.location.search);
    const requestedTab = params.get("tab");
    if (requestedTab === "profile" || requestedTab === "domains" || requestedTab === "plan" || requestedTab === "invoices") {
      setActiveTab(requestedTab);
    }

    const load = async () => {
      try {
        const [profileRes, meRes, galleriesRes, domainsRes, billingRes] = await Promise.all([
          fetchWithRetry("/api/auth/profile", { cache: "no-store" }, { dedupeKey: "settings:profile" }),
          fetchWithRetry("/api/auth/me", { cache: "no-store" }, { dedupeKey: "settings:me" }),
          fetchWithRetry("/api/galleries?metrics=0", { cache: "no-store" }, { dedupeKey: "settings:galleries:fast" }),
          fetchWithRetry("/api/custom-domains", { cache: "no-store" }, { dedupeKey: "settings:custom-domains" }),
          fetchWithRetry("/api/billing/status", { cache: "no-store" }, { dedupeKey: "settings:billing" }),
        ]);

        if (!active) return;

        if (profileRes.ok) {
          const profileData = (await profileRes.json()) as { profile?: ProfileResponse | null };
          const nextProfile = profileData.profile ?? null;
          setProfile(nextProfile);
          setDraft(toDraft(nextProfile));
        }

        if (meRes.ok) {
          const meData = (await meRes.json()) as { email?: string };
          setAccountEmail(String(meData.email ?? "").trim().toLowerCase());
        }

        if (galleriesRes.ok) {
          const payload = (await galleriesRes.json()) as GalleriesPayload;
          setGalleries(getGalleryItems(payload));
        }

        if (domainsRes.ok) {
          const payload = (await domainsRes.json()) as { domains?: CustomDomainRecord[] };
          setCustomDomains(Array.isArray(payload.domains) ? payload.domains : []);
        }

        if (billingRes.ok) {
          const payload = (await billingRes.json()) as { billing?: BillingState; billingConfig?: BillingConfig };
          setBilling(payload.billing ?? null);
          setBillingConfig(payload.billingConfig ?? null);
        }
      } catch {
        // Empty states below keep the page usable if any summary request fails.
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const imageCount = useMemo(
    () => galleries.reduce((sum, gallery) => sum + Number(gallery.photosCount ?? gallery.filesCount ?? 0), 0),
    [galleries]
  );
  const publishedCount = useMemo(() => galleries.filter((gallery) => gallery.published !== false).length, [galleries]);
  const studioSlug = useMemo(
    () => toStudioSlug(profile?.name || accountEmail || "your-studio"),
    [accountEmail, profile?.name]
  );
  const displayName = formatValue(profile?.name, accountEmail ? accountEmail.split("@")[0] : "Pixora Studio");
  const initials = initialsFromEmail(accountEmail || displayName);
  const activeLabel = tabs.find((tab) => tab.key === activeTab)?.label ?? "Settings";

  const updateDraft = (key: keyof ProfileDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const saveProfileDetails = useCallback(async () => {
    if (savingProfile) return;
    setSavingProfile(true);
    try {
      const response = await fetchWithRetry("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      }, { dedupeKey: `settings:profile:save:${accountEmail || "account"}` });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; profile?: ProfileResponse; message?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Unable to save profile details.");
      }
      const nextProfile = data.profile ?? null;
      setProfile(nextProfile);
      setDraft(toDraft(nextProfile));
      void showPixoraToast({ title: "Profile details saved" });
    } catch (error) {
      void showPixoraAlert({
        title: "Settings need attention",
        text: error instanceof Error ? error.message : "Unable to save profile details.",
        icon: "error",
      });
    } finally {
      setSavingProfile(false);
    }
  }, [accountEmail, draft, savingProfile]);

  const createCustomDomain = useCallback(async () => {
    if (domainBusy) return;
    setDomainBusy(true);
    try {
      const response = await fetchWithRetry("/api/custom-domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domainInput }),
      }, { dedupeKey: `settings:custom-domain:create:${domainInput}` });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; domain?: CustomDomainRecord; message?: string };
      if (!response.ok || !data.ok || !data.domain) {
        throw new Error(data.message || "Unable to add custom domain.");
      }
      setCustomDomains((current) => [data.domain!, ...current.filter((entry) => entry.id !== data.domain!.id)]);
      setDomainInput("");
      void showPixoraToast({ title: "DNS records generated" });
    } catch (error) {
      void showPixoraAlert({
        title: "Domain needs attention",
        text: error instanceof Error ? error.message : "Unable to add custom domain.",
        icon: "error",
      });
    } finally {
      setDomainBusy(false);
    }
  }, [domainBusy, domainInput]);

  const verifyCustomDomain = useCallback(async (id: string) => {
    if (domainBusy) return;
    setDomainBusy(true);
    try {
      const response = await fetchWithRetry("/api/custom-domains/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      }, { dedupeKey: `settings:custom-domain:verify:${id}:${Date.now()}` });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        domain?: Partial<CustomDomainRecord> & { id: string };
        message?: string;
      };
      if (data.domain) {
        setCustomDomains((current) =>
          current.map((entry) =>
            entry.id === data.domain?.id
              ? {
                  ...entry,
                  status: data.domain.status ?? entry.status,
                  verified: Boolean(data.ok),
                  verifiedAt: data.domain.verifiedAt ?? entry.verifiedAt,
                  lastCheckedAt: data.domain.lastCheckedAt ?? entry.lastCheckedAt,
                }
              : entry
          )
        );
      }
      if (!response.ok || !data.ok) {
        throw new Error(data.message || "DNS records are not ready yet.");
      }
      void showPixoraToast({ title: "Custom domain verified" });
    } catch (error) {
      void showPixoraAlert({
        title: "Domain not verified yet",
        text: error instanceof Error ? error.message : "Check TXT and CNAME records, then try again.",
        icon: "info",
      });
    } finally {
      setDomainBusy(false);
    }
  }, [domainBusy]);

  const deleteCustomDomain = useCallback(async (id: string) => {
    if (domainBusy) return;
    setDomainBusy(true);
    try {
      const response = await fetchWithRetry("/api/custom-domains", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      }, { dedupeKey: `settings:custom-domain:delete:${id}` });
      if (!response.ok) throw new Error("Unable to remove custom domain.");
      setCustomDomains((current) => current.filter((entry) => entry.id !== id));
      void showPixoraToast({ title: "Custom domain removed" });
    } catch (error) {
      void showPixoraAlert({
        title: "Domain needs attention",
        text: error instanceof Error ? error.message : "Unable to remove custom domain.",
        icon: "error",
      });
    } finally {
      setDomainBusy(false);
    }
  }, [domainBusy]);

  const refreshBilling = useCallback(async () => {
    const response = await fetchWithRetry("/api/billing/status", { cache: "no-store" }, { dedupeKey: `settings:billing:${Date.now()}` });
    if (!response.ok) return;
    const payload = (await response.json().catch(() => ({}))) as { billing?: BillingState; billingConfig?: BillingConfig };
    setBilling(payload.billing ?? null);
    setBillingConfig(payload.billingConfig ?? null);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("billing");
    if (result === "success") {
      void showPixoraToast({ title: "Checkout completed" });
      void refreshBilling();
    }
    if (result === "cancelled") {
      void showPixoraToast({ title: "Checkout cancelled" });
    }
  }, [refreshBilling]);

  const startCheckout = useCallback(async (plan: PaidBillingPlan, interval: "monthly" | "yearly") => {
    if (billingBusy) return;
    setBillingBusy(`${plan}:${interval}`);
    try {
      const response = await fetchWithRetry("/api/billing/razorpay/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval }),
      }, { dedupeKey: `settings:billing:razorpay:checkout:${plan}:${interval}` });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        keyId?: string;
        subscriptionId?: string;
        email?: string;
        message?: string;
      };
      if (!response.ok || !data.ok || !data.keyId || !data.subscriptionId) {
        throw new Error(data.message || "Unable to start Razorpay checkout.");
      }
      await loadRazorpayCheckout();
      const RazorpayCheckout = window.Razorpay;
      if (!RazorpayCheckout) throw new Error("Razorpay checkout is not available.");
      const checkout = new RazorpayCheckout({
        key: data.keyId,
        name: "Pixora",
        description: `${plan} ${interval} subscription`,
        subscription_id: data.subscriptionId,
        prefill: {
          email: data.email || accountEmail,
        },
        notes: {
          plan,
          interval,
        },
        handler: async (payment: Record<string, unknown>) => {
          try {
            const verifyResponse = await fetchWithRetry("/api/billing/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...payment, plan, interval }),
            }, { dedupeKey: `settings:billing:razorpay:verify:${data.subscriptionId}` });
            const verifyData = (await verifyResponse.json().catch(() => ({}))) as { ok?: boolean; message?: string };
            if (!verifyResponse.ok || !verifyData.ok) {
              throw new Error(verifyData.message || "Unable to verify Razorpay payment.");
            }
            void showPixoraToast({ title: "Razorpay checkout completed" });
            void refreshBilling();
          } catch (error) {
            void showPixoraAlert({
              title: "Payment verification needs attention",
              text: error instanceof Error ? error.message : "Unable to verify Razorpay payment.",
              icon: "error",
            });
          }
        },
        modal: {
          ondismiss: () => {
            void showPixoraToast({ title: "Checkout cancelled" });
          },
        },
        theme: {
          color: "#2d333b",
        },
      });
      checkout.open();
    } catch (error) {
      void showPixoraAlert({
        title: "Checkout needs attention",
        text: error instanceof Error ? error.message : "Unable to start Razorpay checkout.",
        icon: "error",
      });
    } finally {
      setBillingBusy(null);
    }
  }, [accountEmail, billingBusy, refreshBilling]);

  const openBillingPortal = useCallback(async () => {
    if (billingBusy) return;
    setBillingBusy("portal");
    try {
      const response = await fetchWithRetry("/api/billing/portal", {
        method: "POST",
      }, { dedupeKey: "settings:billing:portal" });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; url?: string; message?: string };
      if (!response.ok || !data.ok || !data.url) {
        throw new Error(data.message || "Unable to open Stripe billing portal.");
      }
      window.location.assign(data.url);
    } catch (error) {
      void showPixoraAlert({
        title: "Billing portal needs attention",
        text: error instanceof Error ? error.message : "Upgrade once before opening the Stripe billing portal.",
        icon: "info",
      });
    } finally {
      setBillingBusy(null);
    }
  }, [billingBusy]);

  const copyValue = useCallback((value: string) => {
    void navigator.clipboard?.writeText(value);
    void showPixoraToast({ title: "Copied" });
  }, []);

  const tabContent = useMemo(() => {
    if (activeTab === "plan") {
      const planLabel = billing?.planLabel ?? "Free";
      const planStatus = billing?.status ?? "inactive";
      const planImageLimit = billing?.limits.photoLimit ?? IMAGE_LIMIT;
      const planGalleryLimit = billing?.limits.galleryLimit ?? 1;
      const planStorageLimit = billing?.limits.storageLimitGb ?? 2;
      const planImageCount = billing?.usage.photos ?? imageCount;
      const planGalleryCount = billing?.usage.galleries ?? galleries.length;
      const galleriesLeft = Math.max(0, planGalleryLimit - planGalleryCount);
      const renewalDate = billing?.currentPeriodEnd
        ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(billing.currentPeriodEnd))
        : "Not scheduled";
      const razorpayReady = Boolean(billingConfig?.razorpay?.keyConfigured);

      return (
        <div className="space-y-6">
            <SectionCard
              title="My Active Plan"
            description="Live subscription, usage, and India-first billing controls."
            action={
              <button
                type="button"
                onClick={() => void openBillingPortal()}
                disabled={billingBusy === "portal" || !billing?.hasStripeCustomer}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-[#e9e9e9] px-5 text-sm font-semibold text-[#35413d] transition hover:bg-[#dedede] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {billingBusy === "portal" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                Stripe portal
              </button>
            }
          >
            <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
              <div className="flex items-center gap-4">
                <div className="inline-flex h-18 w-18 items-center justify-center rounded-3xl bg-[#e8f3ff] text-[#1f5c8f]">
                  <Crown className="h-9 w-9" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#e9f8ef] px-2.5 py-1 text-xs font-bold uppercase tracking-[0.24em] text-[#0b8b32]">
                    {planStatus}
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-[#2a170d]">{planLabel}</p>
                  <p className="text-sm text-[#7a6a55]">
                    {billing?.cancelAtPeriodEnd ? "Cancels on" : "Renews on"} {renewalDate}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#7a6a55]">
                    Provider: {billing?.provider === "razorpay" ? "Razorpay" : billing?.provider === "stripe" ? "Stripe" : "Manual"}
                  </p>
                </div>
              </div>
              <div className="flex flex-col justify-center">
                <UsageBar used={planImageCount} limit={planImageLimit} />
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <FieldView label="Events" value={`${planGalleryCount} of ${planGalleryLimit}`} icon={IdCard} />
                  <FieldView label="Published" value={`${publishedCount} live`} icon={CheckCircle2} />
                  <FieldView label="Storage" value={`${planStorageLimit} GB included`} icon={ImageIcon} />
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 border-t border-[#f0e4d7] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#556660]">
                {galleriesLeft} events left. Custom domains: {billing?.limits.customDomainLimit ?? 0} included.
              </p>
              <div className="flex items-center gap-3 text-sm text-[#556660]">
                <span>Custom needs?</span>
                <button className="h-11 rounded-full bg-[#e9e9e9] px-5 font-semibold text-[#35413d] transition hover:bg-[#dedede]">
                  Contact sales
                </button>
              </div>
            </div>
          </SectionCard>

          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            {PLAN_OPTIONS.map((plan) => {
              const monthlyBusy = billingBusy === `${plan.key}:monthly`;
              const yearlyBusy = billingBusy === `${plan.key}:yearly`;
              const current = billing?.plan === plan.key;
              const yearlyConfigured = Boolean(billingConfig?.razorpay?.plans?.[plan.key]?.yearly);
              const monthlyConfigured = Boolean(billingConfig?.razorpay?.plans?.[plan.key]?.monthly);
              return (
                <section
                  key={plan.key}
                  className={`rounded-3xl border bg-white p-5 shadow-[0_14px_34px_rgba(73,39,20,0.06)] ${
                    plan.highlight ? "border-[#7a3f13] ring-2 ring-[#7a3f13]/15" : "border-[#eadccf]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-[#2a170d]">{plan.name}</p>
                      <p className="mt-1 text-sm text-[#7a6a55]">{plan.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {plan.highlight ? <span className="rounded-full bg-[#fff3e7] px-3 py-1 text-xs font-semibold text-[#7a3f13]">{plan.highlight}</span> : null}
                      {current ? <span className="rounded-full bg-[#e4f7ed] px-3 py-1 text-xs font-semibold text-[#147844]">Current</span> : null}
                    </div>
                  </div>
                  <p className="mt-5 text-2xl font-semibold text-[#2a170d]">{plan.monthlyInr}</p>
                  <p className="mt-1 text-sm font-medium text-[#7a6a55]">
                    Global: {plan.monthlyUsd} or {plan.yearlyUsd}
                  </p>
                  <p className="mt-3 rounded-2xl border border-[#f0e4d7] bg-[#fffaf4] px-3 py-2 text-sm font-semibold text-[#7a3f13]">
                    Yearly: {plan.yearlyInr} - 2 months free
                  </p>
                  <button
                    type="button"
                    onClick={() => void startCheckout(plan.key, "yearly")}
                    disabled={yearlyBusy || current || !razorpayReady || !yearlyConfigured}
                    className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#2d333b] px-5 text-sm font-semibold text-white transition hover:bg-[#17211d] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {yearlyBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
                    {current ? "Active plan" : yearlyConfigured && razorpayReady ? "Razorpay yearly" : "Setup needed"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void startCheckout(plan.key, "monthly")}
                    disabled={monthlyBusy || current || !razorpayReady || !monthlyConfigured}
                    className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-[#d8c5b2] bg-white px-5 text-sm font-semibold text-[#2a170d] transition hover:bg-[#fffaf4] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {monthlyBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {monthlyConfigured && razorpayReady ? "Razorpay monthly" : "Setup needed"}
                  </button>
                </section>
              );
            })}
          </div>

          <section className="rounded-3xl border border-[#eadccf] bg-white p-5 shadow-[0_14px_34px_rgba(73,39,20,0.06)]">
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-lg font-semibold text-[#2a170d]">{ENTERPRISE_PLAN.name} / Enterprise</p>
                <p className="mt-1 text-sm text-[#7a6a55]">{ENTERPRISE_PLAN.description}</p>
                <p className="mt-2 text-sm font-semibold text-[#7a3f13]">{PHOTO_OVERAGE_COPY}</p>
              </div>
              <p className="text-2xl font-semibold text-[#2a170d]">{ENTERPRISE_PLAN.price}</p>
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-[#272341] bg-[linear-gradient(120deg,#07052a_0%,#292741_52%,#8b8b8b_100%)] p-6 text-white shadow-[0_18px_40px_rgba(20,18,50,0.24)]">
            <div className="grid gap-6 md:grid-cols-[1fr_auto_1fr] md:items-center">
              <div className="flex items-center gap-4">
                <Sparkles className="h-8 w-8 text-[#ffc33d]" />
                <div>
                  <p className="text-3xl font-semibold text-[#ffc33d]">Subscription gating is live</p>
                  <p className="mt-2 text-sm text-white/75">Razorpay controls India paid beta access; Stripe stays ready for global billing.</p>
                </div>
              </div>
              <div className="hidden h-24 w-px bg-white/50 md:block" />
              <div className="flex flex-col gap-4 md:items-center">
                <p className="text-lg font-semibold text-white/85">Use Razorpay for INR subscriptions. Stripe portal appears for global-card subscriptions.</p>
                <button
                  type="button"
                  onClick={() => void openBillingPortal()}
                  disabled={billingBusy === "portal" || !billing?.hasStripeCustomer}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#ffc33d] px-6 text-sm font-semibold text-[#2a170d] transition hover:bg-[#ffd46d] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Zap className="h-4 w-4" />
                  Manage billing
                </button>
              </div>
            </div>
          </section>
        </div>
      );
    }

    if (activeTab === "profile") {
      return (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard title="Personal Details" description="Primary contact information shown across Pixora.">
              <div className="grid gap-4 sm:grid-cols-2">
                <SettingsInput label="Full Name" value={draft.name} onChange={(value) => updateDraft("name", value)} placeholder="Your full name" />
                <SettingsInput label="Email Id" value={formatValue(accountEmail, "Signed in email")} disabled />
                <SettingsInput label="Mobile Number" value={draft.phone} onChange={(value) => updateDraft("phone", value)} placeholder="+91 98765 43210" />
                <SettingsInput label="Role / Occupation" value={draft.occupation} onChange={(value) => updateDraft("occupation", value)} placeholder="Wedding photographer" />
                <SettingsInput label="Country" value={draft.country} onChange={(value) => updateDraft("country", value)} placeholder="India" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <SettingsInput label="State" value={draft.state} onChange={(value) => updateDraft("state", value)} placeholder="Uttar Pradesh" />
                  <SettingsInput label="City" value={draft.city} onChange={(value) => updateDraft("city", value)} placeholder="Noida" />
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Company Details" description="Studio profile information for operations and client trust.">
              <div className="grid gap-4">
                <SettingsInput label="Company Name" value={draft.companyName} onChange={(value) => updateDraft("companyName", value)} placeholder="Studio name" />
                <SettingsSelect label="Industry" value={draft.industry} onChange={(value) => updateDraft("industry", value)} options={INDUSTRY_OPTIONS} />
                <SettingsSelect label="Area" value={draft.industryArea} onChange={(value) => updateDraft("industryArea", value)} options={INDUSTRY_AREA_OPTIONS} placeholder="Select industry area" />
                {draft.industryArea ? (
                  <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#169b63] px-3 py-1.5 text-xs font-semibold text-white">
                    {draft.industryArea}
                    <button type="button" onClick={() => updateDraft("industryArea", "")} className="text-white/90" aria-label="Clear industry area">
                      x
                    </button>
                  </div>
                ) : null}
                <SettingsSelect
                  label="Average Number of Events per Year"
                  value={draft.averageEventsPerYear}
                  onChange={(value) => updateDraft("averageEventsPerYear", value)}
                  options={EVENTS_PER_YEAR_OPTIONS}
                />
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Billing Details" description="Optional legal and tax information for invoices.">
            <div className="grid gap-4 lg:grid-cols-2">
              <SettingsInput
                label="Company Name (As Per Official GST/VAT Document)"
                value={draft.billingCompanyName}
                onChange={(value) => updateDraft("billingCompanyName", value)}
                placeholder="Registered company name"
              />
              <SettingsInput label="GST/VAT Number" value={draft.taxNumber} onChange={(value) => updateDraft("taxNumber", value)} placeholder="GST or VAT number" />
            </div>
          </SectionCard>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void saveProfileDetails()}
              disabled={savingProfile}
              className="inline-flex h-12 min-w-36 items-center justify-center gap-2 rounded-full bg-[#2d333b] px-7 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(42,23,13,0.16)] transition hover:bg-[#17211d] disabled:cursor-not-allowed disabled:opacity-65"
            >
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {savingProfile ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      );
    }

    if (activeTab === "domains") {
      const primaryDomain = customDomains[0] ?? null;
      return (
        <div className="space-y-6">
          <SectionCard title="Pixora Domain" description="Your fast launch URL.">
            <FieldView label="Hosted URL" value={`pixdrive.site/studio/${studioSlug}`} icon={Globe2} />
            <p className="mt-4 text-sm text-[#6b7f78]">Use this while your custom domain and DNS are prepared.</p>
          </SectionCard>

          <SectionCard title="Custom Domain" description="Let clients open your studio selector and galleries on your own domain.">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <SettingsInput
                label="Domain"
                value={domainInput}
                onChange={setDomainInput}
                placeholder="gallery.yourstudio.com"
              />
              <button
                type="button"
                onClick={() => void createCustomDomain()}
                disabled={domainBusy || !domainInput.trim()}
                className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-[#2d333b] px-6 text-sm font-semibold text-white transition hover:bg-[#17211d] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Connect Domain
              </button>
            </div>

            {primaryDomain ? (
              <div className="mt-6 rounded-lg border border-[#eadccf] bg-[#fffaf4] p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-[#2a170d]">{primaryDomain.domain}</p>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${
                          primaryDomain.verified
                            ? "bg-[#e4f7ed] text-[#147844]"
                            : "bg-[#fff0d8] text-[#94610c]"
                        }`}
                      >
                        {primaryDomain.verified ? "Verified" : primaryDomain.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[#7a6a55]">
                      {primaryDomain.verified
                        ? `Client galleries can now open at https://${primaryDomain.domain}`
                        : "Add the DNS records below, wait for propagation, then verify."}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void verifyCustomDomain(primaryDomain.id)}
                      disabled={domainBusy}
                      className="inline-flex h-10 items-center gap-2 rounded-full border border-[#d8c5b2] bg-white px-4 text-sm font-semibold text-[#2a170d] disabled:opacity-60"
                    >
                      <RefreshCw className={`h-4 w-4 ${domainBusy ? "animate-spin" : ""}`} />
                      Verify
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteCustomDomain(primaryDomain.id)}
                      disabled={domainBusy}
                      className="inline-flex h-10 items-center justify-center rounded-full border border-[#f2c9c9] bg-white px-3 text-[#b42318] disabled:opacity-60"
                      aria-label="Remove custom domain"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  {[primaryDomain.records.txt, primaryDomain.records.cname].map((record) => (
                    <div key={`${record.type}:${record.name}`} className="rounded-lg border border-[#eadccf] bg-white p-4">
                      <div className="grid gap-3 lg:grid-cols-[90px_minmax(0,1fr)_minmax(0,1.4fr)] lg:items-center">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7a3f13]">{record.type}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#7a6a55]">Name</p>
                          <button
                            type="button"
                            onClick={() => copyValue(record.name)}
                            className="mt-1 inline-flex max-w-full items-center gap-2 text-left text-sm font-semibold text-[#2a170d]"
                          >
                            <span className="truncate">{record.name}</span>
                            <Copy className="h-3.5 w-3.5 shrink-0" />
                          </button>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#7a6a55]">Value</p>
                          <button
                            type="button"
                            onClick={() => copyValue(record.value)}
                            className="mt-1 inline-flex max-w-full items-center gap-2 text-left text-sm font-semibold text-[#2a170d]"
                          >
                            <span className="truncate">{record.value || "Set CUSTOM_DOMAIN_CNAME_TARGET in production"}</span>
                            <Copy className="h-3.5 w-3.5 shrink-0" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-lg border border-dashed border-[#d7c6b5] bg-[#fffaf4] p-5">
                <p className="text-sm font-semibold text-[#2a170d]">No custom domain connected</p>
                <p className="mt-1 text-sm text-[#7a6a55]">
                  Use a subdomain like gallery.yourstudio.com. Root/apex domains need DNS flattening from your provider.
                </p>
              </div>
            )}
          </SectionCard>
        </div>
      );
    }

    return (
      <SectionCard
        title="Invoices"
        description="Razorpay handles India receipts. Stripe portal is available only for global-card subscriptions."
        action={
          <button
            type="button"
            onClick={() => void openBillingPortal()}
            disabled={billingBusy === "portal" || !billing?.hasStripeCustomer}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-[#2d333b] px-5 text-sm font-semibold text-white transition hover:bg-[#17211d] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {billingBusy === "portal" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
            Open Stripe portal
          </button>
        }
      >
        <div className="rounded-2xl border border-dashed border-[#d7c6b5] bg-[#fffaf4] p-6 text-center">
          <ClipboardList className="mx-auto h-8 w-8 text-[#7a3f13]" />
          <p className="mt-3 text-sm font-semibold text-[#2a170d]">Billing receipts</p>
          <p className="mt-1 text-sm text-[#7a6a55]">Razorpay sends India subscription receipts after successful payments. Stripe invoices appear here for global-card customers.</p>
        </div>
      </SectionCard>
    );
  }, [
    accountEmail,
    activeTab,
    billing,
    billingConfig,
    billingBusy,
    copyValue,
    createCustomDomain,
    customDomains,
    deleteCustomDomain,
    domainBusy,
    domainInput,
    draft,
    galleries.length,
    imageCount,
    openBillingPortal,
    publishedCount,
    saveProfileDetails,
    savingProfile,
    studioSlug,
    startCheckout,
    verifyCustomDomain,
  ]);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-[#eadccf] bg-white/90 p-5 shadow-[0_14px_34px_rgba(73,39,20,0.06)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7a3f13]">Settings</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#2a170d]">{activeLabel}</h1>
          <p className="mt-1 text-sm text-[#7a6a55]">Manage your Pixora account, plan, domains, and billing.</p>
        </div>
        <div className="min-w-60 rounded-2xl border border-[#eadccf] bg-[#fffaf4] p-4">
          <div className="flex items-center gap-3">
            <ImageIcon className="h-5 w-5 text-[#2a170d]" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#2a170d]">{billing?.usage.photos ?? imageCount} images</p>
              <p className="text-xs text-[#7a6a55]">of {billing?.limits.photoLimit ?? IMAGE_LIMIT} images used</p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#eadccf]">
            <div
              className="h-full rounded-full bg-[#2a3338]"
              style={{
                width: `${Math.min(
                  100,
                  Math.round(((billing?.usage.photos ?? imageCount) / (billing?.limits.photoLimit ?? IMAGE_LIMIT)) * 100)
                )}%`,
              }}
            />
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-[#eadccf] bg-white/92 p-4 shadow-[0_14px_34px_rgba(73,39,20,0.06)]">
          <div className="flex items-center gap-3 border-b border-[#f0e4d7] pb-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2a170d] text-sm font-semibold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#2a170d]">{displayName}</p>
              <p className="truncate text-xs text-[#7a6a55]">{formatValue(accountEmail, "Signed in")}</p>
            </div>
          </div>
          <nav className="mt-4 space-y-2">
            {tabs.map((item) => (
              <SettingButton key={item.key} item={item} active={activeTab === item.key} onClick={() => setActiveTab(item.key)} />
            ))}
          </nav>
        </aside>

        <main className="min-w-0">{tabContent}</main>
      </div>
    </div>
  );
}
