"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import fetchWithRetry from "@/lib/fetchWithRetry";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BadgeCheck,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  LockKeyhole,
  MapPin,
  Megaphone,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import type { GalleryEventSettings, GalleryMetaConfig } from "@/lib/gallery-config";

const EVENT_TYPES = [
  "Wedding",
  "Corporate",
  "Birthday",
  "Engagement",
  "Pre-Wedding",
  "Private Party",
  "Other",
] as const;

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

type ExistingGalleryResponse = {
  id: string;
  name: string;
  createdAt?: string | null;
  settings?: GalleryEventSettings | null;
  meta?: GalleryMetaConfig | null;
};

function Toggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${checked ? "bg-[#7a3f13]" : "bg-[#e3cdb8]"
        } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${checked ? "left-6" : "left-1"}`}
      />
    </button>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
  trailing,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#f4e5d3] text-[#7a3f13]">
          {icon}
        </span>
        <div>
          <p className="text-base font-semibold text-[#2a170d]">{title}</p>
          <p className="text-xs text-[#8a735f]">{subtitle}</p>
        </div>
      </div>
      {trailing ?? null}
    </div>
  );
}

function ControlToggleRow({
  title,
  description,
  value,
  onChange,
  disabled = false,
}: {
  title: string;
  description: string;
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-4 rounded-xl border border-[#f0e4d7] bg-[#fffdf8] px-4 py-3 ${disabled ? "opacity-60" : ""
        }`}
    >
      <div>
        <p className="text-sm font-semibold text-[#1f3f36]">{title}</p>
        <p className="mt-1 text-xs text-[#8a735f]">{description}</p>
      </div>
      <Toggle checked={value} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function CreateEventsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editGalleryId = (searchParams.get("edit") ?? "").trim();
  const isEditMode = editGalleryId.length > 0;
  const todayDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [eventName, setEventName] = useState("");
  const [startDate, setStartDate] = useState(todayDate);
  const [endDate, setEndDate] = useState(todayDate);
  const [eventType, setEventType] = useState<string>(EVENT_TYPES[0]);
  const [eventLocation, setEventLocation] = useState("");
  const [description, setDescription] = useState("");
  const [favoritesEnabled, setFavoritesEnabled] = useState(true);
  const [favoritesLimitSelected, setFavoritesLimitSelected] = useState(false);
  const [favoritesMaxSelected, setFavoritesMaxSelected] = useState(1);

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [expiryDate, setExpiryDate] = useState("");
  const [fullAccessPin, setFullAccessPin] = useState("");
  const [guestPin, setGuestPin] = useState("");
  const [allowSingleDownload, setAllowSingleDownload] = useState(true);
  const [allowBulkDownload, setAllowBulkDownload] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [oneQrEnabled, setOneQrEnabled] = useState(true);
  const [oneQrRequirePin, setOneQrRequirePin] = useState(false);
  const [oneQrAccessLevel, setOneQrAccessLevel] = useState<"full" | "guest">("guest");
  const [published, setPublished] = useState(false);
  const [hasStoredFullAccessPin, setHasStoredFullAccessPin] = useState(false);
  const [hasStoredGuestPin, setHasStoredGuestPin] = useState(false);
  const [loadingEditData, setLoadingEditData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!isEditMode) {
      setLoadingEditData(false);
      return () => {
        active = false;
      };
    }

    setErrorMessage(null);

    const applyGalleryData = (gallery: ExistingGalleryResponse) => {
      const settings = gallery.settings ?? null;
      const galleryMeta = gallery.meta ?? null;
      const createdDate = toDateInputValue(gallery.createdAt) || todayDate;
      const rawEventType = settings?.eventType?.trim();
      const normalizedEventType =
        rawEventType && EVENT_TYPES.includes(rawEventType as (typeof EVENT_TYPES)[number])
          ? rawEventType
          : rawEventType
            ? "Other"
            : EVENT_TYPES[0];

      if (!active) return;

      setEventName(gallery.name ?? "");
      setStartDate(settings?.startDate ?? createdDate);
      setEndDate(settings?.endDate ?? settings?.startDate ?? createdDate);
      setEventType(normalizedEventType);
      setEventLocation(settings?.eventLocation ?? "");
      setDescription(settings?.description ?? "");
      setFavoritesEnabled(galleryMeta?.favoritesEnabled ?? true);
      setFavoritesLimitSelected(galleryMeta?.favoritesLimitSelected ?? false);
      setFavoritesMaxSelected(Math.max(1, galleryMeta?.favoritesMaxSelected ?? 1));
      setExpiryDate(settings?.expiryDate ?? toDateInputValue(galleryMeta?.expiresAt) ?? "");
      setFullAccessPin(settings?.fullAccessPin ?? "");
      setGuestPin(settings?.guestPin ?? "");
      setHasStoredFullAccessPin(Boolean(settings?.fullAccessPinSet || settings?.fullAccessPinHash));
      setHasStoredGuestPin(Boolean(settings?.guestPinSet || settings?.guestPinHash));
      setAllowSingleDownload(settings?.allowSingleDownload ?? true);
      setAllowBulkDownload(settings?.allowBulkDownload ?? false);
      setWhatsappEnabled(settings?.whatsappEnabled ?? false);
      setEmailEnabled(settings?.emailEnabled ?? false);
      setOneQrEnabled(settings?.oneQrEnabled ?? true);
      setOneQrRequirePin(settings?.oneQrRequirePin ?? false);
      setOneQrAccessLevel(settings?.oneQrAccessLevel ?? "guest");
      setPublished(settings?.published ?? false);
      setAdvancedOpen(true);
    };
    setLoadingEditData(true);

        const loadForEdit = async () => {
      try {
        const response = await fetchWithRetry(`/api/galleries/${encodeURIComponent(editGalleryId)}`, { cache: "no-store", method: "GET" }, { dedupeKey: `galleries:load:${editGalleryId}` });
        const contentType = response.headers.get("content-type") ?? "";
        if (!response.ok || !contentType.includes("application/json")) {
          throw new Error("Unable to load event details for editing.");
        }

        const gallery = (await response.json()) as ExistingGalleryResponse;
        if (!active) return;
        applyGalleryData(gallery);
      } catch (error) {
        if (!active) return;
        const fallback = "Unable to load event details for editing.";
        setErrorMessage(error instanceof Error ? error.message : fallback);
      } finally {
        if (active) {
          setLoadingEditData(false);
        }
      }
    };

    void loadForEdit();
    return () => {
      active = false;
    };
  }, [editGalleryId, isEditMode, todayDate]);

  useEffect(() => {
    if (!isEditMode) return;

    return () => {
      // reset to avoid leakage
      setEventName("");
      setEventLocation("");
      setDescription("");
    };
  }, [editGalleryId, isEditMode]);

  const canSubmit = useMemo(() => {
    const hasValidName = eventName.trim().length > 0;
    const blockedByEditLoading = isEditMode && loadingEditData;
    return hasValidName && !submitting && !blockedByEditLoading;
  }, [eventName, isEditMode, loadingEditData, submitting]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loadingEditData) return;
    const safeName = eventName.trim();
    if (!safeName) {
      setErrorMessage("Event name is required.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const expiresAtIso = expiryDate ? new Date(`${expiryDate}T00:00:00`).toISOString() : null;
      const pinPayload: Pick<GalleryEventSettings, "fullAccessPin" | "guestPin"> = {
        ...(!isEditMode || fullAccessPin.trim() ? { fullAccessPin: fullAccessPin.trim() || null } : {}),
        ...(!isEditMode || guestPin.trim() ? { guestPin: guestPin.trim() || null } : {}),
      };
      const settingsPayload: GalleryEventSettings = {
        startDate,
        endDate,
        eventType,
        eventLocation: eventLocation.trim() || null,
        description: description.trim() || null,
        published,
        reelitAiEnabled: false,
        expiryDate: expiryDate || null,
        ...pinPayload,
        allowSingleDownload,
        allowBulkDownload,
        whatsappEnabled,
        emailEnabled,
        oneQrEnabled,
        oneQrRequirePin,
        oneQrAccessLevel,
        galleryAppEnabled: true,
      };
      const metaPayload: GalleryMetaConfig = {
        expiresAt: expiresAtIso,
        storageTimeLabel: expiresAtIso ? "Custom expiry" : null,
        favoritesEnabled,
        favoritesLimitSelected,
        favoritesName: "Favorites", // fixed value
        favoritesMaxSelected: favoritesLimitSelected ? Math.max(1, favoritesMaxSelected) : null,
      };

      if (isEditMode) {
        const response = await fetchWithRetry(`/api/galleries/${encodeURIComponent(editGalleryId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: safeName,
            settings: settingsPayload,
            meta: metaPayload,
          }),
        }, { dedupeKey: `galleries:patch:${editGalleryId}`, idempotencyKey: `galleries:patch:${editGalleryId}:${Date.now()}` });
        const contentType = response.headers.get("content-type") ?? "";
        if (!response.ok || !contentType.includes("application/json")) {
          throw new Error("Unable to save event changes.");
        }

        router.push("/dashboard/drive");
        return;
      }

      const response = await fetchWithRetry("/api/galleries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: safeName,
          settings: settingsPayload,
          meta: metaPayload,
        }),
      }, { dedupeKey: `galleries:create:${safeName}`, idempotencyKey: `galleries:create:${Date.now()}` });
      const contentType = response.headers.get("content-type") ?? "";
      if (response.status === 401) {
        router.push(`/login?next=${encodeURIComponent("/dashboard/create-events")}`);
        return;
      }

      if (!response.ok || !contentType.includes("application/json")) {
        throw new Error("Unable to create event.");
      }

      const gallery = (await response.json()) as { id: string };

      router.push(`/dashboard/drive/${gallery.id}`);
    } catch (error) {
      const fallback = isEditMode
        ? "Unable to save event changes. Please try again."
        : "Unable to create event. Please try again.";
      setErrorMessage(error instanceof Error ? error.message : fallback);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <section className="rounded-[28px] border border-[#eadccf] bg-white p-6 shadow-[0_20px_55px_rgba(73,39,20,0.08)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a3f13]">
          {isEditMode ? "Edit Event" : "Create Event"}
        </p>
        <h1 className="font-display mt-3 text-3xl font-bold text-[#2a170d] sm:text-4xl">
          {isEditMode ? "Update your Pixora event" : "Build a new Pixora event"}
        </h1>
        <p className="mt-2 text-sm text-[#5e7b72]">
          {isEditMode
            ? "Adjust event details, access controls, and delivery behavior from one professional control board."
            : "Shape your event flow with Pixora controls: define event details, brand the experience, then tune access and delivery rules."}
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_80px_1fr] sm:items-center">
          <div className="rounded-2xl border border-[#d4e8de] bg-[#f5eadb] px-4 py-3 text-sm font-semibold text-[#5b3a23]">
            1. Event Details
          </div>
          <div className="hidden h-px bg-[#efe1d3] sm:block" />
          <div className="rounded-2xl border border-[#efe1d3] bg-[#fffaf4] px-4 py-3 text-sm font-semibold text-[#7a6a55]">
            2. Advanced Control Board
          </div>
        </div>
      </section>

      <form onSubmit={onSubmit} className="space-y-6">
        {loadingEditData ? (
          <div className="rounded-xl border border-[#ead7c5] bg-[#fff7ee] px-4 py-3 text-sm font-medium text-[#5b3a23]">
            Loading event details...
          </div>
        ) : null}

        <section className="rounded-3xl border border-[#eadccf] bg-white p-6 shadow-[0_10px_30px_rgba(73,39,20,0.06)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-[#2a170d]">Event Details</h2>
              <p className="mt-1 text-sm text-[#8a735f]">Capture your core event information.</p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-[#ead7c5] bg-[#f5fbf8] px-3 py-1">
              <span className="text-xs font-semibold text-[#7a6a55]">Published</span>
              <Toggle checked={published} onChange={setPublished} />
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label className="text-sm font-semibold text-[#5b3a23]">Event Name</label>
              <input
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Enter event name"
                className="mt-1 h-12 w-full rounded-xl border border-[#ead7c5] bg-white px-4 text-sm text-[#3a2112] outline-none focus:border-[#7a3f13]"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-[#5b3a23]">
                Start Date
                <div className="relative mt-1">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a735f]" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-12 w-full rounded-xl border border-[#ead7c5] bg-white pl-10 pr-3 text-sm text-[#3a2112] outline-none focus:border-[#7a3f13]"
                  />
                </div>
              </label>
              <label className="text-sm font-semibold text-[#5b3a23]">
                End Date
                <div className="relative mt-1">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a735f]" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-12 w-full rounded-xl border border-[#ead7c5] bg-white pl-10 pr-3 text-sm text-[#3a2112] outline-none focus:border-[#7a3f13]"
                  />
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-[#5b3a23]">
                Event Type
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="mt-1 h-12 w-full rounded-xl border border-[#ead7c5] bg-white px-3 text-sm text-[#3a2112] outline-none focus:border-[#7a3f13]"
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-[#5b3a23]">
                Event Location
                <div className="relative mt-1">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a735f]" />
                  <input
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                    placeholder="Add location or virtual link"
                    className="h-12 w-full rounded-xl border border-[#ead7c5] bg-white pl-10 pr-3 text-sm text-[#3a2112] outline-none focus:border-[#7a3f13]"
                  />
                </div>
              </label>
            </div>

            <label className="text-sm font-semibold text-[#5b3a23]">
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add event description (optional)"
                className="mt-1 min-h-24 w-full rounded-xl border border-[#ead7c5] bg-white px-4 py-3 text-sm text-[#3a2112] outline-none focus:border-[#7a3f13]"
              />
            </label>
          </div>
        </section>

        <section className="rounded-3xl border border-[#eadccf] bg-white p-6 shadow-[0_10px_30px_rgba(73,39,20,0.06)]">
          <SectionHeader
            icon={<BadgeCheck className="h-5 w-5" />}
            title="Favorites Settings"
            subtitle="Control how clients shortlist their selected photos."
            trailing={<Toggle checked={favoritesEnabled} onChange={setFavoritesEnabled} />}
          />
          <div className={`mt-4 space-y-4 ${favoritesEnabled ? "" : "opacity-60"}`}>
            <ControlToggleRow
              title="Limit Selected Photos"
              description="Restrict how many photos each client can add to favorites."
              value={favoritesLimitSelected}
              onChange={setFavoritesLimitSelected}
              disabled={!favoritesEnabled}
            />
            {favoritesEnabled && favoritesLimitSelected ? (
              <label className="text-sm font-semibold text-[#5b3a23]">
                Max Selected Photos
                <input
                  type="number"
                  min={1}
                  value={favoritesMaxSelected}
                  onChange={(e) => {
                    const next = Number.parseInt(e.target.value, 10);
                    setFavoritesMaxSelected(Number.isFinite(next) ? Math.max(1, next) : 1);
                  }}
                  className="mt-1 h-12 w-full rounded-xl border border-[#ead7c5] bg-white px-4 text-sm text-[#3a2112] outline-none focus:border-[#7a3f13]"
                />
              </label>
            ) : null}
          </div>
        </section>

        <section className="overflow-hidden rounded-[30px] border border-[#ead7c5] bg-white shadow-[0_18px_44px_rgba(73,39,20,0.09)]">
          <div className="relative">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[#ead7c5]" />
            <button
              type="button"
              onClick={() => setAdvancedOpen((current) => !current)}
              className="relative flex w-full items-center justify-between gap-4 px-6 py-6 text-left md:px-7"
            >
              <div>
                <p className="inline-flex items-center rounded-full border border-[#ead7c5] bg-[#fff7ee] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6d4426]">
                  Event Controls
                </p>
                <p className="mt-3 text-xl font-semibold text-[#163129]">Advanced Control Board</p>
                <p className="mt-1 text-sm text-[#7a6a55]">
                  Fine-tune permissions, access, delivery behavior, and communication from one panel.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#ead7c5] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#6d4426]">
                {advancedOpen ? "Collapse" : "Expand"}
                {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </span>
            </button>
          </div>

          {advancedOpen ? (
            <div className="border-t border-[#f0e4d7] bg-[linear-gradient(160deg,#fffdf8_0%,#fff7ee_56%,#fff4e8_100%)] px-6 pb-6 pt-5 md:px-7">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <article className="rounded-2xl border border-[#ead7c5] bg-white p-5 shadow-[0_8px_22px_rgba(73,39,20,0.06)]">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#f4e5d3] text-[#7a3f13]">
                      <ShieldCheck className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-base font-semibold text-[#2a170d]">Security Envelope</p>
                      <p className="text-xs text-[#8a735f]">Control event entry and protected access.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <label className="text-sm font-semibold text-[#5b3a23]">
                      Expiry Date
                      <input
                        type="date"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        className="mt-1 h-11 w-full rounded-xl border border-[#ead7c5] bg-[#fffdf8] px-3 text-sm text-[#3a2112] outline-none focus:border-[#7a3f13]"
                      />
                    </label>
                    <label className="text-sm font-semibold text-[#5b3a23]">
                      Full Access PIN
                      <input
                        value={fullAccessPin}
                        onChange={(e) => setFullAccessPin(e.target.value)}
                        placeholder={hasStoredFullAccessPin ? "PIN already set" : "For admins"}
                        className="mt-1 h-11 w-full rounded-xl border border-[#ead7c5] bg-[#fffdf8] px-3 text-sm text-[#3a2112] outline-none focus:border-[#7a3f13]"
                      />
                      {hasStoredFullAccessPin && !fullAccessPin ? (
                        <span className="mt-1 block text-xs font-medium text-[#7a6a55]">Leave blank to keep current PIN.</span>
                      ) : null}
                    </label>
                    <label className="text-sm font-semibold text-[#5b3a23]">
                      Guest PIN
                      <input
                        value={guestPin}
                        onChange={(e) => setGuestPin(e.target.value)}
                        placeholder={hasStoredGuestPin ? "PIN already set" : "For guests"}
                        className="mt-1 h-11 w-full rounded-xl border border-[#ead7c5] bg-[#fffdf8] px-3 text-sm text-[#3a2112] outline-none focus:border-[#7a3f13]"
                      />
                      {hasStoredGuestPin && !guestPin ? (
                        <span className="mt-1 block text-xs font-medium text-[#7a6a55]">Leave blank to keep current PIN.</span>
                      ) : null}
                    </label>
                  </div>
                </article>

                <article className="rounded-2xl border border-[#ead7c5] bg-white p-5 shadow-[0_8px_22px_rgba(73,39,20,0.06)]">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#f3e4d2] text-[#b9783b]">
                      <LockKeyhole className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-base font-semibold text-[#2a170d]">Download Rules</p>
                      <p className="text-xs text-[#8a735f]">Set how clients can collect delivered files.</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <ControlToggleRow
                      title="Allow Single Download"
                      description="Guests can download individual photos."
                      value={allowSingleDownload}
                      onChange={setAllowSingleDownload}
                    />
                    <ControlToggleRow
                      title="Allow Bulk Download"
                      description="Guests can download all photos at once."
                      value={allowBulkDownload}
                      onChange={setAllowBulkDownload}
                    />
                  </div>
                </article>

                <article className="rounded-2xl border border-[#ead7c5] bg-white p-5 shadow-[0_8px_22px_rgba(73,39,20,0.06)]">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#f4e5d3] text-[#7a3f13]">
                      <Megaphone className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-base font-semibold text-[#2a170d]">Broadcast Center</p>
                      <p className="text-xs text-[#8a735f]">Choose where event updates are sent.</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <ControlToggleRow
                      title="WhatsApp"
                      description="Send publish updates on WhatsApp."
                      value={whatsappEnabled}
                      onChange={setWhatsappEnabled}
                    />
                    <ControlToggleRow
                      title="Email"
                      description="Send updates to registered guests."
                      value={emailEnabled}
                      onChange={setEmailEnabled}
                    />
                  </div>
                </article>

                <article className="rounded-2xl border border-[#ead7c5] bg-white p-5 shadow-[0_8px_22px_rgba(73,39,20,0.06)]">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#f3e4d2] text-[#b9783b]">
                      <QrCode className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-base font-semibold text-[#2a170d]">QR Gateway</p>
                      <p className="text-xs text-[#8a735f]">Fine-tune access behavior for One QR links.</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <ControlToggleRow
                      title="One QR Enabled"
                      description="Include One QR in your portfolio page."
                      value={oneQrEnabled}
                      onChange={setOneQrEnabled}
                    />
                    <ControlToggleRow
                      title="Require PIN"
                      description="Visitors need a PIN to access via One QR."
                      value={oneQrRequirePin}
                      onChange={setOneQrRequirePin}
                      disabled={!oneQrEnabled}
                    />
                    <div className="rounded-xl border border-[#f0e4d7] bg-[#fffdf8] px-4 py-3">
                      <p className="text-sm font-semibold text-[#1f3f36]">Access Level</p>
                      <p className="mt-1 text-xs text-[#8a735f]">Choose visitor permission when opening from QR.</p>
                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => setOneQrAccessLevel("full")}
                          disabled={!oneQrEnabled}
                          className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${oneQrAccessLevel === "full"
                              ? "border-[#7a3f13] bg-[#f4e5d3] text-[#7a3f13]"
                              : "border-[#ead7c5] bg-white text-[#6d4426]"
                            } ${!oneQrEnabled ? "cursor-not-allowed opacity-60" : ""}`}
                        >
                          Full Access
                        </button>
                        <button
                          type="button"
                          onClick={() => setOneQrAccessLevel("guest")}
                          disabled={!oneQrEnabled}
                          className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${oneQrAccessLevel === "guest"
                              ? "border-[#7a3f13] bg-[#f4e5d3] text-[#7a3f13]"
                              : "border-[#ead7c5] bg-white text-[#6d4426]"
                            } ${!oneQrEnabled ? "cursor-not-allowed opacity-60" : ""}`}
                        >
                          Guest Access
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          ) : null}
        </section>

        {errorMessage ? (
          <div className="rounded-xl border border-[#f1ccd7] bg-[#fff3f6] px-4 py-3 text-sm font-medium text-[#b91c1c]">
            {errorMessage}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-3 pb-2">
          <button
            type="button"
            onClick={() => router.push("/dashboard/drive")}
            className="rounded-xl border border-[#ead7c5] bg-white px-5 py-2.5 text-sm font-semibold text-[#5b3a23] transition hover:border-[#7a3f13] hover:text-[#7a3f13]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-xl bg-[#7a3f13] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5b2b0c] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (isEditMode ? "Saving..." : "Creating...") : isEditMode ? "Save Changes" : "Create Event"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CreateEventsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-6xl space-y-6">
          <section className="rounded-[28px] border border-[#eadccf] bg-white p-6 shadow-[0_20px_55px_rgba(73,39,20,0.08)] md:p-8">
            <p className="text-sm font-medium text-[#7a6a55]">Loading create event tools...</p>
          </section>
        </div>
      }
    >
      <CreateEventsPageContent />
    </Suspense>
  );
}
  
