import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  if (req.nextUrl.pathname === "/dashboard" || req.nextUrl.pathname === "/dashboard/drive") {
    try {
      const res = await fetch(new URL("/api/galleries", req.url), {
        cache: "no-store",
        headers: {
          cookie: req.headers.get("cookie") ?? "",
        },
      });

      if (!res.ok) {
        return NextResponse.next();
      }

      const galleries = await res.json();

      if (req.nextUrl.pathname === "/dashboard" && Array.isArray(galleries) && galleries.length > 0) {
        return NextResponse.redirect(new URL("/dashboard/drive", req.url));
      }

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
