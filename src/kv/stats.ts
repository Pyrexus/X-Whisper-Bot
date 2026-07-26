import type { Env, GlobalStats, WhisperRecord } from "../types";

const GLOBAL_KEY = "stats:global";

export async function getGlobalStats(env: Env): Promise<GlobalStats> {
  const raw = await env.WHISPER_KV.get(GLOBAL_KEY);
  return raw
    ? (JSON.parse(raw) as GlobalStats)
    : { totalUsers: 0, totalWhispers: 0, totalGifts: 0, totalSeen: 0, totalExpired: 0 };
}

export async function bumpGlobal(env: Env, field: keyof GlobalStats): Promise<void> {
  const stats = await getGlobalStats(env);
  stats[field] += 1;
  await env.WHISPER_KV.put(GLOBAL_KEY, JSON.stringify(stats));
}

const historyKey = (userId: number, whisperId: string) => `history:${userId}:${whisperId}`;

export async function recordHistory(
  env: Env,
  userId: number,
  w: WhisperRecord
): Promise<void> {
  await env.WHISPER_KV.put(historyKey(userId, w.id), JSON.stringify(w), {
    expirationTtl: 60 * 60 * 36, // 36h history window as requested
  });
}

export async function listHistory(env: Env, userId: number): Promise<WhisperRecord[]> {
  const results: WhisperRecord[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.WHISPER_KV.list({ prefix: `history:${userId}:`, cursor });
    for (const k of page.keys) {
      const raw = await env.WHISPER_KV.get(k.name);
      if (raw) results.push(JSON.parse(raw) as WhisperRecord);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return results.sort((a, b) => b.createdAt - a.createdAt);
}
