import fetchWithRetry from "@/lib/fetchWithRetry";

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL?.trim() ?? "";
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ?? "";

const memoryStore = new Map<string, string>();

async function runUpstashPipeline(commands: Array<Array<string | number>>) {
  if (!upstashUrl || !upstashToken) return null;
  const response = await fetchWithRetry(`${upstashUrl}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${upstashToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
    cache: "no-store",
  }, { dedupeKey: `upstash:pipeline:${JSON.stringify(commands).slice(0,200)}` });
  if (!response.ok) throw new Error(`Upstash request failed with status ${response.status}`);
  const payload = await response.json();
  return payload;
}

export async function cacheGet(key: string): Promise<string | null> {
  try {
    if (upstashUrl && upstashToken) {
      const res = await runUpstashPipeline([["GET", key]]);
      const v = res?.[0]?.result ?? null;
      return typeof v === "string" ? v : v != null ? String(v) : null;
    }
  } catch (err) {
    console.warn("[cache] upstash get failed, falling back to memory", err);
  }
  return memoryStore.get(key) ?? null;
}

export async function cacheSet(key: string, value: string, ttlSeconds?: number) {
  try {
    if (upstashUrl && upstashToken) {
      if (ttlSeconds && ttlSeconds > 0) {
        await runUpstashPipeline([["SET", key, value, "EX", ttlSeconds]]);
        return;
      }
      await runUpstashPipeline([["SET", key, value]]);
      return;
    }
  } catch (err) {
    console.warn("[cache] upstash set failed, falling back to memory", err);
  }
  memoryStore.set(key, value);
  if (ttlSeconds && ttlSeconds > 0) {
    setTimeout(() => memoryStore.delete(key), ttlSeconds * 1000).unref?.();
  }
}

export async function cacheDel(key: string) {
  try {
    if (upstashUrl && upstashToken) {
      await runUpstashPipeline([["DEL", key]]);
      return;
    }
  } catch (err) {
    console.warn("[cache] upstash del failed, falling back to memory", err);
  }
  memoryStore.delete(key);
}
