import type { NextRequest } from "next/server";
import { proxy } from "./src/proxy";

// Minimal middleware shim that delegates to src/proxy.ts
// This ensures Next produces a concrete middleware entry during build
export async function middleware(req: NextRequest) {
  return proxy(req);
}

export const config = {
  // let proxy decide whether to act; keep matcher broad so Next emits middleware artifacts
  matcher: ["/dashboard/:path*", "/_next/data/:path*", "/disk/:path*"],
};
