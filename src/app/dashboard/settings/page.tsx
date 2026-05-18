"use client";

import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import fetchWithRetry from "@/lib/fetchWithRetry";
import {
  BadgeDollarSign,
  Bell,
  Brush,
  CheckCircle2,
  ClipboardList,
  Crown,
  Globe2,
  IdCard,
  Image as ImageIcon,
  Loader2,
  Network,
  Palette,
  Plug,
  QrCode,
  ReceiptText,
  Save,
  ShieldCheck,
  Sparkles,
  UserRound,
  Zap,
} from "lucide-react";
import { showPixoraAlert, showPixoraToast } from "@/lib/pixora-alerts";

type SettingsTab = "profile" | "branding" | "domains" | "one-qr" | "integrations" | "plan" | "invoices";

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

type SettingsItem = {
  key: SettingsTab;
  label: string;
  description: string;
  icon: typeof UserRound;
};

const tabs: SettingsItem[] = [
  { key: "profile", label: "Profile", description: "Studio identity", icon: UserRound },
  { key: "branding", label: "Branding", description: "Logo and theme", icon: Palette },
  { key: "domains", label: "Domains", description: "Public links", icon: Globe2 },
  { key: "one-qr", label: "My One QR", description: "QR destination", icon: QrCode },
  { key: "integrations", label: "Integrations", description: "Connected tools", icon: Plug },
  { key: "plan", label: "My Plan", description: "Subscription", icon: BadgeDollarSign },
  { key: "invoices", label: "Invoices", description: "Billing history", icon: ReceiptText },
];

const IMAGE_LIMIT = 1000;

