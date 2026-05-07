import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import fetchWithRetry from "@/lib/fetchWithRetry";

export async function proxy(req: NextRequest) {
  if (req.nextUrl.pathname === "/dashboard" || req.nextUrl.pathname === "/dashboard/drive") {
    try {
      const res = await fetchWithRetry(new URL("/api/galleries", req.url).toString(), {
        cache: "no-store",
        headers: {
          cookie: req.headers.get("cookie") ?? "",
        },
      }, { dedupeKey: `proxy:galleries` });

      if (!res.ok) {
        return NextResponse.next();
      }

      const galleries = await res.json();

      if (req.nextUrl.pathname === "/dashboard/drive" && (!Array.isArray(galleries) || galleries.length === 0)) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    } catch (error) {
      console.error("Dashboard proxy check failed:", error);
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}
