"use client";

import { useEffect, useState } from "react";
import fetchWithRetry from "@/lib/fetchWithRetry";
import { getApiErrorMessage, readApiErrorPayload } from "@/lib/api-response";
import { getClientGalleryBasePathForDisplay } from "@/lib/client-gallery-url";
import { showPixoraAlert, showPixoraToast } from "@/lib/pixora-alerts";
import { MinimalGallery } from "@/types/DriveTableTypes";

type Tab = "main" | "reviews" | "contacts" | "privacy";
type StorageDuration = "14 days" | "1 month" | "3 months" | "6 months" | "1 year";

const STORAGE_OPTIONS: StorageDuration[] = [
    "14 days",
    "1 month",
    "3 months",
    "6 months",
    "1 year",
];

function normalizeStorageDuration(value?: string | null): StorageDuration {
    if (value === "14 days" || value === "1 month" || value === "3 months" || value === "6 months" || value === "1 year") {
        return value;
    }

    return "1 month";
}

function addDurationToDate(baseDate: Date, duration: StorageDuration): Date {
    const date = new Date(baseDate);

    if (duration === "14 days") {
        date.setDate(date.getDate() + 14);
        return date;
    }

    if (duration === "1 month") {
        date.setMonth(date.getMonth() + 1);
        return date;
    }

    if (duration === "3 months") {
        date.setMonth(date.getMonth() + 3);
        return date;
    }

    if (duration === "6 months") {
        date.setMonth(date.getMonth() + 6);
        return date;
    }

    date.setFullYear(date.getFullYear() + 1);
    return date;
}

function redirectToLogin() {
    const next = `${window.location.pathname}${window.location.search}`;
    window.location.href = `/login?next=${encodeURIComponent(next)}`;
}

