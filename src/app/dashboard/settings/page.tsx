"use client";

import { type ReactNode, useMemo, useState } from "react";
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

const tabs: Array<{ key: SettingsTab; label: string; icon: typeof UserRound }> = [
  { key: "profile", label: "Profile", icon: UserRound },
  { key: "branding", label: "Branding", icon: Brush },
  { key: "domains", label: "Domains", icon: Globe },
  { key: "one-qr", label: "My One QR", icon: Network },
  { key: "integrations", label: "Integrations", icon: Link2 },
  { key: "plan", label: "My Plan", icon: BadgeDollarSign },
  { key: "invoices", label: "Invoices", icon: ClipboardList },
];

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
          ? "bg-[#eef8f4] text-[#0f766e] shadow-[inset_0_0_0_1px_rgba(15,118,110,0.16)]"
          : "text-[#3e5e53] hover:bg-[#f6fbf9]"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="rounded-2xl border border-[#d8e8e1] bg-white p-5 shadow-[0_12px_30px_rgba(16,39,32,0.05)]">
      <h3 className="text-lg font-semibold text-[#173029]">{title}</h3>
      <div className="mt-4 space-y-3">{children}</div>
    </article>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  const content = useMemo(() => {
    if (activeTab === "profile") {
      return (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="Personal Details">
            <LabeledInput label="Full Name" value="Mridul Rawat" />
            <LabeledInput label="Mobile Number" value="+91 75319 88764" />
            <LabeledInput label="Email" value="mridulrrawat12@gmail.com" />
            <LabeledInput label="Country" value="India" />
            <div className="grid gap-3 sm:grid-cols-2">
              <LabeledInput label="State" value="Uttar Pradesh" />
              <LabeledInput label="City" value="Noida" />
            </div>
          </Card>

          <Card title="Company Details">
            <LabeledInput label="Company Name" value="studio xo" />
            <LabeledInput label="Industry" value="Photographer" />
            <LabeledInput label="Area" value="Wedding" />
            <LabeledInput label="Average Events / Year" value="Less than 10" />
          </Card>

          <div className="lg:col-span-2">
            <Card title="Billing Details">
              <div className="grid gap-3 sm:grid-cols-2">
                <LabeledInput label="Company Name (As Per GST/VAT)" value="" placeholder="Company name" />
                <LabeledInput label="GST/VAT Number" value="" placeholder="GST/VAT number" />
              </div>
              <div className="pt-1">
                <button
                  type="button"
                  className="inline-flex h-10 items-center rounded-xl bg-[#1f3d35] px-5 text-sm font-semibold text-white transition hover:bg-[#163029]"
                >
                  Save
                </button>
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
            <Card title="Connect Domain">
              <p className="text-sm text-[#5f7c73]">
                Connect your own domain and display galleries under your branding.
              </p>
              <button
                type="button"
                className="mt-2 inline-flex h-10 items-center rounded-full bg-[#7b899f] px-5 text-sm font-semibold text-white transition hover:bg-[#627088]"
              >
                Connect Domain
              </button>
            </Card>
            <Card title="Connect Sub-Domain">
              <p className="text-sm text-[#5f7c73]">
                Use Pixora hosted sub-domain to launch fast with your studio name.
              </p>
              <button
                type="button"
                className="mt-2 inline-flex h-10 items-center rounded-full bg-[#7b899f] px-5 text-sm font-semibold text-white transition hover:bg-[#627088]"
              >
                Connect Sub-Domain
              </button>
            </Card>
          </div>

          <Card title="Pixora Domains">
            <div className="rounded-xl border border-[#e2ece8]">
              <div className="grid grid-cols-2 gap-3 border-b border-[#e2ece8] bg-[#f6fbf9] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#5f7c73]">
                <span>Domain Name</span>
                <span>Status</span>
              </div>
              <div className="grid grid-cols-2 gap-3 px-4 py-3 text-sm text-[#23463d]">
                <span className="inline-flex items-center gap-2">
                  site.pixora.ai/studioxo
                  <span className="rounded-full bg-[#eaf8f2] px-2 py-0.5 text-[10px] font-semibold uppercase text-[#0f766e]">
                    Primary
                  </span>
                </span>
                <span>Active</span>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return (
      <Card title="Coming Soon">
        <p className="text-sm text-[#5f7c73]">
          This section is under Pixora theme migration and production hardening.
        </p>
      </Card>
    );
  }, [activeTab]);

  return (
    <div className="mx-auto w-full max-w-7xl rounded-3xl border border-[#d8e8e1] bg-[#f8fbfa] p-4 shadow-[0_20px_50px_rgba(16,39,32,0.08)] sm:p-6">
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-[#d8e8e1] bg-white p-4">
          <div className="flex items-center gap-2 border-b border-[#e4efea] pb-3">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#eef8f4] text-[#0f766e]">
              <IdCard className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#173029]">Settings</p>
              <p className="text-xs text-[#5f7c73]">Manage your Pixora account</p>
            </div>
          </div>
          <nav className="mt-3 space-y-1">
            {tabs.map(({ key, label, icon }) => (
              <TabButton key={key} active={activeTab === key} label={label} Icon={icon} onClick={() => setActiveTab(key)} />
            ))}
          </nav>
        </aside>

        <section className="space-y-5">
          <header className="rounded-2xl border border-[#d8e8e1] bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#132723]">
                  {tabs.find((tab) => tab.key === activeTab)?.label ?? "Settings"}
                </h1>
                <p className="mt-1 text-sm text-[#5f7c73]">Reference layout with Pixora brand colors and spacing.</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d9e9e3] bg-[#f3faf7] px-3 py-1 text-xs font-semibold text-[#0f766e]">
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

function LabeledInput({
  label,
  value,
  placeholder,
}: {
  label: string;
  value: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.1em] text-[#5f7c73]">{label}</span>
      <input
        readOnly
        value={value}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-[#d6e7e1] bg-white px-3 text-sm text-[#23463d] outline-none"
      />
    </label>
  );
}
