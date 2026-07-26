import type { Env, Recipient, UserRecord } from "../types";
import { bumpGlobal } from "./stats";

const userKey = (id: number) => `user:${id}`;
const usernameKey = (username: string) => `username:${username.toLowerCase()}`;

export async function getUser(env: Env, id: number): Promise<UserRecord | null> {
  const raw = await env.WHISPER_KV.get(userKey(id));
  return raw ? (JSON.parse(raw) as UserRecord) : null;
}

export async function upsertUser(
  env: Env,
  id: number,
  username: string | undefined,
  displayName: string
): Promise<UserRecord> {
  const existing = await getUser(env, id);
  const now = Date.now();
  const isNew = !existing;

  const user: UserRecord = existing ?? {
    id,
    username,
    displayName,
    banned: false,
    createdAt: now,
    lastActive: now,
    contacts: [],
    stats: { sent: 0, received: 0, seen: 0, gifts: 0 },
  };

  user.username = username ?? user.username;
  user.displayName = displayName;
  user.lastActive = now;

  await env.WHISPER_KV.put(userKey(id), JSON.stringify(user));
  if (isNew) await bumpGlobal(env, "totalUsers");
  if (username) {
    // Cache username -> id resolution since Telegram bots can't resolve
    // arbitrary @usernames without the user having messaged the bot first.
    await env.WHISPER_KV.put(usernameKey(username), String(id));
  }
  return user;
}

export async function resolveUsername(env: Env, username: string): Promise<number | null> {
  const raw = await env.WHISPER_KV.get(usernameKey(username.replace(/^@/, "")));
  return raw ? parseInt(raw, 10) : null;
}

export async function setBanned(env: Env, id: number, banned: boolean): Promise<void> {
  const user = await getUser(env, id);
  if (!user) return;
  user.banned = banned;
  await env.WHISPER_KV.put(userKey(id), JSON.stringify(user));
}

export async function bumpStat(
  env: Env,
  id: number,
  stat: keyof UserRecord["stats"]
): Promise<void> {
  const user = await getUser(env, id);
  if (!user) return;
  user.stats[stat] += 1;
  await env.WHISPER_KV.put(userKey(id), JSON.stringify(user));
}

export async function addContact(env: Env, ownerId: number, contact: Recipient): Promise<void> {
  const user = await getUser(env, ownerId);
  if (!user) return;
  const key = contact.id ?? contact.username;
  const exists = user.contacts.some((c) => (c.id ?? c.username) === key);
  if (!exists) {
    user.contacts.unshift(contact);
    user.contacts = user.contacts.slice(0, 25); // keep it tidy
    await env.WHISPER_KV.put(userKey(ownerId), JSON.stringify(user));
  }
}

export async function listAllUserIds(env: Env): Promise<number[]> {
  const ids: number[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.WHISPER_KV.list({ prefix: "user:", cursor });
    ids.push(...page.keys.map((k) => parseInt(k.name.replace("user:", ""), 10)));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return ids;
}
