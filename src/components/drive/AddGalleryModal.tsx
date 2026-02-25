"use client";

import { useState } from "react";
import { MinimalGallery } from "@/types/DriveTableTypes";

type Tab = "main" | "favorites" | "products" | "reviews" | "contacts" | "privacy";
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
    const isEditMode = Boolean(initialGallery);
    const [tab, setTab] = useState<Tab>("main");

    // MAIN
    const [name, setName] = useState(initialGallery?.name ?? "");
    const [shootDate, setShootDate] = useState(initialGallery?.createdAt?.slice(0, 10) ?? "");
    const [allowOriginals, setAllowOriginals] = useState(true);
    const [specifyLifetime, setSpecifyLifetime] = useState(initialGallery?.storageTimeLabel !== "Indefinite");
    const [storageTime, setStorageTime] = useState<StorageDuration>(
        normalizeStorageDuration(initialGallery?.storageTimeLabel)
    );

    // FAVORITES
    const [enableFavorites, setEnableFavorites] = useState(initialGallery?.favoritesEnabled ?? false);
    const [favoritesName, setFavoritesName] = useState(initialGallery?.favoritesName ?? "Selecting photos");
    const [limitFavorites, setLimitFavorites] = useState(initialGallery?.favoritesLimitSelected ?? false);
    const [maxSelectedPhotos, setMaxSelectedPhotos] = useState(initialGallery?.favoritesMaxSelected ?? 1);
    const [allowComments, setAllowComments] = useState(false);

    // PRODUCTS
    const [showProducts, setShowProducts] = useState(false);

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

    if (!open) return null;

    async function handleAdd() {
        const now = new Date();
        const expiresAt = specifyLifetime ? addDurationToDate(now, storageTime).toISOString() : null;
        const payload = {
            name,
            shootDate,
            expiresAt,
            storageTimeLabel: specifyLifetime ? storageTime : "Indefinite",
            favoritesEnabled: enableFavorites,
            favoritesLimitSelected: limitFavorites,
            favoritesName,
            favoritesListsCount: enableFavorites ? 1 : 0,
            selectionCompletedCount: 0,
            favoritesMaxSelected: limitFavorites ? maxSelectedPhotos : null,
        };

        if (isEditMode && initialGallery) {
            onUpdated?.({
                ...initialGallery,
                ...payload,
            });
            onClose();
            return;
        }

        const res = await fetch("/api/galleries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const data = await res.json();
        onCreated({
            ...data,
            ...payload,
        });
        onClose();
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />

            <div className="bg-white w-100 rounded-xl shadow-xl relative">

                {/* HEADER */}
                <div className="flex justify-between items-center px-3 py-4 border-b">
                    <h2 className="text-lg font-semibold">{isEditMode ? "Gallery settings" : "New gallery"}</h2>
                    <button onClick={onClose}>âœ•</button>
                </div>

                {/* TABS */}
                <div className="flex gap-3 px-6 pt-4 border-b text-sm">
                    {["main", "favorites", "products", "reviews", "contacts", "privacy"].map(t => (
                        <button
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
                                <Field label="Gallery name">
                                    <input
                                        className="w-full border rounded px-3 py-2"
                                        placeholder="e.g. wedding"
                                        value={name}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            setName(e.target.value)
                                        }
                                    />
                                </Field>

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

                            {/* GALLERY TYPE */}
                            <Section>
                                <div>
                                    <p className="text-sm font-medium mb-2">Gallery type</p>

                                    <div className="flex gap-2">
                                        <OptionButton active>ðŸ“· Client gallery</OptionButton>
                                        <OptionButton>ðŸ›’ Photo sales</OptionButton>
                                    </div>
                                </div>

                                <ToggleRow
                                    title="Allow original file downloads"
                                    value={allowOriginals}
                                    onChange={setAllowOriginals}
                                />

                                <div className={!allowOriginals ? "" : "opacity-50"}>
                                    <ToggleRow
                                        title="Add watermark"
                                        description="Available only when downloads are disabled."
                                    />
                                </div>
                            </Section>

                            {/* LANGUAGE */}
                            <Section>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-sm font-medium">Gallery language</p>
                                        <p className="text-xs text-gray-500">English (default)</p>
                                    </div>

                                    <button className="border px-3 py-2 rounded-md text-sm flex items-center gap-2">
                                        ðŸŒ Change
                                    </button>
                                </div>
                            </Section>

                        </div>
                    )}

                    {/* FAVORITES */}
                    {tab === "favorites" && (
                        <div className="space-y-6">

                            {/* FAVORITES SETTINGS */}
                            <Section>

                                {/* Allow photo selection */}
                                <ToggleRow
                                    title="Allow photo selection"
                                    description="Clients can add files to Favorites to select photos for retouching, printing, and more."
                                    value={enableFavorites}
                                    onChange={setEnableFavorites}
                                />

                                {enableFavorites && (
                                    <div className="space-y-4 pt-3">

                                        <Field label="Favorites name">
                                            <input
                                                className="w-full border rounded px-3 py-2"
                                                value={favoritesName}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                    setFavoritesName(e.target.value)
                                                }
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                Clients will see this name when they create Favorites.
                                            </p>
                                        </Field>

                                        <ToggleRow
                                            title="Limit selected photos"
                                            value={limitFavorites}
                                            onChange={setLimitFavorites}
                                        />

                                        {limitFavorites && (
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium">Max selected photos</p>

                                                <div className="flex items-center justify-between border rounded px-3 py-2 w-44">
                                                    <button
                                                        type="button"
                                                        className="text-lg leading-none px-2"
                                                        onClick={() => setMaxSelectedPhotos(v => Math.max(1, v - 1))}
                                                    >
                                                        -
                                                    </button>
                                                    <span className="text-sm font-medium">
                                                        {maxSelectedPhotos}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        className="text-lg leading-none px-2"
                                                        onClick={() => setMaxSelectedPhotos(v => v + 1)}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <ToggleRow
                                            title="Allow comments"
                                            value={allowComments}
                                            onChange={setAllowComments}
                                        />

                                    </div>
                                )}

                            </Section>

                            {/* CLIENT INFO */}
                            {enableFavorites && (
                                <Section>

                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-sm font-medium">Client name</p>
                                            <p className="text-xs text-blue-600">Name format is set in the Drive settings.</p>
                                        </div>

                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                            ðŸ”’ Required
                                        </div>
                                    </div>

                                    <ToggleRow
                                        title="Require email"
                                        description="Clients will receive an email with a link to their Favorites."
                                        value={true}
                                        onChange={() => { }}
                                    />

                                    <ToggleRow
                                        title="Require phone number"
                                        value={false}
                                        onChange={() => { }}
                                    />

                                    <ToggleRow
                                        title="Require additional info"
                                        value={false}
                                        onChange={() => { }}
                                    />

                                    <p className="text-xs text-gray-500 pt-2">
                                        Client name is required. Enable extra fields if you need more details from the client.
                                    </p>

                                </Section>
                            )}

                        </div>
                    )}

                    {/* PRODUCTS */}
                    {tab === "products" && (
                        <Section>
                            <Toggle label="Show products in gallery" value={showProducts} onChange={setShowProducts} />
                            {showProducts && (
                                <div className="border rounded p-3 text-sm">+ Add product (UI placeholder)</div>
                            )}
                        </Section>
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
                    <button className="px-4 py-2 border rounded" onClick={onClose}>Cancel</button>
                    <button className="px-5 py-2 bg-black text-white rounded" onClick={handleAdd}>{isEditMode ? "Save" : "Add"}</button>
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
                onClick={() => onChange && onChange(!value)}
                className={`w-10 h-6 rounded-full p-1 transition
        ${value ? "bg-black" : "bg-gray-300"}`}
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
                onClick={() => onChange(!value)}
                className={`w-10 h-6 rounded-full p-1 ${value ? "bg-black" : "bg-gray-300"}`}
            >
                <div className={`w-4 h-4 bg-white rounded-full ${value ? "translate-x-4" : ""}`} />
            </button>
        </div>
    );
}