export default function AddGalleryModal({
    open,
    onClose,
    onCreated,
    onUpdated,
    initialGallery,
}: {
    open: boolean;
    onClose: () => void;
    onCreated: (g: MinimalGallery) => void;
    onUpdated?: (g: MinimalGallery) => void;
    initialGallery?: MinimalGallery | null;
}) {
    const runtimeOrigin = typeof window === "undefined" ? undefined : window.location.origin;
    const [customGalleryBaseUrl, setCustomGalleryBaseUrl] = useState("");
    const displayGalleryBaseUrl = customGalleryBaseUrl || getClientGalleryBasePathForDisplay(runtimeOrigin);
    const isEditMode = Boolean(initialGallery);
    const [tab, setTab] = useState<Tab>("main");
    const [isSaving, setIsSaving] = useState(false);

    // MAIN
    const [name, setName] = useState(initialGallery?.name ?? "");
    const [shootDate, setShootDate] = useState(initialGallery?.createdAt?.slice(0, 10) ?? "");
    const [allowOriginals, setAllowOriginals] = useState(true);
    const [addWatermark, setAddWatermark] = useState(false);
    const [specifyLifetime, setSpecifyLifetime] = useState(initialGallery?.storageTimeLabel !== "Indefinite");
    const [storageTime, setStorageTime] = useState<StorageDuration>(
        normalizeStorageDuration(initialGallery?.storageTimeLabel)
    );

    // REVIEWS
    const [allowReviews, setAllowReviews] = useState(false);
    const [reviewMessage, setReviewMessage] = useState("");
    const [askAfterDownload, setAskAfterDownload] = useState(false);

    // CONTACTS
    const [showShare, setShowShare] = useState(true);
    const [showCard, setShowCard] = useState(true);
    const [showNameWebsite, setShowNameWebsite] = useState(true);

    // PRIVACY
    const [passwordProtect, setPasswordProtect] = useState(false);
    const [password, setPassword] = useState("");
    const [guestAccess, setGuestAccess] = useState(false);

    useEffect(() => {
        let active = true;
        const loadCustomDomain = async () => {
            try {
                const response = await fetchWithRetry("/api/custom-domains", { cache: "no-store" }, { dedupeKey: "drive:custom-domains" });
                if (!response.ok) return;
                const data = (await response.json()) as { domains?: Array<{ domain?: string; verified?: boolean }> };
                const verified = data.domains?.find((domain) => domain.verified && domain.domain);
                if (active && verified?.domain) {
                    setCustomGalleryBaseUrl(`https://${verified.domain}/`);
                }
            } catch {
                // Keep the default Pixora gallery URL.
            }
        };
        void loadCustomDomain();
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!open) return;
        setTab("main");
        setName(initialGallery?.name ?? "");
        setShootDate(initialGallery?.createdAt?.slice(0, 10) ?? "");
        setAllowOriginals(true);
        setAddWatermark(false);
        setSpecifyLifetime(initialGallery?.storageTimeLabel !== "Indefinite");
        setStorageTime(normalizeStorageDuration(initialGallery?.storageTimeLabel));
        setAllowReviews(false);
        setReviewMessage("");
        setAskAfterDownload(false);
        setShowShare(true);
        setShowCard(true);
        setShowNameWebsite(true);
        setPasswordProtect(false);
        setPassword("");
        setGuestAccess(false);
    }, [open, initialGallery]);

    useEffect(() => {
        if (allowOriginals) {
            setAddWatermark(false);
        }
    }, [allowOriginals]);

    if (!open) return null;

    async function handleAdd() {
        const trimmedName = name.trim();
        if (!trimmedName) {
            void showPixoraAlert({
                title: "Event name is required",
                text: "Add a clear event name before saving this gallery.",
                icon: "warning",
            });
            return;
        }

        setIsSaving(true);
        const now = new Date();
        const expiresAt = specifyLifetime ? addDurationToDate(now, storageTime).toISOString() : null;
        const payload = {
            name: trimmedName,
            shootDate,
            expiresAt,
            storageTimeLabel: specifyLifetime ? storageTime : "Indefinite",
        };

        try {
            if (isEditMode && initialGallery) {
                const res = await fetchWithRetry(`/api/galleries/${initialGallery.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: trimmedName }),
                }, { dedupeKey: `galleries:update:${initialGallery.id}`, idempotencyKey: `galleries:update:${initialGallery.id}:${Date.now()}` });

                if (!res.ok) {
                    void showPixoraAlert({
                        title: "Unable to update event",
                        text: "Please try again in a moment.",
                        icon: "error",
                    });
                    return;
                }

                const data = await res.json();
                onUpdated?.({
                    ...initialGallery,
                    ...payload,
                    ...data,
                });
                void showPixoraToast({ title: "Event settings updated" });
                onClose();
                return;
            }

            const res = await fetchWithRetry("/api/galleries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            }, { dedupeKey: `galleries:create:${trimmedName}`, idempotencyKey: `galleries:create:${Date.now()}` });

            if (res.status === 401) {
                redirectToLogin();
                return;
            }

            if (!res.ok) {
                const payload = await readApiErrorPayload(res);
                const isPlanLimit = res.status === 402 || payload.code === "PLAN_LIMIT_REACHED";
                void showPixoraAlert({
                    title: isPlanLimit ? "Free Trial limit reached" : "Unable to create event",
                    text: getApiErrorMessage(payload, "Please check your connection and try again."),
                    icon: isPlanLimit ? "warning" : "error",
                });
                return;
            }

            const data = await res.json();
            onCreated({
                ...data,
                ...payload,
            });
            void showPixoraToast({ title: "Event created" });
            onClose();
        } catch (error) {
            console.error(error);
            void showPixoraAlert({
                title: "Something went wrong",
                text: "Please try again.",
                icon: "error",
            });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />

            <div className="bg-white w-[92vw] max-w-3xl rounded-xl shadow-xl relative">

                {/* HEADER */}
                <div className="flex justify-between items-center px-3 py-4 border-b">
                    <h2 className="text-lg font-semibold">{isEditMode ? "Event settings" : "New event"}</h2>
                    <button type="button" onClick={onClose} aria-label="Close">
                        x
                    </button>
                </div>

                {/* TABS */}
                <div className="flex gap-3 px-6 pt-4 border-b text-sm">
                    {["main", "reviews", "contacts", "privacy"].map(t => (
                        <button
                            type="button"
                            key={t}
                            onClick={() => setTab(t as Tab)}
                            className={`pb-3 capitalize ${tab === t ? "border-b-2 border-black font-medium" : "text-gray-400"
                                }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                {/* BODY */}
                <div className="p-4 space-y-6 max-h-[65vh] overflow-y-auto">

                    {/* MAIN */}
                    {tab === "main" && (
                        <div className="space-y-6">

                            {/* BASIC INFO */}
                            <Section>
                                <Field label="Event name">
                                    <input
                                        className="w-full border rounded px-3 py-2"
                                        placeholder="e.g. wedding"
                                        value={name}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            setName(e.target.value)
                                        }
                                    />
                                </Field>

                                {isEditMode && initialGallery ? (
                                    <Field label="Event link">
                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr]">
                                            <input
                                                className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-500"
                                                value={displayGalleryBaseUrl}
                                                disabled
                                                readOnly
                                            />
                                            <input
                                                className="w-full border rounded px-3 py-2"
                                                value={(initialGallery as MinimalGallery & { slug?: string }).slug ?? initialGallery.id}
                                                disabled
                                                readOnly
                                            />
                                        </div>
                                    </Field>
                                ) : null}

                                <Field label="Shoot date">
                                    <input
                                        type="date"
                                        className="w-full border rounded px-3 py-2"
                                        value={shootDate}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            setShootDate(e.target.value)
                                        }
                                    />
                                </Field>

                                <div>
                                    <p className="text-sm font-medium mb-2">Storage time</p>

                                    <div className="flex gap-2 mb-3">
                                        <OptionButton
                                            active={specifyLifetime}
                                            onClick={() => setSpecifyLifetime(true)}
                                        >
                                            Specify lifetime
                                        </OptionButton>
                                        <OptionButton
                                            active={!specifyLifetime}
                                            onClick={() => setSpecifyLifetime(false)}
                                        >
                                            Store indefinitely
                                        </OptionButton>
                                    </div>

                                    <select
                                        className="w-full border rounded px-3 py-2 disabled:bg-gray-100 disabled:text-gray-400"
                                        value={storageTime}
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                            setStorageTime(e.target.value as StorageDuration)
                                        }
                                        disabled={!specifyLifetime}
                                    >
                                        {STORAGE_OPTIONS.map(option => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </Section>

                            {/* DELIVERY OPTIONS */}
                            <Section>
                                <ToggleRow
                                    title="Allow original file downloads"
                                    value={allowOriginals}
                                    onChange={setAllowOriginals}
                                />

                                <div className={allowOriginals ? "opacity-50" : ""}>
                                    <ToggleRow
                                        title="Add watermark"
                                        description="Applied to photos. Available only when downloads are disabled."
                                        value={addWatermark}
                                        onChange={allowOriginals ? undefined : setAddWatermark}
                                    />
                                </div>
                            </Section>

                            {/* LANGUAGE */}
                            <Section>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-sm font-medium">Event language</p>
                                        <p className="text-xs text-gray-500">English (default)</p>
                                    </div>

                                    <button type="button" className="border px-3 py-2 rounded-md text-sm flex items-center gap-2">
                                        Change
                                    </button>
                                </div>
                            </Section>

                        </div>
                    )}

                    {/* REVIEWS */}
                    {tab === "reviews" && (
                        <Section>
                            <Toggle label="Allow reviews" value={allowReviews} onChange={setAllowReviews} />
                            {allowReviews && (
                                <>
                                    <Label>Review message</Label>
                                    <textarea
                                        className="w-full border rounded p-2"
                                        value={reviewMessage}
                                        onChange={e => setReviewMessage(e.target.value)}
                                    />
                                    <Toggle label="Ask for review after download" value={askAfterDownload} onChange={setAskAfterDownload} />
                                </>
                            )}
                        </Section>
                    )}

                    {/* CONTACTS */}
                    {tab === "contacts" && (
                        <Section>
                            <Toggle label="Show Share button" value={showShare} onChange={setShowShare} />
                            <Toggle label="Show Business card widget" value={showCard} onChange={setShowCard} />
                            <Toggle label="Show your name and website on cover" value={showNameWebsite} onChange={setShowNameWebsite} />
                        </Section>
                    )}

                    {/* PRIVACY */}
                    {tab === "privacy" && (
                        <Section>
                            <Toggle label="Protect with a password" value={passwordProtect} onChange={setPasswordProtect} />
                            {passwordProtect && (
                                <Input placeholder="Enter password" value={password} onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setPassword(e.target.value)
                                } />
                            )}
                            <Toggle label="Allow guest access" value={guestAccess} onChange={setGuestAccess} />
                        </Section>
                    )}

                </div>

                {/* FOOTER */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t">
                    <button type="button" className="px-4 py-2 border rounded" onClick={onClose} disabled={isSaving}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="px-5 py-2 bg-black text-white rounded disabled:opacity-60"
                        onClick={handleAdd}
                        disabled={isSaving}
                    >
                        {isSaving ? "Saving..." : isEditMode ? "Save" : "Add"}
                    </button>
                </div>

            </div>
        </div>
    );
}



