import type { Env, WhisperRecord } from "../types";

const key = (id: string) => `whisper:${id}`;

export async function saveWhisper(env: Env, w: WhisperRecord): Promise<void> {
  // KV values expire automatically once a whisper's timer is well past —
  // gives us free cleanup for stale records that were never revisited.
  const ttl = w.expiresAt
    ? Math.max(3600, Math.ceil((w.expiresAt - Date.now()) / 1000) + 86400)
    : 60 * 60 * 24 * 7; // one-time-view whispers: keep 7 days in case never opened
  await env.WHISPER_KV.put(key(w.id), JSON.stringify(w), { expirationTtl: ttl });
}

export async function getWhisper(env: Env, id: string): Promise<WhisperRecord | null> {
  const raw = await env.WHISPER_KV.get(key(id));
  return raw ? (JSON.parse(raw) as WhisperRecord) : null;
}

export async function deleteWhisper(env: Env, id: string): Promise<void> {
  await env.WHISPER_KV.delete(key(id));
}

/** Tracks active (non-terminal) whisper ids for the cron sweep. */
export async function trackActive(env: Env, id: string): Promise<void> {
  await env.WHISPER_KV.put(`active:${id}`, "1", {
    expirationTtl: 60 * 60 * 24 * 7,
  });
}

export async function untrackActive(env: Env, id: string): Promise<void> {
  await env.WHISPER_KV.delete(`active:${id}`);
}

export async function listActiveIds(env: Env): Promise<string[]> {
  const ids: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.WHISPER_KV.list({ prefix: "active:", cursor });
    ids.push(...page.keys.map((k) => k.name.replace("active:", "")));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return ids;
}