const INDUSTRY_OPTIONS = ["Photographer", "Videographer", "Photo Studio", "Event Agency", "Creative Agency", "Other"];
const INDUSTRY_AREA_OPTIONS = ["Freelancer", "Wedding", "Events", "Portraits", "Corporate", "School", "Fashion"];
const EVENTS_PER_YEAR_OPTIONS = ["Less Than 10", "10 - 25", "26 - 50", "51 - 100", "100+"];

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
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [profileRes, meRes, galleriesRes] = await Promise.all([
          fetchWithRetry("/api/auth/profile", { cache: "no-store" }, { dedupeKey: "settings:profile" }),
          fetchWithRetry("/api/auth/me", { cache: "no-store" }, { dedupeKey: "settings:me" }),
          fetchWithRetry("/api/galleries", { cache: "no-store" }, { dedupeKey: "settings:galleries" }),
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

  const tabContent = useMemo(() => {
    if (activeTab === "plan") {
      return (
        <div className="space-y-6">
          <SectionCard
            title="My Active Plan"
            description="A launch-ready plan summary for usage, billing, and upgrade decisions."
            action={
              <button className="h-11 rounded-full bg-[#e9e9e9] px-5 text-sm font-semibold text-[#35413d] transition hover:bg-[#dedede]">
                View invoices
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
                    Active
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-[#2a170d]">Rider</p>
                  <p className="text-sm text-[#7a6a55]">Starter production plan</p>
                </div>
              </div>
              <div className="flex flex-col justify-center">
                <UsageBar used={imageCount} limit={IMAGE_LIMIT} />
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <FieldView label="Events" value={`${galleries.length} total`} icon={IdCard} />
                  <FieldView label="Published" value={`${publishedCount} live`} icon={CheckCircle2} />
                  <FieldView label="Storage" value={`${Math.max(0, IMAGE_LIMIT - imageCount)} images left`} icon={ImageIcon} />
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 border-t border-[#f0e4d7] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <button className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#2c333a] px-6 text-sm font-semibold text-white transition hover:bg-[#17211d]">
                <Crown className="h-4 w-4" />
                Upgrade Plan
              </button>
              <div className="flex items-center gap-3 text-sm text-[#556660]">
                <span>Custom needs?</span>
                <button className="h-11 rounded-full bg-[#e9e9e9] px-5 font-semibold text-[#35413d] transition hover:bg-[#dedede]">
                  Contact sales
                </button>
              </div>
            </div>
          </SectionCard>

          <section className="overflow-hidden rounded-3xl border border-[#272341] bg-[linear-gradient(120deg,#07052a_0%,#292741_52%,#8b8b8b_100%)] p-6 text-white shadow-[0_18px_40px_rgba(20,18,50,0.24)]">
            <div className="grid gap-6 md:grid-cols-[1fr_auto_1fr] md:items-center">
              <div className="flex items-center gap-4">
                <Sparkles className="h-8 w-8 text-[#ffc33d]" />
                <div>
                  <p className="text-3xl font-semibold text-[#ffc33d]">Introducing Creator Pass</p>
                  <p className="mt-2 text-sm text-white/75">Advanced AI sorting and client delivery controls.</p>
                </div>
              </div>
              <div className="hidden h-24 w-px bg-white/50 md:block" />
              <div className="flex flex-col gap-4 md:items-center">
                <p className="text-lg font-semibold text-white/85">10,000 free AI face-recognized photo shares</p>
                <button className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#ffc33d] px-6 text-sm font-semibold text-[#2a170d] transition hover:bg-[#ffd46d]">
                  <Zap className="h-4 w-4" />
                  Get Pass
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

    if (activeTab === "branding") {
      return (
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="Brand System" description="Keep gallery delivery aligned with your studio tone.">
            <div className="grid gap-4">
              <FieldView label="Primary Theme" value="Warm editorial" icon={Palette} />
              <FieldView label="Client Gallery" value="Pixora minimal gallery" icon={ImageIcon} />
              <FieldView label="Watermark" value="Ready for upload pipeline" icon={Brush} />
            </div>
          </SectionCard>
          <SectionCard title="Brand Preview" description="Current visual direction for public pages.">
            <div className="rounded-3xl border border-[#eadccf] bg-[linear-gradient(145deg,#fff7ee,#edf7f3)] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#7a3f13]">Pixora Studio</p>
              <h3 className="mt-4 text-3xl font-semibold text-[#2a170d]">{displayName}</h3>
              <p className="mt-2 text-sm text-[#647c73]">Clean client proofing, favorites, delivery, and reviews.</p>
            </div>
          </SectionCard>
        </div>
      );
    }

    if (activeTab === "domains") {
      return (
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="Pixora Domain" description="Your fast launch URL.">
            <FieldView label="Hosted URL" value={`pixdrive.site/studio/${studioSlug}`} icon={Globe2} />
            <p className="mt-4 text-sm text-[#6b7f78]">Use this while your custom domain and DNS are prepared.</p>
          </SectionCard>
          <SectionCard title="Custom Domain" description="Connect your own branded gallery domain.">
            <div className="rounded-2xl border border-dashed border-[#d7c6b5] bg-[#fffaf4] p-4">
              <p className="text-sm font-semibold text-[#2a170d]">No custom domain connected</p>
              <p className="mt-1 text-sm text-[#7a6a55]">Add DNS automation before enabling production domain onboarding.</p>
            </div>
          </SectionCard>
        </div>
      );
    }

    if (activeTab === "one-qr") {
      return (
        <SectionCard title="My One QR" description="Route clients from one QR code to the right event.">
          <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            <div className="flex aspect-square items-center justify-center rounded-3xl border border-[#eadccf] bg-[#fffaf4]">
              <QrCode className="h-24 w-24 text-[#2a170d]" />
            </div>
            <div className="space-y-4">
              <FieldView label="Events attached" value={`${galleries.length} events`} icon={IdCard} />
              <FieldView label="Mode" value="Dynamic gallery routing" icon={Network} />
              <Link href="/dashboard/qr-code" className="inline-flex h-11 items-center rounded-xl bg-[#2a170d] px-5 text-sm font-semibold text-white">
                Manage One QR
              </Link>
            </div>
          </div>
        </SectionCard>
      );
    }

    if (activeTab === "integrations") {
      return (
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            { name: "Resend", detail: "OTP and client email delivery", icon: Bell, status: "Configured by env" },
            { name: "Cloudinary", detail: "Gallery media storage", icon: ImageIcon, status: "Configured by env" },
            { name: "Supabase", detail: "Production PostgreSQL", icon: ShieldCheck, status: "Connected by Prisma" },
          ].map((integration) => {
            const Icon = integration.icon;
            return (
              <SectionCard key={integration.name} title={integration.name} description={integration.detail}>
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4eadf] text-[#7a3f13]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="rounded-full bg-[#edf7f3] px-3 py-1 text-xs font-semibold text-[#2b6659]">
                    {integration.status}
                  </span>
                </div>
              </SectionCard>
            );
          })}
        </div>
      );
    }

    return (
      <SectionCard title="Invoices" description="Billing records will appear here after payment gateway launch.">
        <div className="rounded-2xl border border-dashed border-[#d7c6b5] bg-[#fffaf4] p-6 text-center">
          <ClipboardList className="mx-auto h-8 w-8 text-[#7a3f13]" />
          <p className="mt-3 text-sm font-semibold text-[#2a170d]">No invoices yet</p>
          <p className="mt-1 text-sm text-[#7a6a55]">Stripe or Razorpay invoices can be connected in the billing phase.</p>
        </div>
      </SectionCard>
    );
  }, [accountEmail, activeTab, displayName, draft, galleries.length, imageCount, publishedCount, saveProfileDetails, savingProfile, studioSlug]);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-[#eadccf] bg-white/90 p-5 shadow-[0_14px_34px_rgba(73,39,20,0.06)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7a3f13]">Settings</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#2a170d]">{activeLabel}</h1>
          <p className="mt-1 text-sm text-[#7a6a55]">Manage your Pixora account, plan, branding, domains, and billing.</p>
        </div>
        <div className="min-w-60 rounded-2xl border border-[#eadccf] bg-[#fffaf4] p-4">
          <div className="flex items-center gap-3">
            <ImageIcon className="h-5 w-5 text-[#2a170d]" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#2a170d]">{imageCount} images</p>
              <p className="text-xs text-[#7a6a55]">of {IMAGE_LIMIT} images used</p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#eadccf]">
            <div
              className="h-full rounded-full bg-[#2a3338]"
              style={{ width: `${Math.min(100, Math.round((imageCount / IMAGE_LIMIT) * 100))}%` }}
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
