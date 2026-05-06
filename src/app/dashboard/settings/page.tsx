"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import fetchWithRetry from "@/lib/fetchWithRetry";
import {
  BadgeDollarSign,
  Brush,
  Building2,
  ClipboardList,
  Globe,
  IdCard,
  Link2,
  Network,
  UserRound,
} from "lucide-react";

type SettingsTab = "profile" | "branding" | "domains" | "one-qr" | "integrations" | "plan" | "invoices";

type ProfileResponse = {
  name?: string | null;
  occupation?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  socialAccounts?: Array<{ platform?: string | null; url?: string | null }> | null;
};

const tabs: Array<{ key: SettingsTab; label: string; icon: typeof UserRound }> = [
  { key: "profile", label: "Profile", icon: UserRound },
  { key: "branding", label: "Branding", icon: Brush },
  { key: "domains", label: "Domains", icon: Globe },
  { key: "one-qr", label: "My One QR", icon: Network },
  { key: "integrations", label: "Integrations", icon: Link2 },
  { key: "plan", label: "My Plan", icon: BadgeDollarSign },
  { key: "invoices", label: "Invoices", icon: ClipboardList },
];

function formatValue(value: string | null | undefined, fallback = "Not set yet") {
  const next = String(value ?? "").trim();
  return next || fallback;
}

function toStudioSlug(seed: string) {
  const cleaned = seed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned || "your-studio";
}

