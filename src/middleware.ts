import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/dashboard") {
    const res = await fetch("http://localhost:3000/api/galleries", {
      cache: "no-store",
    });

    const galleries = await res.json();

    if (galleries.length > 0) {
      return NextResponse.redirect(new URL("/dashboard/drive", req.url));
    }
  }

  return NextResponse.next();
}