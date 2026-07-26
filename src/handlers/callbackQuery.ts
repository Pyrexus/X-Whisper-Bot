import type { Context } from "grammy";
import { buildSeenCard, buildExpiredCard, escapeMd } from "../utils/card";
import { closedKeyboard } from "../keyboards";
import { getWhisper, saveWhisper, untrackActive } from "../kv/whispers";
import { bumpStat, getUser } from "../kv/users";
import { bumpGlobal, recordHistory } from "../kv/stats";
import type { Env, Recipient } from "../types";

function isRecipient(recipients: Recipient[], from: NonNullable<Context["from"]>): boolean {
  return recipients.some(
    (r) =>
      (r.id && r.id === from.id) ||
      (r.username && from.username && r.username.toLowerCase() === from.username.toLowerCase())
  );
}

export async function handleReveal(ctx: Context, env: Env, whisperId: string): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const w = await getWhisper(env, whisperId);
  if (!w) {
    await ctx.answerCallbackQuery({ text: "❌ This whisper no longer exists.", show_alert: true });
    return;
  }

  if (w.status === "seen") {
    await ctx.answerCallbackQuery({ text: "🔓 This whisper was already opened.", show_alert: true });
    return;
  }
  if (w.status === "expired") {
    await ctx.answerCallbackQuery({ text: "🔥 This whisper has expired.", show_alert: true });
    return;
  }

  if (w.expiresAt !== null && Date.now() > w.expiresAt) {
    w.status = "expired";
    await saveWhisper(env, w);
    await untrackActive(env, w.id);
    await bumpGlobal(env, "totalExpired");
    if (ctx.callbackQuery?.inline_message_id) {
      await ctx.api.raw.editMessageText({
        inline_message_id: ctx.callbackQuery.inline_message_id,
        text: buildExpiredCard(w),
        parse_mode: "MarkdownV2",
        reply_markup: closedKeyboard(),
      });
    }
    await ctx.answerCallbackQuery({ text: "🔥 This whisper just expired.", show_alert: true });
    return;
  }

  if (!isRecipient(w.recipients, from)) {
    await ctx.answerCallbackQuery({
      text: "🚫 This whisper isn't addressed to you.",
      show_alert: true,
    });
    return;
  }

  // Reveal — plain text only, Telegram alert popups cap at 200 chars.
  await ctx.answerCallbackQuery({ text: w.message, show_alert: true });

  const viewerName = from.username ? `@${from.username}` : from.first_name;
  w.status = "seen";
  await saveWhisper(env, w);
  await untrackActive(env, w.id);
  await bumpGlobal(env, "totalSeen");
  await bumpStat(env, w.senderId, "seen");
  await recordHistory(env, w.senderId, w);
  await recordHistory(env, from.id, w);

  if (ctx.callbackQuery?.inline_message_id) {
    await ctx.api.raw.editMessageText({
      inline_message_id: ctx.callbackQuery.inline_message_id,
      text: buildSeenCard(w, viewerName),
      parse_mode: "MarkdownV2",
      reply_markup: closedKeyboard(),
    });
  }

  // Best-effort DM notice to the sender. Note: Telegram's Bot API does not
  // expose which chat an inline message was posted into (by design, for
  // inline-mode privacy), so we can't link back to the exact message — we
  // can only tell the sender *that* and *by whom* it was seen.
  try {
    await ctx.api.sendMessage(
      w.senderId,
      `🔓 *Whisper Seen*\nYour whisper was just opened by *${escapeMd(viewerName)}*\\.`,
      { parse_mode: "MarkdownV2" }
    );
  } catch {
    // Sender may have never started the bot / blocked it — ignore.
  }
}

export async function handleNoop(ctx: Context): Promise<void> {
  await ctx.answerCallbackQuery();
}
