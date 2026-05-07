"use client";

import { useEffect, useState } from "react";
import fetchWithRetry from "@/lib/fetchWithRetry";
import { getClientGalleryBasePathForDisplay } from "@/lib/client-gallery-url";
import { MinimalGallery } from "@/types/DriveTableTypes";

type Tab = "main" | "products" | "reviews" | "contacts" | "privacy";
type StorageDuration = "14 days" | "1 month" | "3 months" | "6 months" | "1 year";

const STORAGE_OPTIONS: StorageDuration[] = [
    "14 days",
    "1 month",
    "3 months",
    "6 months",
    "1 year",
];

const PRODUCT_CATALOG = [
    { id: "frame-12x18", name: "12 x 18 Photo Frame", price: "INR 850" },
    { id: "frame-16x24", name: "16 x 24 Photo Frame", price: "INR 1,300" },
    { id: "album-premium", name: "Premium Photo Album", price: "INR 2,400" },
    { id: "canvas-20x30", name: "20 x 30 Canvas Print", price: "INR 3,200" },
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
    const runtimeOrigin = typeof window === "undefined" ? undefined : window.location.origin;
    const displayGalleryBaseUrl = getClientGalleryBasePathForDisplay(runtimeOrigin);
    const isEditMode = Boolean(initialGallery);
    const [tab, setTab] = useState<Tab>("main");
    const [isSaving, setIsSaving] = useState(false);

    // MAIN
    const [name, setName] = useState(initialGallery?.name ?? "");
    const [shootDate, setShootDate] = useState(initialGallery?.createdAt?.slice(0, 10) ?? "");
    const [allowOriginals, setAllowOriginals] = useState(true);
    const [addWatermark, setAddWatermark] = useState(false);
    const [galleryType, setGalleryType] = useState<"client" | "sales">("client");
    const [pricePerPhoto, setPricePerPhoto] = useState("");
    const [discountRows, setDiscountRows] = useState<Array<{ quantity: string; discount: string }>>([]);
    const [specifyLifetime, setSpecifyLifetime] = useState(initialGallery?.storageTimeLabel !== "Indefinite");
    const [storageTime, setStorageTime] = useState<StorageDuration>(
        normalizeStorageDuration(initialGallery?.storageTimeLabel)
    );

    // PRODUCTS
    const [showProducts, setShowProducts] = useState(false);
    const [productsDropdownOpen, setProductsDropdownOpen] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

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
        if (!open) return;
        setTab("main");
        setName(initialGallery?.name ?? "");
        setShootDate(initialGallery?.createdAt?.slice(0, 10) ?? "");
        setAllowOriginals(true);
        setAddWatermark(false);
        setGalleryType("client");
        setPricePerPhoto("");
        setDiscountRows([]);
        setSpecifyLifetime(initialGallery?.storageTimeLabel !== "Indefinite");
        setStorageTime(normalizeStorageDuration(initialGallery?.storageTimeLabel));
        setShowProducts(false);
        setProductsDropdownOpen(false);
        setSelectedProducts([]);
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
            alert("Event name is required.");
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
                    alert("Unable to update event settings. Please try again.");
                    return;
                }

                const data = await res.json();
                onUpdated?.({
                    ...initialGallery,
                    ...payload,
                    ...data,
                });
                onClose();
                return;
            }

            const res = await fetchWithRetry("/api/galleries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            }, { dedupeKey: `galleries:create:${trimmedName}`, idempotencyKey: `galleries:create:${Date.now()}` });

            if (!res.ok) {
                alert("Unable to create event. Please try again.");
                return;
            }

            const data = await res.json();
            onCreated({
                ...data,
                ...payload,
            });
            onClose();
        } catch (error) {
            console.error(error);
            alert("Something went wrong. Please try again.");
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
                    {["main", "products", "reviews", "contacts", "privacy"].map(t => (
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

                            {/* GALLERY TYPE */}
                            <Section>
                                <div>
                                    <p className="text-sm font-medium mb-2">Event type</p>

                                    <div className="grid grid-cols-2 gap-2 rounded-md bg-gray-100 p-1">
                                        <OptionButton active={galleryType === "client"} onClick={() => setGalleryType("client")}>
                                            Client delivery
                                        </OptionButton>
                                        <OptionButton active={galleryType === "sales"} onClick={() => setGalleryType("sales")}>
                                            Photo sales
                                        </OptionButton>
                                    </div>
                                </div>

                                {galleryType === "client" ? (
                                    <>
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
                                    </>
                                ) : (
                                    <div className="space-y-3">
                                        <Field label="Price per photo">
                                            <div className="relative">
                                                <input
                                                    className="w-full border rounded px-3 py-2 pr-8"
                                                    placeholder="Specify price per photo"
                                                    value={pricePerPhoto}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                        setPricePerPhoto(e.target.value)
                                                    }
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">?</span>
                                            </div>
                                        </Field>

                                        {discountRows.map((row, idx) => (
                                            <div key={idx} className="grid grid-cols-[1fr_1fr_36px] gap-2">
                                                <input
                                                    className="w-full border rounded px-3 py-2"
                                                    placeholder="e.g. 5"
                                                    value={row.quantity}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                        setDiscountRows((prev) =>
                                                            prev.map((r, i) => (i === idx ? { ...r, quantity: e.target.value } : r))
                                                        )
                                                    }
                                                />
                                                <input
                                                    className="w-full border rounded px-3 py-2"
                                                    placeholder="e.g. 15"
                                                    value={row.discount}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                        setDiscountRows((prev) =>
                                                            prev.map((r, i) => (i === idx ? { ...r, discount: e.target.value } : r))
                                                        )
                                                    }
                                                />
                                                <button
                                                    type="button"
                                                    className="border rounded text-red-500"
                                                    onClick={() =>
                                                        setDiscountRows((prev) => prev.filter((_, i) => i !== idx))
                                                    }
                                                >
                                                    x
                                                </button>
                                            </div>
                                        ))}

                                        <button
                                            type="button"
                                            className="w-full rounded border px-3 py-2 text-left text-sm hover:bg-gray-50"
                                            onClick={() =>
                                                setDiscountRows((prev) => [...prev, { quantity: "", discount: "" }])
                                            }
                                        >
                                            + Add discount
                                        </button>

                                        <div className="rounded border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-xs text-gray-700">
                                            To accept online payments, connect payment services.
                                        </div>
                                    </div>
                                )}
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

                    {/* PRODUCTS */}
                    {tab === "products" && (
                        <Section>
                            <Toggle label="Show products in event" value={showProducts} onChange={setShowProducts} />
                            {showProducts && (
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-sm font-medium">Products</p>
                                        <p className="text-xs text-gray-500">Up to 4 products can be shown in the event.</p>
                                    </div>

                                    <div className="relative">
                                        <button
                                            type="button"
                                            className="flex w-full items-center justify-between rounded border px-4 py-2.5 text-left"
                                            onClick={() => setProductsDropdownOpen((v) => !v)}
                                        >
                                            <span className="text-base">+ Add product</span>
                                            <span className="text-lg text-gray-600">?</span>
                                        </button>

                                        {productsDropdownOpen ? (
                                            <div className="absolute z-20 mt-1 max-h-44 w-full overflow-y-auto rounded border bg-white shadow-sm">
                                                {PRODUCT_CATALOG.map((product) => {
                                                    const selected = selectedProducts.includes(product.id);
                                                    return (
                                                        <button
                                                            key={product.id}
                                                            type="button"
                                                            className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 ${
                                                                selected ? "bg-blue-50" : ""
                                                            }`}
                                                            onClick={() => {
                                                                setSelectedProducts((prev) => {
                                                                    if (prev.includes(product.id)) {
                                                                        return prev.filter((id) => id !== product.id);
                                                                    }
                                                                    if (prev.length >= 4) return prev;
                                                                    return [...prev, product.id];
                                                                });
                                                            }}
                                                        >
                                                            <span className="inline-flex items-center gap-3">
                                                                <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-gray-100 text-xs">
                                                                    IMG
                                                                </span>
                                                                <span>{product.name}</span>
                                                            </span>
                                                            <span className="text-gray-700">{product.price}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ) : null}
                                    </div>

                                    {selectedProducts.length > 0 ? (
                                        <div className="space-y-1 rounded border bg-gray-50 p-2">
                                            {selectedProducts.map((id) => {
                                                const product = PRODUCT_CATALOG.find((p) => p.id === id);
                                                if (!product) return null;
                                                return (
                                                    <div key={id} className="flex items-center justify-between rounded bg-white px-3 py-2 text-sm">
                                                        <span>{product.name}</span>
                                                        <span className="text-gray-700">{product.price}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : null}
                                </div>
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
