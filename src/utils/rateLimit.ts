import type { Env } from "../types";

/**
 * Sliding-ish fixed-window limiter. Given your expected volume this will
 * basically never trigger — it's here purely as abuse protection.
 */
export async function checkRateLimit(
  env: Env,
  userId: number,
  action: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const key = `ratelimit:${action}:${userId}`;
  const raw = await env.WHISPER_KV.get(key);
  const count = raw ? parseInt(raw, 10) : 0;

  if (count >= limit) return false;

  await env.WHISPER_KV.put(key, String(count + 1), {
    expirationTtl: windowSeconds,
  });
  return true;
}
