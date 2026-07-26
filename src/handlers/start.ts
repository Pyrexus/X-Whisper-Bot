import type { Context } from "grammy";
import { startMenuKeyboard, closedKeyboard } from "../keyboards";
import { getWhisper, saveWhisper, untrackActive } from "../kv/whispers";
import { bumpGlobal, recordHistory } from "../kv/stats";
import { bumpStat, upsertUser } from "../kv/users";
import { escapeMd } from "../utils/card";
import { FOOTER } from "../config";
import type { Env } from "../types";

export async function handleStart(ctx: Context, env: Env): Promise<void> {
  const from = ctx.from;
  if (!from) return;
  await upsertUser(env, from.id, from.username, from.first_name);

  const payload = ctx.match ? String(ctx.match) : "";

  if (payload.startsWith("w_")) {
    await deliverLongWhisper(ctx, env, payload.slice(2));
    return;
  }

  const name = escapeMd(from.first_name ?? "there");
  await ctx.reply(
    `🤫 *Welcome to Whisper, ${name}\\!*\n\n` +
      `Send private, self\\-destructing messages to anyone in any chat — ` +
      `no one else can ever see them, not even a screenshot of the chat\\.\n\n` +
      `Type \`@${escapeMd(env.BOT_USERNAME)} @username your message\` in any chat to get started, ` +
      `or use the menu below\\.` +
      escapeMd(FOOTER),
    { parse_mode: "MarkdownV2", reply_markup: startMenuKeyboard() }
  );
}

async function deliverLongWhisper(ctx: Context, env: Env, whisperId: string): Promise<void> {
  const from = ctx.from;
  if (!from) return;
  const w = await getWhisper(env, whisperId);

  if (!w) {
    await ctx.reply("❌ This whisper no longer exists or has already expired.");
    return;
  }
  if (w.status !== "active") {
    await ctx.reply("🔓 This whisper has already been opened.");
    return;
  }
  const isRecipient = w.recipients.some(
    (r) =>
      (r.id && r.id === from.id) ||
      (r.username && from.username && r.username.toLowerCase() === from.username.toLowerCase())
  );
  if (!isRecipient) {
    await ctx.reply("🚫 This whisper isn't addressed to you.");
    return;
  }

  await ctx.reply(`📨 *Whisper from ${escapeMd(w.senderName)}*\n\n${escapeMd(w.message)}`, {
    parse_mode: "MarkdownV2",
  });

  w.status = "seen";
  await saveWhisper(env, w);
  await untrackActive(env, w.id);
  await bumpGlobal(env, "totalSeen");
  await bumpStat(env, w.senderId, "seen");
  await recordHistory(env, w.senderId, w);
  await recordHistory(env, from.id, w);

  try {
    const viewerName = from.username ? `@${from.username}` : from.first_name;
    await ctx.api.sendMessage(
      w.senderId,
      `🔓 *Whisper Seen*\nYour long whisper was just opened by *${escapeMd(viewerName)}*\\.`,
      { parse_mode: "MarkdownV2" }
    );
  } catch {
    // sender may have blocked the bot
  }
}
