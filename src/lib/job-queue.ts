import { sendOtpEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import fetchWithRetry from "@/lib/fetchWithRetry";

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL?.trim() ?? "";
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ?? "";
const queueKey = "wf:jobs:emails";

const memoryQueue: string[] = [];

async function runUpstashPipeline(commands: Array<Array<string | number>>): Promise<unknown[] | null> {
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
  return (await response.json()) as unknown[];
}

export async function enqueueSendOtp(params: { to: string; otp: string }) {
  const payload = JSON.stringify({ type: "otp", ...params, createdAt: new Date().toISOString() });
  try {
    if (upstashUrl && upstashToken) {
      await runUpstashPipeline([["LPUSH", queueKey, payload]]);
      return;
    }
  } catch (err: unknown) {
    logger.warn("[job-queue] upstash LPUSH failed, falling back to memory", err);
  }
  memoryQueue.push(payload);
}

export async function dequeueNextEmailJob() {
  try {
    if (upstashUrl && upstashToken) {
      const result = await runUpstashPipeline([["RPOP", queueKey]]);
      const raw = result?.[0]?.result ?? null;
      return typeof raw === "string" ? raw : null;
    }
  } catch (err: unknown) {
    logger.warn("[job-queue] upstash RPOP failed, falling back to memory", err);
  }
  return memoryQueue.shift() ?? null;
}

export async function processOneJob() {
  const raw = await dequeueNextEmailJob();
  if (!raw) return false;
  try {
    const job = JSON.parse(raw);
    if (job.type === "otp") {
      await sendOtpEmail({ to: job.to, otp: job.otp });
    } else {
      logger.warn("[job-queue] unknown job type", job);
    }
  } catch (err: unknown) {
    logger.error("[job-queue] job processing failed", err);
  }
  return true;
}

export async function startWorker(pollMs = 1000) {
  logger.info("[job-queue] worker starting");
  while (true) {
    try {
      const did = await processOneJob();
      if (!did) {
        await new Promise((res) => setTimeout(res, pollMs));
      }
    } catch (err: unknown) {
      logger.error("[job-queue] worker error", err);
      await new Promise((res) => setTimeout(res, pollMs));
    }
  }
}
