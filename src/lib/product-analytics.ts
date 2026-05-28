type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

const POSTHOG_CAPTURE_URL = "https://app.posthog.com/capture/";

export async function captureProductEvent(
  event: string,
  distinctId: string | null | undefined,
  properties: AnalyticsProps = {}
) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || POSTHOG_CAPTURE_URL;
  const id = String(distinctId ?? "").trim();
  if (!key || !id) {
    return {
      ok: false,
      reason: !key ? "POSTHOG_KEY_MISSING" : "DISTINCT_ID_MISSING",
    };
  }

  try {
    const response = await fetch(host.endsWith("/capture/") ? host : `${host.replace(/\/+$/, "")}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        event,
        distinct_id: id,
        properties: {
          ...properties,
          source: "pixora",
        },
      }),
      keepalive: true,
    });
    return {
      ok: response.ok,
      status: response.status,
      reason: response.ok ? null : "POSTHOG_CAPTURE_FAILED",
    };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[analytics] PostHog capture failed", error);
    }
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "POSTHOG_CAPTURE_FAILED",
    };
  }
}
