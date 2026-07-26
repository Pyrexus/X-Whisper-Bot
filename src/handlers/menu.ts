import type { Context } from "grammy";
import { startMenuKeyboard, backToMenuKeyboard } from "../keyboards";
import { getUser } from "../kv/users";
import { listHistory } from "../kv/stats";
import { escapeMd } from "../utils/card";
import { formatTimestamp } from "../utils/time";
import { FOOTER } from "../config";
import type { Env } from "../types";

export async function handleMenuCallback(ctx: Context, env: Env, action: string): Promise<void> {
  const from = ctx.from;
  if (!from) return;
  await ctx.answerCallbackQuery();

  switch (action) {
    case "home": {
      await ctx.editMessageText(
        `🤫 *Whisper Menu*\n\nPick an option below\\.${escapeMd(FOOTER)}`,
        { parse_mode: "MarkdownV2", reply_markup: startMenuKeyboard() }
      );
      return;
    }
    case "new":
    case "gift": {
      await ctx.editMessageText(
        (action === "gift"
          ? `🎁 *New Whisper Gift*\n\n`
          : `✏️ *New Whisper*\n\n`) +
          `Send me a message in this format:\n` +
          "`@username your message`  or  `userid your message`\n" +
          "Add ` +10m` / ` +1h` / ` +1d` for a timer\\.\n\n" +
          `I'll turn it into a 6\\-digit code you can reuse anywhere with ` +
          `\`@${escapeMd(env.BOT_USERNAME)} 123456\`\\.` +
          escapeMd(FOOTER),
        { parse_mode: "MarkdownV2", reply_markup: backToMenuKeyboard() }
      );
      await env.WHISPER_KV.put(
        `compose:${from.id}`,
        JSON.stringify({ type: action === "gift" ? "gift" : "whisper" }),
        { expirationTtl: 600 }
      );
      return;
    }
    case "stats": {
      const user = await getUser(env, from.id);
      const s = user?.stats ?? { sent: 0, received: 0, seen: 0, gifts: 0 };
      await ctx.editMessageText(
        `📊 *Your Whisper Stats*\n\n` +
          `📤 Sent: *${s.sent}*\n` +
          `📥 Received: *${s.received}*\n` +
          `👁️ Seen: *${s.seen}*\n` +
          `🎁 Gifts: *${s.gifts}*` +
          escapeMd(FOOTER),
        { parse_mode: "MarkdownV2", reply_markup: backToMenuKeyboard() }
      );
      return;
    }
    case "history": {
      const items = await listHistory(env, from.id);
      if (items.length === 0) {
        await ctx.editMessageText(
          `🕐 *History \\(last 36h\\)*\n\nNothing here yet\\.${escapeMd(FOOTER)}`,
          { parse_mode: "MarkdownV2", reply_markup: backToMenuKeyboard() }
        );
        return;
      }
      const lines = items
        .slice(0, 15)
        .map((w) => {
          const icon = w.type === "gift" ? "🎁" : w.status === "seen" ? "🔓" : "🔒";
          return `${icon} *${escapeMd(w.senderName)}* → ${escapeMd(
            w.recipients.map((r) => r.displayName).join(", ")
          )} _\\(${escapeMd(formatTimestamp(w.createdAt))}\\)_`;
        })
        .join("\n");
      await ctx.editMessageText(`🕐 *History \\(last 36h\\)*\n\n${lines}${escapeMd(FOOTER)}`, {
        parse_mode: "MarkdownV2",
        reply_markup: backToMenuKeyboard(),
      });
      return;
    }
    case "help": {
      await ctx.editMessageText(
        `ℹ️ *How Whisper Works*\n\n` +
          "`@" + escapeMd(env.BOT_USERNAME) + " @username msg`" + " — send instantly\n" +
          "`@" + escapeMd(env.BOT_USERNAME) + " 123456`" + " — reuse a saved whisper\n" +
          `Reply to someone in DM \\+ type your message to whisper directly to them\\.\n` +
          `Add \` \\+10m\`/\` \\+1h\`/\` \\+1d\` for a timer — otherwise it's one\\-time view\\.\n\n` +
          `Only the person you whisper to can ever read it — once, in a private popup\\.` +
          escapeMd(FOOTER),
        { parse_mode: "MarkdownV2", reply_markup: backToMenuKeyboard() }
      );
      return;
    }
  }
}
