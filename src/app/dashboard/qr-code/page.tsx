"use client";

import { useEffect, useMemo, useState } from "react";
import fetchWithRetry from "@/lib/fetchWithRetry";
import { loadGalleriesList, readCachedGalleries } from "@/lib/client-galleries-cache";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Copy, Download, ExternalLink, QrCode, RefreshCw } from "lucide-react";
import { filterShareReadyGalleries, buildQrApiUrl } from "@/lib/qr";
import { MinimalGallery } from "@/types/DriveTableTypes";
import { buildClientStudioUrl } from "@/lib/client-gallery-url";

type GalleryWithSlug = MinimalGallery & {
  slug?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function QrCodePage() {
  const searchParams = useSearchParams();
  const requestedEventId = (searchParams.get("event") ?? "").trim();
  const [galleries, setGalleries] = useState<GalleryWithSlug[]>(
    () => readCachedGalleries<GalleryWithSlug>() ?? []
  );
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrImageFailed, setQrImageFailed] = useState(false);

  useEffect(() => {
    let active = true;

    const loadGalleries = async (isRefresh = false) => {
      try {
        if (isRefresh && active) {
          setRefreshing(true);
        }
        const payload = await loadGalleriesList<GalleryWithSlug>({
          dedupeKey: isRefresh ? `client:galleries:list:refresh` : `client:galleries:list`,
          forceRefresh: isRefresh,
        });
        if (!active) return;
        const rows = payload;
        setGalleries(rows);
        if (rows[0]) {
          const firstShareReady = rows.find(
            (gallery) =>
              (gallery.published ?? true) &&
              (gallery.oneQrEnabled ?? true) &&
              (!gallery.expiresAt || new Date(gallery.expiresAt).getTime() > Date.now())
          );
          if (requestedEventId && rows.some((gallery) => gallery.id === requestedEventId)) {
            setSelectedId(requestedEventId);
          } else {
            setSelectedId(firstShareReady?.id ?? rows[0].id);
          }
        }
      } catch {
        if (active) setGalleries([]);
      } finally {
        if (active && isRefresh) {
          setRefreshing(false);
        }
        if (active) setLoading(false);
      }
    };

    void loadGalleries();
    return () => {
      active = false;
    };
  }, [requestedEventId]);

  const shareReadyGalleries = useMemo(() => filterShareReadyGalleries(galleries), [galleries]);

  const selectedGallery = useMemo(
    () => shareReadyGalleries.find((gallery) => gallery.id === selectedId) ?? null,
    [shareReadyGalleries, selectedId]
  );

  const publicGalleryUrl = useMemo(() => {
    if (!selectedGallery) return "";
    const runtimeOrigin = typeof window === "undefined" ? undefined : (selectedGallery.customDomain ?? window.location.origin);
    return buildClientStudioUrl(selectedGallery.userId || selectedGallery.id, runtimeOrigin);
  }, [selectedGallery]);

  const qrImageUrl = useMemo(() => {
    if (!publicGalleryUrl) return "";
    return buildQrApiUrl(publicGalleryUrl, 320);
  }, [publicGalleryUrl]);

  useEffect(() => {
    if (!selectedGallery && shareReadyGalleries[0]) {
      setSelectedId(shareReadyGalleries[0].id);
    }
  }, [selectedGallery, shareReadyGalleries]);

  useEffect(() => {
    setQrImageFailed(false);
  }, [qrImageUrl]);

  const copyLink = async () => {
    if (!publicGalleryUrl || typeof navigator === "undefined") return;
    try {
      await navigator.clipboard.writeText(publicGalleryUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const downloadQr = async () => {
    if (!qrImageUrl || !selectedGallery || typeof document === "undefined") return;
    try {
      const response = await fetchWithRetry(qrImageUrl, { method: "GET" }, { dedupeKey: `qr:download:${selectedId}` });
      if (!response.ok) throw new Error("QR fetch failed");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `${selectedGallery.name.replace(/\s+/g, "-").toLowerCase()}-qr.png`;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(qrImageUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <section className="rounded-[28px] border border-[#eadccf] bg-white p-6 shadow-[0_20px_55px_rgba(73,39,20,0.08)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a3f13]">QR Code Delivery</p>
        <h1 className="font-display mt-3 text-3xl font-bold text-[#2a170d] sm:text-4xl">Share event access with QR</h1>
        <p className="mt-3 max-w-2xl text-sm text-[#7a6a55] sm:text-base">
          Generate a studio QR that opens event selection first, then guides clients through the Get Your Photos form.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
        <article className="rounded-3xl border border-[#eadccf] bg-white p-6 shadow-[0_10px_30px_rgba(73,39,20,0.06)]">
          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8a735f]">
            Choose Event
            <select
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-[#ead7c5] bg-white px-3 text-sm text-[#3a2112] outline-none focus:border-[#7a3f13]"
              disabled={loading || shareReadyGalleries.length === 0}
            >
              {shareReadyGalleries.map((gallery) => (
                <option key={gallery.id} value={gallery.id}>
                  {gallery.name}
                </option>
              ))}
            </select>
          </label>

          {loading ? (
            <div className="mt-6 h-40 animate-pulse rounded-2xl border border-[#f0e4d7] bg-[#fffaf4]" />
          ) : selectedGallery ? (
            <div className="mt-6 rounded-2xl border border-[#f0e4d7] bg-[#fffaf4] p-5">
              <p className="text-sm font-semibold text-[#3a2112]">{selectedGallery.name}</p>
              <p className="mt-1 text-xs text-[#8a735f]">
                Created {formatDate(selectedGallery.createdAt)} - {selectedGallery.filesCount ?? 0} photos
              </p>
              <p className="mt-4 break-all rounded-xl border border-[#d9e8e1] bg-white px-3 py-2 text-xs text-[#7a6a55]">
                {publicGalleryUrl}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void copyLink()}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#7a3f13] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5b2b0c]"
                >
                  <Copy className="h-4 w-4" />
                  {copied ? "Copied" : "Copy Link"}
                </button>
                <button
                  type="button"
                  onClick={() => void downloadQr()}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#ead7c5] bg-white px-4 py-2 text-sm font-semibold text-[#5b3a23] transition hover:border-[#7a3f13] hover:text-[#7a3f13]"
                >
                  <Download className="h-4 w-4" />
                  Download QR
                </button>
                <Link
                  href={publicGalleryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#ead7c5] bg-white px-4 py-2 text-sm font-semibold text-[#5b3a23] transition hover:border-[#7a3f13] hover:text-[#7a3f13]"
                >
                  <ExternalLink className="h-4 w-4" />
                   Open Event Selector
                </Link>
              </div>
            </div>
          ) : galleries.length > 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-[#d2e4db] bg-[#fffdf8] p-6 text-center text-sm text-[#7a6a55]">
              No share-ready event found. Publish an event, enable One QR, and make sure it has not expired.
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-[#d2e4db] bg-[#fffdf8] p-6 text-center text-sm text-[#7a6a55]">
              No events available yet. Create an event first to generate a QR code.
            </div>
          )}
        </article>

        <article className="rounded-3xl border border-[#eadccf] bg-white p-6 text-center shadow-[0_10px_30px_rgba(73,39,20,0.06)]">
          <div className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#f4e5d3] text-[#7a3f13]">
            <QrCode className="h-6 w-6" />
          </div>
          <h2 className="mt-3 text-xl font-semibold text-[#2a170d]">QR Preview</h2>
          <p className="mt-1 text-sm text-[#7a6a55]">Scan to choose an event, submit details, and open the gallery.</p>

          {qrImageUrl && !qrImageFailed ? (
            <div className="mx-auto mt-5 w-fit rounded-3xl border border-[#dcebe4] bg-[#fffaf4] p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrImageUrl}
                alt="Gallery QR code"
                className="h-64 w-64 rounded-2xl bg-white p-3"
                onError={() => setQrImageFailed(true)}
              />
            </div>
          ) : (
            <div className="mt-5 flex h-72 items-center justify-center rounded-3xl border border-dashed border-[#d4e6dd] bg-[#fffdf8] text-sm text-[#7a6a55]">
              {selectedGallery
                ? "Unable to load QR preview right now. You can still copy the link."
                : "Waiting for event selection"}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              if (refreshing) return;
              setRefreshing(true);
              void (async () => {
                try {
                  const response = await fetchWithRetry("/api/galleries", { cache: "no-store" }, { dedupeKey: `client:galleries:list:refresh` });
                  const contentType = response.headers.get("content-type") ?? "";
                  if (!response.ok || !contentType.includes("application/json")) {
                    return;
                  }
                  const payload = (await response.json()) as GalleryWithSlug[] | { error?: string };
                  const rows = Array.isArray(payload) ? payload : [];
                  setGalleries(rows);
                } finally {
                  setRefreshing(false);
                }
              })();
            }}
            disabled={refreshing}
            className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#ead7c5] bg-white px-4 py-2 text-sm font-semibold text-[#5b3a23] transition hover:border-[#7a3f13] hover:text-[#7a3f13]"
          >
            <RefreshCw className="h-4 w-4" />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </article>
      </section>
    </div>
  );
}
