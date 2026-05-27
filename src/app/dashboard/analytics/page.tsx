"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Download,
  Eye,
  FileDown,
  Images,
  RefreshCw,
  Search,
  UserRoundPlus,
  Users,
} from "lucide-react";

type AnalyticsEvent = {
  id: string;
  name: string;
  createdAt: string;
  photos: number;
  registrations: number;
  visits: number;
  imageViews: number;
  downloads: number;
  conversion: number;
};

type RegistrationRow = {
  id: string;
  eventName: string;
  name: string;
  email: string;
  mobile: string;
  createdAt: string;
  imageViews: number;
  downloads: number;
  consent: boolean;
  marketingOptIn: boolean;
};

type ActivityRow = {
  key: string;
  label: string;
  visits: number;
  downloads: number;
};

type AnalyticsPayload = {
  ok: boolean;
  totals: {
    registrations: number;
    visits: number;
    imageViews: number;
    downloads: number;
    photos: number;
  };
  activity: ActivityRow[];
  events: AnalyticsEvent[];
  registrations: RegistrationRow[];
};

type TabKey = "analytics" | "registrations";

const tabs: Array<{ key: TabKey; label: string; icon: typeof BarChart3 }> = [
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "registrations", label: "Registrations", icon: Users },
];

const emptyPayload: AnalyticsPayload = {
  ok: true,
  totals: { registrations: 0, visits: 0, imageViews: 0, downloads: 0, photos: 0 },
  activity: [],
  events: [],
  registrations: [],
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function toCsvValue(value: string | number | boolean) {
  const raw = String(value);
  return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

function downloadCsv(rows: RegistrationRow[]) {
  if (typeof document === "undefined") return;
  const header = ["Date", "Event Name", "Name", "Mobile Number", "Email ID", "Image View", "Image Downloads", "Consent"];
  const csvRows = rows.map((row) =>
    [
      formatDate(row.createdAt),
      row.eventName,
      row.name,
      row.mobile,
      row.email,
      row.imageViews,
      row.downloads,
      row.consent ? "Yes" : "No",
    ]
      .map(toCsvValue)
      .join(",")
  );
  const blob = new Blob([[header.join(","), ...csvRows].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `pixora-registrations-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function MetricCard({
  label,
  value,
  icon: Icon,
  helper,
}: {
  label: string;
  value: number;
  icon: typeof BarChart3;
  helper: string;
}) {
  return (
    <article className="rounded-2xl border border-[#eadccf] bg-white p-5 shadow-[0_10px_30px_rgba(73,39,20,0.06)]">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#f4e5d3] text-[#7a3f13]">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#8a735f]">{label}</p>
      <p className="mt-1 text-3xl font-bold text-[#2a170d]">{value}</p>
      <p className="mt-2 text-xs text-[#8a735f]">{helper}</p>
    </article>
  );
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("analytics");
  const [payload, setPayload] = useState<AnalyticsPayload>(emptyPayload);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/analytics", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load analytics.");
      setPayload((await response.json()) as AnalyticsPayload);
    } catch {
      setPayload(emptyPayload);
      setError("Unable to load analytics right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAnalytics();
  }, []);

  const filteredRegistrations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return payload.registrations;
    return payload.registrations.filter((row) =>
      [row.eventName, row.name, row.email, row.mobile].some((value) => value.toLowerCase().includes(query))
    );
  }, [payload.registrations, search]);

  const maxActivity = Math.max(...payload.activity.map((row) => Math.max(row.visits, row.downloads)), 1);
  const topEvents = payload.events
    .slice()
    .sort((a, b) => b.visits + b.downloads * 2 + b.registrations - (a.visits + a.downloads * 2 + a.registrations))
    .slice(0, 6);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <section className="rounded-[28px] border border-[#eadccf] bg-white p-6 shadow-[0_20px_55px_rgba(73,39,20,0.08)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a3f13]">Pixora analytics</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-[#2a170d] sm:text-4xl">Analytics</h1>
            <p className="mt-3 max-w-2xl text-sm text-[#7a6a55] sm:text-base">
              Track gallery activity, registrations from Get Your Photos, and client download engagement.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadAnalytics()}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#ead7c5] bg-[#fffdf8] px-4 text-sm font-semibold text-[#5b3a23] transition hover:border-[#7a3f13] hover:text-[#7a3f13] disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-[#eadccf] bg-white shadow-[0_10px_30px_rgba(73,39,20,0.06)]">
        <div className="flex flex-wrap gap-1 border-b border-[#eadccf] px-4 pt-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? "border-[#7a3f13] text-[#2a170d]"
                    : "border-transparent text-[#7a6a55] hover:text-[#2a170d]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-4 sm:p-6">
          {error ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

          {activeTab === "analytics" ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Registrations" value={payload.totals.registrations} icon={UserRoundPlus} helper="Get Your Photos submissions" />
                <MetricCard label="Gallery Visit" value={payload.totals.visits} icon={Eye} helper="Public gallery sessions" />
                <MetricCard label="Image View" value={payload.totals.imageViews} icon={Images} helper="Reserved for image-level tracking" />
                <MetricCard label="Image Downloads" value={payload.totals.downloads} icon={Download} helper="Downloaded gallery photos" />
              </div>

              <article className="rounded-3xl border border-[#eadccf] bg-[#fffdf8] p-5">
                <h2 className="text-lg font-semibold text-[#2a170d]">Gallery Activity Visibility</h2>
                <div className="mt-6 h-72 rounded-2xl border border-[#f0e4d7] bg-white p-4">
                  <div className="flex h-full items-end gap-4">
                    {payload.activity.map((row) => {
                      const visitHeight = Math.max(4, Math.round((row.visits / maxActivity) * 100));
                      const downloadHeight = Math.max(4, Math.round((row.downloads / maxActivity) * 100));
                      return (
                        <div key={row.key} className="flex min-w-16 flex-1 flex-col items-center justify-end gap-2">
                          <div className="flex h-52 items-end gap-1">
                            <span className="w-5 rounded-t bg-[#e9bf5f]" style={{ height: `${visitHeight}%` }} title={`${row.visits} visits`} />
                            <span className="w-5 rounded-t bg-[#2f8c7d]" style={{ height: `${downloadHeight}%` }} title={`${row.downloads} downloads`} />
                          </div>
                          <span className="text-xs text-[#7a6a55]">{row.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </article>

              <article className="rounded-3xl border border-[#eadccf] bg-[#fffdf8] p-5">
                <h2 className="text-lg font-semibold text-[#2a170d]">Event Performance</h2>
                <div className="mt-4 overflow-hidden rounded-2xl border border-[#eadccf] bg-white">
                  {loading ? (
                    <div className="h-48 animate-pulse bg-[#fffaf4]" />
                  ) : topEvents.length === 0 ? (
                    <div className="p-8 text-center text-sm text-[#7a6a55]">No analytics data yet.</div>
                  ) : (
                    topEvents.map((event) => (
                      <div key={event.id} className="grid gap-3 border-b border-[#f2ece4] px-4 py-4 text-sm last:border-b-0 md:grid-cols-[1.4fr_repeat(5,0.6fr)]">
                        <p className="font-semibold text-[#2a170d]">{event.name}</p>
                        <p className="text-[#7a6a55]">{event.registrations} regs</p>
                        <p className="text-[#7a6a55]">{event.visits} visits</p>
                        <p className="text-[#7a6a55]">{event.imageViews} views</p>
                        <p className="text-[#7a6a55]">{event.downloads} downloads</p>
                        <p className="font-semibold text-[#7a3f13]">{event.conversion}%</p>
                      </div>
                    ))
                  )}
                </div>
              </article>
            </div>
          ) : null}

          {activeTab === "registrations" ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="relative block w-full max-w-sm">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a735f]" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search registrations..."
                    className="h-11 w-full rounded-xl border border-[#ead7c5] bg-white pl-10 pr-4 text-sm text-[#3a2112] outline-none focus:border-[#7a3f13]"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => downloadCsv(filteredRegistrations)}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2a170d] px-4 text-sm font-semibold text-white transition hover:bg-[#7a3f13]"
                >
                  <FileDown className="h-4 w-4" />
                  Export
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-[#eadccf] bg-white">
                <table className="min-w-[900px] w-full text-left text-sm">
                  <thead className="bg-[#2a170d] text-xs font-bold uppercase tracking-[0.08em] text-white">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Event Name</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Mobile Number</th>
                      <th className="px-4 py-3">Email ID</th>
                      <th className="px-4 py-3">Image View</th>
                      <th className="px-4 py-3">Image Downloads</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={7} className="px-4 py-12 text-center text-[#7a6a55]">Loading registrations...</td></tr>
                    ) : filteredRegistrations.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-12 text-center text-[#7a6a55]">No registrations found.</td></tr>
                    ) : (
                      filteredRegistrations.map((row) => (
                        <tr key={row.id} className="border-b border-[#f2ece4] text-[#3a2112] last:border-b-0">
                          <td className="px-4 py-3">{formatDate(row.createdAt)}</td>
                          <td className="px-4 py-3 font-semibold">{row.eventName}</td>
                          <td className="px-4 py-3">{row.name}</td>
                          <td className="px-4 py-3">{row.mobile || "-"}</td>
                          <td className="px-4 py-3">{row.email || "-"}</td>
                          <td className="px-4 py-3">{row.imageViews}</td>
                          <td className="px-4 py-3">{row.downloads}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

        </div>
      </section>
    </div>
  );
}
