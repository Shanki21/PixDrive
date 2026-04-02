"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
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
  Smartphone,
} from "lucide-react";
import { getGalleryMeta, saveGalleryMeta } from "@/lib/gallery-meta-storage";
import { getEventSettings, saveEventSettings } from "@/lib/event-settings-storage";

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
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
        checked ? "bg-[#0f766e]" : "bg-[#d8e5df]"
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
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#eef7f3] text-[#0f766e]">
          {icon}
        </span>
        <div>
          <p className="text-base font-semibold text-[#173029]">{title}</p>
          <p className="text-xs text-[#6a877e]">{subtitle}</p>
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
      className={`flex items-start justify-between gap-4 rounded-xl border border-[#e2eee8] bg-[#fbfdfc] px-4 py-3 ${
        disabled ? "opacity-60" : ""
      }`}
    >
      <div>
        <p className="text-sm font-semibold text-[#1f3f36]">{title}</p>
        <p className="mt-1 text-xs text-[#6f8b82]">{description}</p>
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
  const [brandingEnabled, setBrandingEnabled] = useState(false);

  const [advancedOpen, setAdvancedOpen] = useState(true);
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
  const [galleryAppEnabled, setGalleryAppEnabled] = useState(true);
  const [livenessDetectionEnabled, setLivenessDetectionEnabled] = useState(false);
  const [published, setPublished] = useState(true);
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

    setLoadingEditData(true);
    setErrorMessage(null);

    const loadForEdit = async () => {
      try {
        const response = await fetch(`/api/galleries/${encodeURIComponent(editGalleryId)}`, { cache: "no-store" });
        const contentType = response.headers.get("content-type") ?? "";
        if (!response.ok || !contentType.includes("application/json")) {
          throw new Error("Unable to load event details for editing.");
        }

        const gallery = (await response.json()) as ExistingGalleryResponse;
        const settings = getEventSettings(editGalleryId);
        const galleryMeta = getGalleryMeta(editGalleryId);
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
        setBrandingEnabled(settings?.brandingEnabled ?? false);
        setExpiryDate(settings?.expiryDate ?? toDateInputValue(galleryMeta?.expiresAt) ?? "");
        setFullAccessPin(settings?.fullAccessPin ?? "");
        setGuestPin(settings?.guestPin ?? "");
        setAllowSingleDownload(settings?.allowSingleDownload ?? true);
        setAllowBulkDownload(settings?.allowBulkDownload ?? false);
        setWhatsappEnabled(settings?.whatsappEnabled ?? false);
        setEmailEnabled(settings?.emailEnabled ?? false);
        setOneQrEnabled(settings?.oneQrEnabled ?? true);
        setOneQrRequirePin(settings?.oneQrRequirePin ?? false);
        setOneQrAccessLevel(settings?.oneQrAccessLevel ?? "guest");
        setGalleryAppEnabled(settings?.galleryAppEnabled ?? true);
        setLivenessDetectionEnabled(settings?.livenessDetectionEnabled ?? false);
        setPublished(settings?.published ?? true);
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

  const canSubmit = useMemo(
    () => eventName.trim().length > 1 && !submitting && !loadingEditData,
    [eventName, submitting, loadingEditData]
  );

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

      if (isEditMode) {
        const response = await fetch(`/api/galleries/${encodeURIComponent(editGalleryId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: safeName }),
        });
        const contentType = response.headers.get("content-type") ?? "";
        if (!response.ok || !contentType.includes("application/json")) {
          throw new Error("Unable to save event changes.");
        }

        saveGalleryMeta(editGalleryId, {
          expiresAt: expiresAtIso,
          storageTimeLabel: expiresAtIso ? "Custom expiry" : null,
        });

        saveEventSettings(editGalleryId, {
          startDate,
          endDate,
          eventType,
          eventLocation: eventLocation.trim() || null,
          description: description.trim() || null,
          published,
          photoSellingEnabled: false,
          reelitAiEnabled: false,
          brandingEnabled,
          expiryDate: expiryDate || null,
          fullAccessPin: fullAccessPin.trim() || null,
          guestPin: guestPin.trim() || null,
          allowSingleDownload,
          allowBulkDownload,
          whatsappEnabled,
          emailEnabled,
          oneQrEnabled,
          oneQrRequirePin,
          oneQrAccessLevel,
          galleryAppEnabled,
          livenessDetectionEnabled,
        });

        router.push("/dashboard/drive");
        return;
      }

      const response = await fetch("/api/galleries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: safeName }),
      });
      const contentType = response.headers.get("content-type") ?? "";
      if (!response.ok || !contentType.includes("application/json")) {
        throw new Error("Unable to create event.");
      }

      const gallery = (await response.json()) as { id: string };

      saveGalleryMeta(gallery.id, {
        expiresAt: expiresAtIso,
        storageTimeLabel: expiresAtIso ? "Custom expiry" : null,
      });

      saveEventSettings(gallery.id, {
        startDate,
        endDate,
        eventType,
        eventLocation: eventLocation.trim() || null,
        description: description.trim() || null,
        published,
        photoSellingEnabled: false,
        reelitAiEnabled: false,
        brandingEnabled,
        expiryDate: expiryDate || null,
        fullAccessPin: fullAccessPin.trim() || null,
        guestPin: guestPin.trim() || null,
        allowSingleDownload,
        allowBulkDownload,
        whatsappEnabled,
        emailEnabled,
        oneQrEnabled,
        oneQrRequirePin,
        oneQrAccessLevel,
        galleryAppEnabled,
        livenessDetectionEnabled,
      });

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
      <section className="rounded-[28px] border border-[#d7e8e1] bg-white p-6 shadow-[0_20px_55px_rgba(16,39,32,0.08)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f766e]">
          {isEditMode ? "Edit Event" : "Create Event"}
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-[#101c19] sm:text-4xl">
          {isEditMode ? "Update your Pixora event" : "Build a new Pixora event"}
        </h1>
        <p className="mt-2 text-sm text-[#5e7b72]">
          {isEditMode
            ? "Adjust event details, access controls, and delivery behavior from one professional control board."
            : "Shape your event flow with Pixora controls: define event details, brand the experience, then tune access and delivery rules."}
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_80px_1fr] sm:items-center">
          <div className="rounded-2xl border border-[#d4e8de] bg-[#eff9f4] px-4 py-3 text-sm font-semibold text-[#1a4539]">
            1. Event Details
          </div>
          <div className="hidden h-px bg-[#dce9e3] sm:block" />
          <div className="rounded-2xl border border-[#dce9e3] bg-[#f7fbf9] px-4 py-3 text-sm font-semibold text-[#5f7c73]">
            2. Advanced Control Board
          </div>
        </div>
      </section>

      <form onSubmit={onSubmit} className="space-y-6">
        {loadingEditData ? (
          <div className="rounded-xl border border-[#d6e8df] bg-[#f4fbf8] px-4 py-3 text-sm font-medium text-[#2d4f46]">
            Loading event details...
          </div>
        ) : null}

        <section className="rounded-3xl border border-[#d9e8e2] bg-white p-6 shadow-[0_10px_30px_rgba(16,39,32,0.06)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-[#173029]">Event Details</h2>
              <p className="mt-1 text-sm text-[#68857c]">Capture your core event information.</p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-[#d6e8df] bg-[#f5fbf8] px-3 py-1">
              <span className="text-xs font-semibold text-[#517268]">Published</span>
              <Toggle checked={published} onChange={setPublished} />
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label className="text-sm font-semibold text-[#2d4f46]">Event Name</label>
              <input
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Enter event name"
                className="mt-1 h-12 w-full rounded-xl border border-[#d5e7df] bg-white px-4 text-sm text-[#1a352d] outline-none focus:border-[#0f766e]"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-[#2d4f46]">
                Start Date
                <div className="relative mt-1">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6f8b82]" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-12 w-full rounded-xl border border-[#d5e7df] bg-white pl-10 pr-3 text-sm text-[#1a352d] outline-none focus:border-[#0f766e]"
                  />
                </div>
              </label>
              <label className="text-sm font-semibold text-[#2d4f46]">
                End Date
                <div className="relative mt-1">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6f8b82]" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-12 w-full rounded-xl border border-[#d5e7df] bg-white pl-10 pr-3 text-sm text-[#1a352d] outline-none focus:border-[#0f766e]"
                  />
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-[#2d4f46]">
                Event Type
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="mt-1 h-12 w-full rounded-xl border border-[#d5e7df] bg-white px-3 text-sm text-[#1a352d] outline-none focus:border-[#0f766e]"
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-[#2d4f46]">
                Event Location
                <div className="relative mt-1">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6f8b82]" />
                  <input
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                    placeholder="Add location or virtual link"
                    className="h-12 w-full rounded-xl border border-[#d5e7df] bg-white pl-10 pr-3 text-sm text-[#1a352d] outline-none focus:border-[#0f766e]"
                  />
                </div>
              </label>
            </div>

            <label className="text-sm font-semibold text-[#2d4f46]">
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add event description (optional)"
                className="mt-1 min-h-24 w-full rounded-xl border border-[#d5e7df] bg-white px-4 py-3 text-sm text-[#1a352d] outline-none focus:border-[#0f766e]"
              />
            </label>
          </div>
        </section>

        <section className="rounded-3xl border border-[#d9e8e2] bg-white p-6 shadow-[0_10px_30px_rgba(16,39,32,0.06)]">
          <div className="relative overflow-hidden rounded-2xl border border-[#d6e8df] bg-[linear-gradient(140deg,#f7fcfa_0%,#eef8f4_55%,#f3f8ff_100%)] p-5">
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#0f766e]/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-14 left-8 h-36 w-36 rounded-full bg-[#2563eb]/10 blur-2xl" />
            <SectionHeader
              icon={<BadgeCheck className="h-5 w-5" />}
              title="Brand Experience Kit"
              subtitle="Give this event a distinctive Pixora look and feel."
              trailing={<Toggle checked={brandingEnabled} onChange={setBrandingEnabled} />}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-[#cde6dc] bg-white/80 px-3 py-1 text-xs font-semibold text-[#2d4f46]">
                Personalized cover
              </span>
              <span className="rounded-full border border-[#cde6dc] bg-white/80 px-3 py-1 text-xs font-semibold text-[#2d4f46]">
                Brand color accents
              </span>
              <span className="rounded-full border border-[#cde6dc] bg-white/80 px-3 py-1 text-xs font-semibold text-[#2d4f46]">
                Consistent delivery style
              </span>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[30px] border border-[#d5e6df] bg-white shadow-[0_18px_44px_rgba(16,39,32,0.09)]">
          <div className="relative">
            <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-[#0f766e]/12 blur-2xl" />
            <div className="pointer-events-none absolute -left-16 bottom-0 h-36 w-36 rounded-full bg-[#2563eb]/10 blur-2xl" />
            <button
              type="button"
              onClick={() => setAdvancedOpen((current) => !current)}
              className="relative flex w-full items-center justify-between gap-4 px-6 py-6 text-left md:px-7"
            >
              <div>
                <p className="inline-flex items-center rounded-full border border-[#cde3d9] bg-[#f4fbf8] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#335a4f]">
                  Event Intelligence
                </p>
                <p className="mt-3 text-xl font-semibold text-[#163129]">Advanced Control Board</p>
                <p className="mt-1 text-sm text-[#5f7c73]">
                  Fine-tune permissions, access, delivery behavior, and communication from one panel.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#cfe2d8] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#34574d]">
                {advancedOpen ? "Collapse" : "Expand"}
                {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </span>
            </button>
          </div>

          {advancedOpen ? (
            <div className="border-t border-[#e2eee8] bg-[linear-gradient(160deg,#fbfdfc_0%,#f3faf7_56%,#f4f8ff_100%)] px-6 pb-6 pt-5 md:px-7">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <article className="rounded-2xl border border-[#d7e7e0] bg-white p-5 shadow-[0_8px_22px_rgba(16,39,32,0.06)]">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf8f3] text-[#0f766e]">
                      <ShieldCheck className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-base font-semibold text-[#173029]">Security Envelope</p>
                      <p className="text-xs text-[#6a877e]">Control event entry and protected access.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <label className="text-sm font-semibold text-[#2d4f46]">
                      Expiry Date
                      <input
                        type="date"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        className="mt-1 h-11 w-full rounded-xl border border-[#d7e6df] bg-[#f9fcfa] px-3 text-sm text-[#1a352d] outline-none focus:border-[#0f766e]"
                      />
                    </label>
                    <label className="text-sm font-semibold text-[#2d4f46]">
                      Full Access PIN
                      <input
                        value={fullAccessPin}
                        onChange={(e) => setFullAccessPin(e.target.value)}
                        placeholder="For admins"
                        className="mt-1 h-11 w-full rounded-xl border border-[#d7e6df] bg-[#f9fcfa] px-3 text-sm text-[#1a352d] outline-none focus:border-[#0f766e]"
                      />
                    </label>
                    <label className="text-sm font-semibold text-[#2d4f46]">
                      Guest PIN
                      <input
                        value={guestPin}
                        onChange={(e) => setGuestPin(e.target.value)}
                        placeholder="For guests"
                        className="mt-1 h-11 w-full rounded-xl border border-[#d7e6df] bg-[#f9fcfa] px-3 text-sm text-[#1a352d] outline-none focus:border-[#0f766e]"
                      />
                    </label>
                  </div>
                </article>

                <article className="rounded-2xl border border-[#d7e7e0] bg-white p-5 shadow-[0_8px_22px_rgba(16,39,32,0.06)]">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf6ff] text-[#2563eb]">
                      <LockKeyhole className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-base font-semibold text-[#173029]">Download Rules</p>
                      <p className="text-xs text-[#6a877e]">Set how clients can collect delivered files.</p>
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

                <article className="rounded-2xl border border-[#d7e7e0] bg-white p-5 shadow-[0_8px_22px_rgba(16,39,32,0.06)]">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef7f3] text-[#0f766e]">
                      <Megaphone className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-base font-semibold text-[#173029]">Broadcast Center</p>
                      <p className="text-xs text-[#6a877e]">Choose where event updates are sent.</p>
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

                <article className="rounded-2xl border border-[#d7e7e0] bg-white p-5 shadow-[0_8px_22px_rgba(16,39,32,0.06)]">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf6ff] text-[#2563eb]">
                      <QrCode className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-base font-semibold text-[#173029]">QR Gateway</p>
                      <p className="text-xs text-[#6a877e]">Fine-tune access behavior for One QR links.</p>
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
                    <div className="rounded-xl border border-[#e2eee8] bg-[#fbfdfc] px-4 py-3">
                      <p className="text-sm font-semibold text-[#1f3f36]">Access Level</p>
                      <p className="mt-1 text-xs text-[#6f8b82]">Choose visitor permission when opening from QR.</p>
                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => setOneQrAccessLevel("full")}
                          disabled={!oneQrEnabled}
                          className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                            oneQrAccessLevel === "full"
                              ? "border-[#0f766e] bg-[#eaf8f2] text-[#0f766e]"
                              : "border-[#d6e8df] bg-white text-[#36574d]"
                          } ${!oneQrEnabled ? "cursor-not-allowed opacity-60" : ""}`}
                        >
                          Full Access
                        </button>
                        <button
                          type="button"
                          onClick={() => setOneQrAccessLevel("guest")}
                          disabled={!oneQrEnabled}
                          className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                            oneQrAccessLevel === "guest"
                              ? "border-[#0f766e] bg-[#eaf8f2] text-[#0f766e]"
                              : "border-[#d6e8df] bg-white text-[#36574d]"
                          } ${!oneQrEnabled ? "cursor-not-allowed opacity-60" : ""}`}
                        >
                          Guest Access
                        </button>
                      </div>
                    </div>
                  </div>
                </article>

                <article className="rounded-2xl border border-[#d7e7e0] bg-white p-5 shadow-[0_8px_22px_rgba(16,39,32,0.06)] xl:col-span-2">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef7f3] text-[#0f766e]">
                      <Smartphone className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-base font-semibold text-[#173029]">Experience Lab</p>
                      <p className="text-xs text-[#6a877e]">Control app-like delivery and identity safeguards.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <ControlToggleRow
                      title="Enable Gallery App"
                      description="Allow guests to install this event as a mobile app."
                      value={galleryAppEnabled}
                      onChange={setGalleryAppEnabled}
                    />
                    <ControlToggleRow
                      title="Enable Liveness Detection"
                      description="Validate guest identity before selfie capture."
                      value={livenessDetectionEnabled}
                      onChange={setLivenessDetectionEnabled}
                    />
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
            className="rounded-xl border border-[#d5e7df] bg-white px-5 py-2.5 text-sm font-semibold text-[#2d5046] transition hover:border-[#0f766e] hover:text-[#0f766e]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-xl bg-[#0f766e] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#115e59] disabled:cursor-not-allowed disabled:opacity-60"
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
          <section className="rounded-[28px] border border-[#d7e8e1] bg-white p-6 shadow-[0_20px_55px_rgba(16,39,32,0.08)] md:p-8">
            <p className="text-sm font-medium text-[#5f7c73]">Loading create event tools...</p>
          </section>
        </div>
      }
    >
      <CreateEventsPageContent />
    </Suspense>
  );
}