/* ---------------- UI HELPERS ---------------- */

function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
                {label}
            </label>
            {children}
        </div>
    );
}

function OptionButton({
    children,
    active,
    onClick,
}: {
    children: React.ReactNode;
    active?: boolean;
    onClick?: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`px-4 py-2 border rounded-md text-sm transition
      ${active ? "border-black bg-white" : "border-gray-200 text-gray-500 hover:border-gray-400"}`}
        >
            {children}
        </button>
    );
}

function ToggleRow({
    title,
    description,
    value,
    onChange,
}: {
    title: string;
    description?: string;
    value?: boolean;
    onChange?: (v: boolean) => void;
}) {
    return (
        <div className="flex justify-between items-start gap-4">
            <div>
                <p className="text-sm font-medium">{title}</p>
                {description && (
                    <p className="text-xs text-gray-500">{description}</p>
                )}
            </div>

            <button
                type="button"
                onClick={() => onChange && onChange(!value)}
                disabled={!onChange}
                aria-disabled={!onChange}
                className={`w-10 h-6 rounded-full p-1 transition
        ${value ? "bg-black" : "bg-gray-300"} ${!onChange ? "cursor-not-allowed opacity-60" : ""}`}
            >
                <div
                    className={`w-4 h-4 bg-white rounded-full transition
          ${value ? "translate-x-4" : ""}`}
                />
            </button>
        </div>
    );
}

function Section({ children }: { children: React.ReactNode }) {
    return <div className="bg-gray-50 p-4 rounded space-y-3">{children}</div>;
}

function Label({ children }: { children: React.ReactNode }) {
    return <p className="text-sm font-medium">{children}</p>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} className="w-full border rounded px-3 py-2" />;
}

function Toggle({
    label,
    value,
    onChange,
}: {
    label: string;
    value: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div className="flex justify-between items-center">
            <span className="text-sm">{label}</span>
            <button
                type="button"
                onClick={() => onChange(!value)}
                className={`w-10 h-6 rounded-full p-1 ${value ? "bg-black" : "bg-gray-300"}`}
            >
                <div className={`w-4 h-4 bg-white rounded-full ${value ? "translate-x-4" : ""}`} />
            </button>
        </div>
    );
}
