export type ApiErrorPayload = {
  error?: unknown;
  message?: unknown;
  code?: unknown;
};

export async function readApiErrorPayload(response: Response): Promise<ApiErrorPayload> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return {};

  const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
  return payload && typeof payload === "object" ? payload : {};
}

export function getApiErrorMessage(payload: ApiErrorPayload, fallback: string) {
  const message = typeof payload.message === "string" ? payload.message.trim() : "";
  if (message) return message;

  const error = typeof payload.error === "string" ? payload.error.trim() : "";
  return error || fallback;
}