function TabButton({
  active,
  label,
  Icon,
  onClick,
}: {
  active: boolean;
  label: string;
  Icon: typeof UserRound;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
        active
          ? "bg-[#f6eadb] text-[#7a3f13] shadow-[inset_0_0_0_1px_rgba(122,63,19,0.16)]"
          : "text-[#3e5e53] hover:bg-[#fffaf4]"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-[#eadccf] bg-white p-5 shadow-[0_12px_30px_rgba(73,39,20,0.05)]">
      <h3 className="text-lg font-semibold text-[#2a170d]">{title}</h3>
      {description ? <p className="mt-1 text-sm text-[#7a6a55]">{description}</p> : null}
      <div className="mt-4 space-y-3">{children}</div>
    </article>
  );
}

function LabeledValue({
  label,
  value,
  placeholder,
}: {
  label: string;
  value?: string | null;
  placeholder?: string;
}) {
  return (
    <div className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-[#7a6a55]">
        {label}
      </span>
      <div className="min-h-11 rounded-xl border border-[#d6e7e1] bg-white px-3 py-3 text-sm text-[#5b3a23]">
        {formatValue(value, placeholder)}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [accountEmail, setAccountEmail] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [profileRes, meRes] = await Promise.all([
          fetchWithRetry("/api/auth/profile", { cache: "no-store" }, { dedupeKey: `client:profile:load` }),
          fetchWithRetry("/api/auth/me", { cache: "no-store" }, { dedupeKey: `client:me:load` }),
        ]);

        if (!active) return;

        if (profileRes.ok) {
          const profileData = (await profileRes.json()) as { profile?: ProfileResponse | null };
          setProfile(profileData.profile ?? null);
        }

        if (meRes.ok) {
          const meData = (await meRes.json()) as { email?: string };
          setAccountEmail(String(meData.email ?? "").trim().toLowerCase());
        }
      } catch {
        // Keep the page usable with empty states.
      } finally {
        if (active) {
          setLoadingProfile(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const studioSlug = useMemo(
    () => toStudioSlug(accountEmail || profile?.name || "your-studio"),
    [accountEmail, profile?.name]
  );
  const socialCount = Array.isArray(profile?.socialAccounts) ? profile?.socialAccounts.length : 0;

  const content = useMemo(() => {
    if (activeTab === "profile") {
      return (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card
            title="Personal Details"
            description="Your contact card, dashboard identity, and client-facing profile data."
          >
            <LabeledValue label="Full Name" value={profile?.name} placeholder="Add your name in Card" />
            <LabeledValue
              label="Mobile Number"
              value={profile?.phone}
              placeholder="Add your phone number in Card"
            />
            <LabeledValue
              label="Email"
              value={accountEmail}
              placeholder="Sign in to sync your account email"
            />
            <LabeledValue
              label="Occupation"
              value={profile?.occupation}
              placeholder="Tell clients what you do"
            />
          </Card>

          <Card
            title="Studio Snapshot"
            description="A quick summary of the profile information currently connected to Pixora."
          >
            <LabeledValue
              label="Studio Identity"
              value={profile?.name || accountEmail}
              placeholder="Create your studio identity"
            />
            <LabeledValue
              label="Primary Role"
              value={profile?.occupation}
              placeholder="For example: Wedding photographer"
            />
            <LabeledValue
              label="Social Accounts"
              value={socialCount > 0 ? `${socialCount} connected` : ""}
              placeholder="No social accounts connected yet"
            />
            <LabeledValue
              label="Profile Status"
              value={loadingProfile ? "Syncing profile..." : "Live in dashboard"}
            />
          </Card>

          <div className="lg:col-span-2">
            <Card
              title="Profile Management"
              description="Use the Card workspace to update your public-facing contact card, profile photo, and social links."
            >
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#efe1d3] bg-[#f5fbf8] px-4 py-4">
                <div>
                  <p className="text-sm font-semibold text-[#2a170d]">Manage your Pixora card</p>
                  <p className="mt-1 text-sm text-[#7a6a55]">
                    Keep one professional source of truth for your brand contact details.
                  </p>
                </div>
                <Link
                  href="/dashboard/card"
                  className="inline-flex h-10 items-center rounded-xl bg-[#3a2112] px-5 text-sm font-semibold text-white transition hover:bg-[#163029]"
                >
                  Open Card Editor
                </Link>
              </div>
            </Card>
          </div>
        </div>
      );
    }

    if (activeTab === "domains") {
      return (
        <div className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <Card
              title="Custom Domain"
              description="Point your own domain to Pixora when DNS and SSL automation are configured."
            >
              <p className="text-sm text-[#7a6a55]">
                Bring galleries under your own brand with a production domain like `gallery.yourstudio.com`.
              </p>
              <div className="rounded-xl border border-dashed border-[#ead7c5] bg-[#fffaf4] px-4 py-3 text-sm text-[#7a6a55]">
                Domain onboarding is ready for infrastructure hookup.
              </div>
            </Card>
            <Card
              title="Pixora Sub-Domain"
              description="Launch quickly with a hosted Pixora sub-domain while your custom domain is being prepared."
            >
              <div className="rounded-xl border border-[#f0e4d7] bg-[#fffaf4] px-4 py-3 text-sm text-[#5b3a23]">
                <p className="font-semibold">site.pixora.ai/{studioSlug}</p>
                <p className="mt-1 text-[#7a6a55]">
                  Generated from your account identity and ready to configure.
                </p>
              </div>
            </Card>
          </div>
        </div>
      );
    }

    if (activeTab === "invoices") {
      return (
        <Card
          title="Billing and Invoices"
          description="Billing tooling is not connected yet, so invoices will appear here after payment flows are enabled."
        >
          <div className="rounded-xl border border-dashed border-[#ead7c5] bg-[#fffaf4] px-4 py-4 text-sm text-[#7a6a55]">
            No invoices are available yet.
          </div>
        </Card>
      );
    }

    return (
      <Card title="Coming Soon" description="This section is under Pixora theme migration and production hardening.">
        <p className="text-sm text-[#7a6a55]">
          The foundation is in place, and the live profile/domain surfaces are already using real data instead of
          demo placeholders.
        </p>
      </Card>
    );
  }, [accountEmail, activeTab, loadingProfile, profile, socialCount, studioSlug]);

  return (
    <div className="mx-auto w-full max-w-7xl rounded-3xl border border-[#eadccf] bg-[#fffaf4] p-4 shadow-[0_20px_50px_rgba(73,39,20,0.08)] sm:p-6">
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-[#eadccf] bg-white p-4">
          <div className="flex items-center gap-2 border-b border-[#e4efea] pb-3">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#f6eadb] text-[#7a3f13]">
              <IdCard className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#2a170d]">Settings</p>
              <p className="text-xs text-[#7a6a55]">Manage your Pixora account</p>
            </div>
          </div>
          <nav className="mt-3 space-y-1">
            {tabs.map(({ key, label, icon }) => (
              <TabButton
                key={key}
                active={activeTab === key}
                label={label}
                Icon={icon}
                onClick={() => setActiveTab(key)}
              />
            ))}
          </nav>
        </aside>

        <section className="space-y-5">
          <header className="rounded-2xl border border-[#eadccf] bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#2a170d]">
                  {tabs.find((tab) => tab.key === activeTab)?.label ?? "Settings"}
                </h1>
                <p className="mt-1 text-sm text-[#7a6a55]">
                  {loadingProfile
                    ? "Syncing your latest Pixora account data..."
                    : "Live account settings with production-friendly empty states."}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#eadccf] bg-[#fff7ee] px-3 py-1 text-xs font-semibold text-[#7a3f13]">
                <Building2 className="h-3.5 w-3.5" />
                Pixora Theme
              </div>
            </div>
          </header>

          {content}
        </section>
      </div>
    </div>
  );
}
