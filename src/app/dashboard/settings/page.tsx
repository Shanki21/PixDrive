"use client";

import { useState } from "react";
import { CreditCard, Globe2, Megaphone, Settings2, ShoppingBag, Bell, LineChart, Plug, Scale, User } from "lucide-react";

const SETTINGS_ITEMS = [
  { label: "Plans & billing", icon: CreditCard },
  { label: "Domain", icon: Globe2 },
  { label: "Referral program", icon: Megaphone },
  { label: "Drive settings", icon: Settings2, active: true },
  { label: "Shop settings", icon: ShoppingBag },
  { label: "Notifications", icon: Bell },
  { label: "Analytics & tracking", icon: LineChart },
  { label: "Service integration", icon: Plug },
  { label: "Legal settings", icon: Scale },
  { label: "Profile", icon: User },
];

export default function SettingsPage() {
  const [clientNameFormat, setClientNameFormat] = useState("first_last");
  const [socialVersionEnabled, setSocialVersionEnabled] = useState(true);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-3xl border border-[#efe6dc] bg-white/70 p-4 shadow-sm">
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#9a8f82]">Settings</p>
          <nav className="space-y-1">
            {SETTINGS_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition ${
                    item.active ? "bg-[#f4ede3] text-[#15161a]" : "text-[#4a433d] hover:bg-[#f7f3ee]"
                  }`}
                >
                  <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${
                    item.active ? "bg-white" : "bg-[#efe6dc]"
                  }`}>
                    <Icon className="h-4 w-4 text-[#4a433d]" />
                  </span>
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="space-y-6">
          <div className="rounded-3xl border border-[#efe6dc] bg-white/90 p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4ede3]">
                <Settings2 className="h-5 w-5 text-[#4a433d]" />
              </span>
              <div>
                <h1 className="text-2xl font-semibold text-[#15161a]">Drive settings</h1>
                <p className="text-sm text-[#8a7f73]">Set up galleries</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[#efe6dc] bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-[#15161a]">Client name field</h2>
            <p className="mt-2 text-sm text-[#8a7f73]">
              Set how the name field appears on the form when clients create Favorites or place an order.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <label className="text-sm font-semibold text-[#4a433d]">Client name format</label>
              <select
                className="h-11 min-w-60 rounded-2xl border border-[#e3d8cc] bg-white px-4 text-sm text-[#4a433d]"
                value={clientNameFormat}
                onChange={(event) => setClientNameFormat(event.target.value)}
              >
                <option value="first_last">First name and last name</option>
                <option value="first_only">First name only</option>
                <option value="full_name">Full name</option>
              </select>
            </div>
            <button className="mt-6 rounded-xl border border-[#e3d8cc] bg-[#f2ece4] px-6 py-2 text-sm font-semibold text-[#4a433d]">
              Save
            </button>
          </div>

          <div className="rounded-3xl border border-[#efe6dc] bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-[#15161a]">Social media version</h2>
            <p className="mt-2 text-sm text-[#8a7f73]">
              Let clients choose between original size and a copy for social media when downloading. Social media copy
              is resized to 2560px on the longest side.
            </p>
            <div className="mt-5 flex items-center justify-between">
              <span className="text-sm font-semibold text-[#4a433d]">Create version for social media</span>
              <button
                type="button"
                onClick={() => setSocialVersionEnabled((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  socialVersionEnabled ? "bg-[#101114]" : "bg-[#d9cfc4]"
                }`}
              >
                <span
                  className={`absolute left-1 h-4 w-4 rounded-full bg-white transition ${
                    socialVersionEnabled ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>
            <button className="mt-6 rounded-xl border border-[#e3d8cc] bg-[#f2ece4] px-6 py-2 text-sm font-semibold text-[#4a433d]">
              Save
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
