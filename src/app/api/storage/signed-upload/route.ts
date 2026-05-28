import { createSignedGalleryImageUpload, isStorageConfigured } from "@/lib/storage";
import { rejectCrossOriginWrite } from "@/lib/request-security";
import { getSessionEmailFromRequestAsync } from "@/lib/session";
import { withApiHandler } from "@/lib/withApiHandler";
import { withRateLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export const POST = withApiHandler(
  withRateLimit(async (req: NextRequest) => {
    const blocked = rejectCrossOriginWrite(req);
    if (blocked) return blocked;

    const email = await getSessionEmailFromRequestAsync(req);
    if (!email) {
      return NextResponse.json({ ok: false, message: "Session expired. Please log in again." }, { status: 401 });
    }

    if (!isStorageConfigured()) {
      return NextResponse.json({ ok: false, message: "Media storage is not configured." }, { status: 503 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      fileName?: unknown;
      contentType?: unknown;
    };
    const fileName = String(body.fileName ?? "upload").trim().slice(0, 180) || "upload";
    const contentType = String(body.contentType ?? "application/octet-stream").trim().slice(0, 120);
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ ok: false, message: "Only image uploads are supported." }, { status: 400 });
    }

    const upload = createSignedGalleryImageUpload({ fileName, contentType });
    return NextResponse.json({ ok: true, upload });
  }, { keyPrefix: "storage:signed-upload", limit: 200, windowMs: 15 * 60 * 1000 })
);
