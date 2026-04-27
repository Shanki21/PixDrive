import { NextResponse } from "next/server";

type RequestLike = {
  headers: {
    get: (name: string) => string | null;
  };
  url: string;
};

export function rejectCrossOriginWrite(req: RequestLike) {
  const origin = req.headers.get("origin");
  const fetchSite = (req.headers.get("sec-fetch-site") ?? "").toLowerCase();
  if (!origin && fetchSite === "cross-site") {
    return NextResponse.json(
      { error: "Invalid origin." },
      {
        status: 403,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  if (!origin) {
    return null;
  }

  try {
    const requestOrigin = new URL(req.url).origin;
    const callerOrigin = new URL(origin).origin;
    if (callerOrigin === requestOrigin) {
      return null;
    }
  } catch {
    // Fall through to the denial response below.
  }

  return NextResponse.json(
    { error: "Invalid origin." },
    {
      status: 403,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
