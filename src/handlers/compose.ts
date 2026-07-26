import type { Context } from "grammy";
import { parseInlineInput } from "../utils/parseInline";
import { registerCode } from "../kv/codes";
import { resolveUsername, getUser, addContact } from "../kv/users";
import { backToMenuKeyboard } from "../keyboards";
import { escapeMd } from "../utils/card";
import { FOOTER } from "../config";
import type { Env, Recipient, WhisperType } from "../types";

/** Returns true if this text message was consumed as a pending compose reply. */
export async function tryHandleComposeReply(ctx: Context, env: Env): Promise<boolean> {
  const from = ctx.from;
  const text = ctx.message?.text;
  if (!from || !text || text.startsWith("/")) return false;

  const pendingRaw = await env.WHISPER_KV.get(`compose:${from.id}`);
  if (!pendingRaw) return false;
  const pending = JSON.parse(pendingRaw) as { type: WhisperType };
  await env.WHISPER_KV.delete(`compose:${from.id}`);

  const parsed = parseInlineInput(text);
  if (parsed.recipients.length === 0 || parsed.message.length === 0) {
    await ctx.reply(
      "❌ Couldn't parse that. Format: `@username your message` or `userid your message`",
      { parse_mode: "Markdown" }
    );
    return true;
  }

  const recipients: Recipient[] = [];
  for (const r of parsed.recipients) {
    if (r.username) {
      const id = await resolveUsername(env, r.username);
      recipients.push({ ...r, id: id ?? undefined, displayName: `@${r.username}` });
    } else if (r.id) {
      const u = await getUser(env, r.id);
      recipients.push({ ...r, displayName: u?.displayName ?? r.displayName });
    }
  }

  for (const r of recipients) await addContact(env, from.id, r);

  const code = await registerCode(env, {
    senderId: from.id,
    senderName: from.first_name,
    recipients,
    message: parsed.message,
    type: pending.type,
  });

  const icon = pending.type === "gift" ? "🎁" : "🔒";
  await ctx.reply(
    `${icon} *Whisper saved\\!*\n\n` +
      `Use it anywhere with:\n\`@${escapeMd(env.BOT_USERNAME)} ${code}\`\n\n` +
      `_Valid for 30 days or until used\\._${escapeMd(FOOTER)}`,
    { parse_mode: "MarkdownV2", reply_markup: backToMenuKeyboard() }
  );
  return true;
}
