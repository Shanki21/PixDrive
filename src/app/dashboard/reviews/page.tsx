"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import fetchWithRetry from "@/lib/fetchWithRetry";
import { ArrowUpDown, Info, MessageCircleMore, MoreVertical, PencilLine, Search, Trash2 } from "lucide-react";
import { MinimalGallery } from "@/types/DriveTableTypes";
import { buildClientGalleryUrl } from "@/lib/client-gallery-url";

type ReviewRecord = {
  id: string;
  galleryId: string;
  galleryName: string;
  reviewerName: string;
  socialLink?: string;
  text: string;
  categories?: string[];
  clientIp?: string | null;
  clientLocation?: string | null;
  userAgent?: string | null;
  createdAt: string;
  published: boolean;
};

const CATEGORY_OPTIONS = [
  "Weddings",
  "Portraits",
  "Families",
  "Couples",
  "Events",
  "Editorial",
  "Studio",
  "Outdoor",
];

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB");
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [galleries, setGalleries] = useState<MinimalGallery[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [editing, setEditing] = useState<ReviewRecord | null>(null);
  const [editingImageUrl, setEditingImageUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"main" | "categories" | "info">("main");
  const [categoriesDraft, setCategoriesDraft] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [socialDraft, setSocialDraft] = useState("");
  const [textDraft, setTextDraft] = useState("");
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetchWithRetry("/api/galleries/reviews", { cache: "no-store" }, { dedupeKey: `client:reviews:load` });
        if (!res.ok) throw new Error("Unable to load reviews.");
        const data = await res.json();
        if (!active) return;
        setReviews(Array.isArray(data.reviews) ? data.reviews : []);
        setPageError(null);
      } catch {
        if (active) {
          setReviews([]);
          setPageError("Unable to load reviews right now.");
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchWithRetry("/api/galleries", {}, { dedupeKey: `client:galleries:list` });
        const contentType = res.headers.get("content-type") ?? "";
        if (!res.ok || !contentType.includes("application/json")) return;
        const rows = (await res.json()) as MinimalGallery[];
        setGalleries(Array.isArray(rows) ? rows : []);
      } catch {
        // Ignore gallery load failures.
      }
    };
    load();
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpenFor(null);
      }
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  const galleryMap = useMemo(() => {
    const map = new Map<string, MinimalGallery>();
    galleries.forEach((gallery) => map.set(gallery.id, gallery));
    return map;
  }, [galleries]);

  const reviewCount = reviews.length;

  const openEdit = (review: ReviewRecord, imageUrl?: string) => {
    setEditing(review);
    setNameDraft(review.reviewerName);
    setSocialDraft(review.socialLink ?? "");
    setTextDraft(review.text);
    setEditingImageUrl(imageUrl ?? null);
    setCategoriesDraft(review.categories ?? []);
    setActiveTab("main");
  };

  const saveEdit = async () => {
    if (!editing) return;
    setPageError(null);

      try {
        const dedupe = `review:patch:${editing.galleryId}:${editing.id}`;
        const res = await fetchWithRetry(
          `/api/galleries/${encodeURIComponent(editing.galleryId)}/reviews/${encodeURIComponent(editing.id)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reviewerName: nameDraft.trim(),
              socialLink: socialDraft.trim(),
              text: textDraft.trim(),
              categories: categoriesDraft,
            }),
          }, { dedupeKey: dedupe, idempotencyKey: dedupe }
        );

        if (!res.ok) {
          throw new Error("Unable to save review changes.");
        }

        const data = await res.json();
        setReviews((prev) => prev.map((review) => (review.id === editing.id ? data.review : review)));
        setEditing(null);
        setEditingImageUrl(null);
        setActiveTab("main");
      } catch {
        setPageError("Unable to save review changes right now.");
      }
  };

  const togglePublished = (id: string) => {
    const target = reviews.find((r) => r.id === id);
    if (!target) return;
    const newValue = !target.published;

    void (async () => {
      try {
        setPageError(null);
        const dedupe = `review:togglePublished:${target.galleryId}:${id}:${String(newValue)}`;
        const res = await fetchWithRetry(
          `/api/galleries/${encodeURIComponent(target.galleryId)}/reviews/${encodeURIComponent(id)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ published: newValue }),
          }, { dedupeKey: dedupe, idempotencyKey: dedupe }
        );
        if (!res.ok) {
          throw new Error("Unable to update review visibility.");
        }

        const data = await res.json();
        setReviews((prev) => prev.map((review) => (review.id === id ? data.review : review)));
        setEditing((prev) => (prev && prev.id === id ? data.review : prev));
      } catch {
        setPageError("Unable to update review visibility right now.");
      }
    })();
  };

  const deleteReview = (id: string) => {
    const target = reviews.find((r) => r.id === id);
    if (!target) return;

    void (async () => {
      try {
        setPageError(null);
        const dedupe = `review:delete:${target.galleryId}:${id}`;
        const res = await fetchWithRetry(
          `/api/galleries/${encodeURIComponent(target.galleryId)}/reviews/${encodeURIComponent(id)}`,
          {
            method: "DELETE",
          }, { dedupeKey: dedupe, idempotencyKey: dedupe }
        );
        if (!res.ok) {
          throw new Error("Unable to delete review.");
        }

        setReviews((prev) => prev.filter((review) => review.id !== id));
        setEditing((prev) => (prev?.id === id ? null : prev));
      } catch {
        setPageError("Unable to delete review right now.");
      }
    })();
  };

  const filteredCategories = CATEGORY_OPTIONS.filter((category) =>
    category.toLowerCase().includes(categoryFilter.trim().toLowerCase())
  );

  const toggleCategory = (category: string) => {
    setCategoriesDraft((prev) => {
      if (prev.includes(category)) {
        return prev.filter((item) => item !== category);
      }
      if (prev.length >= 3) return prev;
      return [...prev, category];
    });
  };

  const createdLabel = editing ? new Date(editing.createdAt).toISOString() : "-";
  const infoLocation =
    editing?.clientLocation ||
    (editing && typeof window !== "undefined"
      ? buildClientGalleryUrl(
          editing.galleryId,
          galleryMap.get(editing.galleryId)?.customDomain ?? window.location.origin
        )
      : "-");
  const infoUserAgent = editing?.userAgent ?? "-";
  const infoIp = editing?.clientIp ?? "Unavailable";

  return (
    <div className="px-8 py-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#2a170d]">Reviews</h1>
          <p className="mt-1 text-sm text-[#8a7f73]">Review management</p>
        </div>
        <div className="text-xs text-[#8a7f73]">{reviewCount} reviews</div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#2a170d]">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#2a170d] shadow-sm">
          <MessageCircleMore className="h-4 w-4" />
        </span>
        Reviews
      </div>

      <div className="mt-4 rounded-2xl border border-[#f0e6db] bg-[#fffaf2] px-4 py-3 text-sm text-[#7a6a55]">
        At the moment, reviews are only displayed in the dashboard. In the future, it will be possible to
        publish reviews on a separate page.
      </div>

      {pageError ? (
        <div className="mt-4 rounded-2xl border border-[#f4c7cf] bg-[#fff4f6] px-4 py-3 text-sm font-medium text-[#b42318]">
          {pageError}
        </div>
      ) : null}

      <div className="mt-6 overflow-visible rounded-2xl border border-[#efe6dc] bg-white">
        <div className="grid grid-cols-[24px_2.2fr_3fr_1fr_1fr_40px] items-start gap-3 border-b border-[#efe6dc] px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#8a7f73]">
          <span />
          <span>Client</span>
          <span>Review</span>
          <span>Created</span>
          <span>Published</span>
          <span />
        </div>

        {reviews.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-[#8a7f73]">No reviews yet.</div>
        ) : (
          reviews.map((review) => {
            const gallery = galleryMap.get(review.galleryId);
            const imageUrl = gallery?.coverUrl ?? gallery?.firstPhotoUrl ?? "";
            return (
              <div
                key={review.id}
                className="grid grid-cols-[24px_2.2fr_3fr_1fr_1fr_40px] items-start gap-3 border-b border-[#f2ece4] px-6 py-4 text-sm text-[#2a170d] last:border-b-0"
              >
                <span className="mt-5 text-[#c4b6a7]">
                  <ArrowUpDown className="h-4 w-4" />
                </span>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 overflow-hidden rounded-xl bg-[#f2ece4]">
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl} alt={review.galleryName} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div>
                    <button
                      type="button"
                      className="text-left font-semibold text-[#2a170d] hover:underline"
                      onClick={() => openEdit(review, imageUrl)}
                    >
                      {review.reviewerName}
                    </button>
                    <p className="text-xs text-[#8a7f73]">{review.galleryName}</p>
                  </div>
                </div>
                <p className="w-80 whitespace-pre-wrap wrap-break-word text-sm text-[#4a433d]">{review.text}</p>
                <span className="text-sm text-[#4a433d]">{formatDate(review.createdAt)}</span>
                <button
                  type="button"
                  onClick={() => togglePublished(review.id)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                    review.published ? "bg-[#2a170d]" : "bg-[#d9cfc4]"
                  }`}
                  aria-label="Toggle publish"
                >
                  <span
                    className={`absolute left-1 h-3.5 w-3.5 rounded-full bg-white transition ${
                      review.published ? "translate-x-4" : ""
                    }`}
                  />
                </button>
                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setMenuOpenFor((prev) => (prev === review.id ? null : review.id))}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#6b645c] hover:bg-[#f7f3ee]"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {menuOpenFor === review.id ? (
                    <div className="absolute right-0 top-full z-20 mt-2 w-40 rounded-xl border border-[#efe6dc] bg-white shadow-lg">
                      <button
                        type="button"
                        className="flex w-full items-center z-30 gap-2 px-4 py-2 text-sm text-[#4a433d] hover:bg-[#f7f3ee]"
                        onClick={() => {
                          setMenuOpenFor(null);
                          openEdit(review, imageUrl);
                        }}
                      >
                        <PencilLine className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#e11d48] hover:bg-[#fde8ee]"
                        onClick={() => {
                          setMenuOpenFor(null);
                          deleteReview(review.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="review-modal-scroll relative w-full max-w-xl rounded-3xl bg-white px-5 py-6 shadow-2xl sm:max-w-2xl sm:px-7 sm:py-7 max-h-[90vh] overflow-y-auto pr-2">
            <button
              type="button"
              className="absolute right-5 top-5 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#efe6dc] text-[#6b645c]"
              onClick={() => {
                setEditing(null);
                setEditingImageUrl(null);
              }}
              aria-label="Close"
            >
              x
            </button>
            <h2 className="text-2xl font-semibold text-[#2a170d]">Edit a review</h2>
            <div className="mt-4 flex items-center gap-6 border-b border-[#efe6dc] text-sm font-semibold text-[#7a6a55]">
              <button
                type="button"
                className={`pb-3 ${activeTab === "main" ? "border-b-2 border-[#2a170d] text-[#2a170d]" : "text-[#7a6a55]"}`}
                onClick={() => setActiveTab("main")}
              >
                Main
              </button>
              <button
                type="button"
                className={`pb-3 ${activeTab === "categories" ? "border-b-2 border-[#2a170d] text-[#2a170d]" : "text-[#7a6a55]"}`}
                onClick={() => setActiveTab("categories")}
              >
                Categories
              </button>
              <button
                type="button"
                className={`pb-3 ${activeTab === "info" ? "border-b-2 border-[#2a170d] text-[#2a170d]" : "text-[#7a6a55]"}`}
                onClick={() => setActiveTab("info")}
              >
                Info
              </button>
            </div>

            {activeTab === "main" ? (
              <div className="mt-6 space-y-6">
                <div className="rounded-2xl border border-[#f3ece3] bg-[#fffdf9] p-5">
                  <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#8a7f73]">
                    Client name
                  </label>
                  <input
                    className="mt-2 h-12 w-full rounded-xl border border-[#e3d8cc] bg-white px-4 text-sm"
                    value={nameDraft}
                    onChange={(event) => setNameDraft(event.target.value)}
                    placeholder="Client name"
                  />
                  <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.2em] text-[#8a7f73]">
                    Profile link
                  </label>
                  <input
                    className="mt-2 h-12 w-full rounded-xl border border-[#e3d8cc] bg-white px-4 text-sm"
                    value={socialDraft}
                    onChange={(event) => setSocialDraft(event.target.value)}
                    placeholder="For example: https://facebook.com/..."
                  />
                </div>

                <div className="rounded-2xl border border-[#f3ece3] bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a7f73]">Client photo</p>
                  <div className="relative mt-4 overflow-hidden rounded-2xl border border-[#efe6dc] bg-[#f7f3ee]">
                    {editingImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={editingImageUrl} alt="Client" className="h-52 w-full object-cover sm:h-60" />
                    ) : (
                      <div className="flex h-52 items-center justify-center text-sm text-[#8a7f73] sm:h-60">
                        No image available
                      </div>
                    )}
                    <div className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs text-[#6b645c] shadow">
                      <span>Replace</span>
                      <span>Delete</span>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-[#a59786]">
                    Upload the client&apos;s avatar to make the comment page look more beautiful.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#f3ece3] bg-white p-5">
                  <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#8a7f73]">
                    Review text
                  </label>
                  <textarea
                    className="mt-2 min-h-32 w-full rounded-xl border border-[#e3d8cc] px-4 py-3 text-sm"
                    value={textDraft}
                    onChange={(event) => setTextDraft(event.target.value)}
                    placeholder="Review"
                  />
                </div>

                <div className="rounded-2xl border border-[#f3ece3] bg-white p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#2a170d]">Publish on site</p>
                      <p className="text-xs text-[#8a7f73]">If disabled, the review will not be published on the site.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePublished(editing.id)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                        editing.published ? "bg-[#2a170d]" : "bg-[#d9cfc4]"
                      }`}
                      aria-label="Toggle publish"
                    >
                      <span
                        className={`absolute left-1 h-3.5 w-3.5 rounded-full bg-white transition ${
                          editing.published ? "translate-x-4" : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === "categories" ? (
              <div className="mt-6 space-y-6">
                <div className="rounded-2xl border border-[#f3ece3] bg-[#fffdf9] p-5">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#e3d8cc] bg-white text-[#6b645c]">
                      <Info className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#2a170d]">Instructions for working with categories</p>
                      <button type="button" className="mt-1 text-sm font-semibold text-[#2a170d] underline">
                        View
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#f3ece3] bg-white p-5">
                  <p className="text-lg font-semibold text-[#2a170d]">Categories</p>
                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#e3d8cc] bg-white px-4 py-3">
                    <Search className="h-4 w-4 text-[#8a7f73]" />
                    <input
                      className="w-full bg-transparent text-sm outline-none"
                      placeholder="Search or add category"
                      value={categoryFilter}
                      onChange={(event) => setCategoryFilter(event.target.value)}
                    />
                  </div>
                  <p className="mt-3 text-sm text-[#8a7f73]">
                    Select or add categories, no more than 3 categories. Categories are used to group posts by topic.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {categoriesDraft.map((category) => (
                      <button
                        key={category}
                        type="button"
                        className="rounded-full border border-[#2a170d] bg-[#2a170d] px-3 py-1 text-xs font-semibold text-white"
                        onClick={() => toggleCategory(category)}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {filteredCategories.map((category) => {
                      const selected = categoriesDraft.includes(category);
                      const disabled = !selected && categoriesDraft.length >= 3;
                      return (
                        <button
                          key={category}
                          type="button"
                          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
                            selected
                              ? "border-[#2a170d] bg-[#2a170d] text-white"
                              : "border-[#e3d8cc] bg-white text-[#4a433d]"
                          } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
                          onClick={() => {
                            if (disabled) return;
                            toggleCategory(category);
                          }}
                        >
                          <span>{category}</span>
                          <span className="text-xs">{selected ? "Selected" : "Select"}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    className="mt-4 w-full rounded-xl border border-[#e3d8cc] bg-white px-4 py-3 text-left text-sm font-semibold text-[#2a170d]"
                  >
                    Edit categories
                  </button>
                </div>
              </div>
            ) : null}

            {activeTab === "info" ? (
              <div className="mt-6">
                <div className="rounded-2xl border border-[#f3ece3] bg-white p-6">
                  <div className="grid gap-4 text-sm text-[#4a433d]">
                    <div className="grid grid-cols-[140px_1fr] gap-4">
                      <span className="font-semibold text-[#2a170d]">Created</span>
                      <span className="text-[#6b645c]">{createdLabel}</span>
                    </div>
                    <div className="grid grid-cols-[140px_1fr] gap-4">
                      <span className="font-semibold text-[#2a170d]">Location</span>
                      <span className="text-[#6b645c] break-all">{infoLocation}</span>
                    </div>
                    <div className="grid grid-cols-[140px_1fr] gap-4">
                      <span className="font-semibold text-[#2a170d]">Client IP address</span>
                      <span className="text-[#6b645c]">{infoIp}</span>
                    </div>
                    <div className="grid grid-cols-[140px_1fr] gap-4">
                      <span className="font-semibold text-[#2a170d]">User-Agent</span>
                      <span className="text-[#6b645c] break-all">{infoUserAgent}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-xl border border-[#d9cfc4] px-6 py-2.5 text-sm font-semibold text-[#4a433d]"
                onClick={() => {
                  setEditing(null);
                  setEditingImageUrl(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-xl bg-[#2a170d] px-6 py-2.5 text-sm font-semibold text-white"
                onClick={saveEdit}
              >
                Save
              </button>
            </div>
            <style jsx>{`
              .review-modal-scroll {
                scrollbar-width: thin;
                scrollbar-color: #d9cfc4 transparent;
              }
              .review-modal-scroll::-webkit-scrollbar {
                width: 10px;
              }
              .review-modal-scroll::-webkit-scrollbar-track {
                background: transparent;
              }
              .review-modal-scroll::-webkit-scrollbar-thumb {
                background: #d9cfc4;
                border-radius: 999px;
                border: 3px solid transparent;
                background-clip: padding-box;
              }
            `}</style>
          </div>
        </div>
      ) : null}
    </div>
  );
}
