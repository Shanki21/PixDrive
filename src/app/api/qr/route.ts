import { normalizeQrSize } from "@/lib/qr";
import { NextRequest, NextResponse } from "next/server";
import fetchWithRetry from "@/lib/fetchWithRetry";

export const runtime = "nodejs";

const MAX_DATA_LENGTH = 2500;
const REQUEST_TIMEOUT_MS = 7000;

function buildProviderUrls(data: string, size: number) {
  const encodedData = encodeURIComponent(data);
  return [
    `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedData}`,
    `https://quickchart.io/qr?size=${size}&text=${encodedData}&format=png&ecLevel=M`,
  ];
}

async function fetchQrImage(url: string) {
  const response = await fetchWithRetry(url, {
    method: "GET",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  }, { dedupeKey: `qr:${url}` });
  if (!response.ok) {
    return null;
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    return null;
  }
  const bytes = await response.arrayBuffer();
  return {
    bytes,
    contentType,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const data = String(searchParams.get("data") ?? "").trim();
  const size = normalizeQrSize(searchParams.get("size"));

  if (!data) {
    return NextResponse.json({ error: "data is required" }, { status: 400 });
  }
  if (data.length > MAX_DATA_LENGTH) {
    return NextResponse.json({ error: "data is too long" }, { status: 413 });
  }

  const providerUrls = buildProviderUrls(data, size);
  for (const providerUrl of providerUrls) {
    try {
      const image = await fetchQrImage(providerUrl);
      if (!image) continue;
      return new NextResponse(image.bytes, {
        status: 200,
        headers: {
          "Content-Type": image.contentType,
          "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=259200",
        },
      });
    } catch {
      // Try fallback provider.
    }
  }

  return NextResponse.json({ error: "Unable to generate QR right now." }, { status: 502 });
}
