"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Copy, Download, ExternalLink, QrCode, RefreshCw } from "lucide-react";
import { MinimalGallery } from "@/types/DriveTableTypes";
import { buildClientGalleryUrl } from "@/lib/client-gallery-url";

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
  const [galleries, setGalleries] = useState<GalleryWithSlug[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;

    const loadGalleries = async () => {
      try {
        const response = await fetch("/api/galleries");
        const contentType = response.headers.get("content-type") ?? "";
        if (!response.ok || !contentType.includes("application/json")) {
          if (active) setGalleries([]);
          return;
        }

        const payload = (await response.json()) as GalleryWithSlug[] | { error?: string };
        if (!active) return;
        const rows = Array.isArray(payload) ? payload : [];
        setGalleries(rows);
        if (rows[0]) setSelectedId(rows[0].id);
      } catch {
        if (active) setGalleries([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadGalleries();
    return () => {
      active = false;
    };
  }, []);

  const selectedGallery = useMemo(
    () => galleries.find((gallery) => gallery.id === selectedId) ?? null,
    [galleries, selectedId]
  );

  const publicGalleryUrl = useMemo(() => {
    if (!selectedGallery) return "";
    const slug = selectedGallery.slug || selectedGallery.id;
    const runtimeOrigin = typeof window === "undefined" ? undefined : window.location.origin;
    return buildClientGalleryUrl(slug, runtimeOrigin);
  }, [selectedGallery]);

  const qrImageUrl = useMemo(() => {
    if (!publicGalleryUrl) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(publicGalleryUrl)}`;
  }, [publicGalleryUrl]);

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

  const downloadQr = () => {
    if (!qrImageUrl || !selectedGallery || typeof document === "undefined") return;
    const anchor = document.createElement("a");
    anchor.href = qrImageUrl;
    anchor.download = `${selectedGallery.name.replace(/\s+/g, "-").toLowerCase()}-qr.png`;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <section className="rounded-[28px] border border-[#d8e8e2] bg-white p-6 shadow-[0_20px_55px_rgba(16,39,32,0.08)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f766e]">QR Code Delivery</p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-[#101c19] sm:text-4xl">Share event access with QR</h1>
        <p className="mt-3 max-w-2xl text-sm text-[#57726a] sm:text-base">
          Select a gallery, generate a QR code, and place it on invitation cards, venue stands, or WhatsApp messages
          for instant client access.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
        <article className="rounded-3xl border border-[#d9e8e2] bg-white p-6 shadow-[0_10px_30px_rgba(16,39,32,0.06)]">
          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6a857d]">
            Choose Event
            <select
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-[#d5e7df] bg-white px-3 text-sm text-[#1e3832] outline-none focus:border-[#0f766e]"
              disabled={loading || galleries.length === 0}
            >
              {galleries.map((gallery) => (
                <option key={gallery.id} value={gallery.id}>
                  {gallery.name}
                </option>
              ))}
            </select>
          </label>

          {loading ? (
            <div className="mt-6 h-40 animate-pulse rounded-2xl border border-[#e4efe9] bg-[#f7fbf9]" />
          ) : selectedGallery ? (
            <div className="mt-6 rounded-2xl border border-[#e3eee8] bg-[#f7fbf9] p-5">
              <p className="text-sm font-semibold text-[#1a352e]">{selectedGallery.name}</p>
              <p className="mt-1 text-xs text-[#6d887f]">
                Created {formatDate(selectedGallery.createdAt)} - {selectedGallery.filesCount ?? 0} photos
              </p>
              <p className="mt-4 break-all rounded-xl border border-[#d9e8e1] bg-white px-3 py-2 text-xs text-[#49665d]">
                {publicGalleryUrl}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void copyLink()}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#115e59]"
                >
                  <Copy className="h-4 w-4" />
                  {copied ? "Copied" : "Copy Link"}
                </button>
                <button
                  type="button"
                  onClick={downloadQr}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#d6e7df] bg-white px-4 py-2 text-sm font-semibold text-[#27453e] transition hover:border-[#0f766e] hover:text-[#0f766e]"
                >
                  <Download className="h-4 w-4" />
                  Download QR
                </button>
                <Link
                  href={publicGalleryUrl}
                  target="_blank"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#d6e7df] bg-white px-4 py-2 text-sm font-semibold text-[#27453e] transition hover:border-[#0f766e] hover:text-[#0f766e]"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Gallery
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-[#d2e4db] bg-[#f9fcfa] p-6 text-center text-sm text-[#648178]">
              No events available yet. Create an event first to generate a QR code.
            </div>
          )}
        </article>

        <article className="rounded-3xl border border-[#d9e8e2] bg-white p-6 text-center shadow-[0_10px_30px_rgba(16,39,32,0.06)]">
          <div className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf7f3] text-[#0f766e]">
            <QrCode className="h-6 w-6" />
          </div>
          <h2 className="mt-3 text-xl font-semibold text-[#132723]">QR Preview</h2>
          <p className="mt-1 text-sm text-[#607d74]">Scan to open the selected event gallery.</p>

          {qrImageUrl ? (
            <div className="mx-auto mt-5 w-fit rounded-3xl border border-[#dcebe4] bg-[#f8fbf9] p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrImageUrl} alt="Gallery QR code" className="h-64 w-64 rounded-2xl bg-white p-3" />
            </div>
          ) : (
            <div className="mt-5 flex h-72 items-center justify-center rounded-3xl border border-dashed border-[#d4e6dd] bg-[#f9fcfa] text-sm text-[#66857b]">
              Waiting for event selection
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              if (selectedGallery) setSelectedId(selectedGallery.id);
            }}
            className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#d6e7df] bg-white px-4 py-2 text-sm font-semibold text-[#27453e] transition hover:border-[#0f766e] hover:text-[#0f766e]"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </article>
      </section>
    </div>
  );
}
