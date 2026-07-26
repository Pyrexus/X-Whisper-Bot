import { InlineQueryResultBuilder } from "grammy";
import type { Context } from "grammy";
import { POPUP_CHAR_LIMIT } from "../config";
import { assignMentionEmojis } from "../utils/emojiMention";
import { parseInlineInput } from "../utils/parseInline";
import { newId } from "../utils/encode";
import { buildActiveCard, buildLongMessageFallbackCard } from "../utils/card";
import { activeWhisperKeyboard, longMessageKeyboard } from "../keyboards";
import { saveWhisper, trackActive } from "../kv/whispers";
import { bumpGlobal } from "../kv/stats";
import { logToBackupChannel } from "../utils/backup";
import { getCode } from "../kv/codes";
import { getUser, resolveUsername, upsertUser, bumpStat } from "../kv/users";
import { checkRateLimit } from "../utils/rateLimit";
import type { Env, Recipient, WhisperRecord, WhisperType } from "../types";

export async function handleInlineQuery(ctx: Context, env: Env): Promise<void> {
  const from = ctx.from;
  if (!from || !ctx.inlineQuery) return;

  const user = await upsertUser(env, from.id, from.username, from.first_name);
  if (user.banned) {
    await ctx.answerInlineQuery([], { cache_time: 1 });
    return;
  }

  const allowed = await checkRateLimit(env, from.id, "inline", 20, 60);
  if (!allowed) {
    await ctx.answerInlineQuery([], {
      cache_time: 1,
      button: { text: "⏳ Slow down — try again shortly", start_parameter: "rate_limited" },
    });
    return;
  }

  const query = ctx.inlineQuery.query ?? "";
  const parsed = parseInlineInput(query);

  // 1) Registered 6-digit code re-use.
  if (parsed.registeredCode) {
    const code = await getCode(env, parsed.registeredCode);
    if (!code) {
      await ctx.answerInlineQuery(
        [
          InlineQueryResultBuilder.article("invalid-code", "❌ Invalid or expired code", {
            description: "That 6-digit whisper code doesn't exist anymore.",
          }).text("❌ That whisper code is invalid or expired."),
        ],
        { cache_time: 0 }
      );
      return;
    }
    const result = await buildResult(env, from.id, code.senderName, code.recipients, code.message, code.type);
    await ctx.answerInlineQuery([result], { cache_time: 0, is_personal: true });
    return;
  }

  // 2) Explicit recipients given inline.
  if (parsed.recipients.length > 0 && parsed.message.length > 0) {
    const recipients = await resolveRecipients(env, parsed.recipients);
    const result = await buildResult(
      env,
      from.id,
      from.first_name,
      recipients,
      parsed.message,
      parsed.isGift ? "gift" : "whisper",
      parsed.ms
    );
    await ctx.answerInlineQuery([result], { cache_time: 0, is_personal: true });
    return;
  }

  // 3) No recipient given but message present -> offer each recent contact as a one-tap target.
  if (parsed.message.length > 0) {
    const results = [];
    for (const contact of user.contacts.slice(0, 8)) {
      const result = await buildResult(
        env,
        from.id,
        from.first_name,
        [contact],
        parsed.message,
        parsed.isGift ? "gift" : "whisper",
        parsed.ms
      );
      results.push(result);
    }
    if (results.length === 0) {
      await ctx.answerInlineQuery(
        [
          InlineQueryResultBuilder.article("no-contacts", "💡 Add a recipient", {
            description: "Try: @username your message   or   userid your message",
          }).text("Type `@username your message` to send a whisper.", {
            parse_mode: "Markdown",
          }),
        ],
        { cache_time: 0 }
      );
      return;
    }
    await ctx.answerInlineQuery(results, { cache_time: 0, is_personal: true });
    return;
  }

  // 4) Empty query — show usage hint.
  await ctx.answerInlineQuery(
    [
      InlineQueryResultBuilder.article("hint", "🤫 Start typing your whisper", {
        description: "@username msg   |   userid msg   |   123456 (code)   |   gift @username msg",
      }).text(
        "🤫 *How to whisper*\n" +
          "`@username your secret message`\n" +
          "`userid your secret message`\n" +
          "`123456` — reuse a registered code\n" +
          "`gift @username your message` — send a gift\n" +
          "Add ` +10m` / ` +1h` / ` +1d` for a timer\\.",
        { parse_mode: "MarkdownV2" }
      ),
    ],
    { cache_time: 3 }
  );
}

async function resolveRecipients(env: Env, recipients: Recipient[]): Promise<Recipient[]> {
  const resolved: Recipient[] = [];
  for (const r of recipients) {
    if (r.id) {
      const u = await getUser(env, r.id);
      resolved.push({ ...r, displayName: u?.displayName ?? r.displayName, username: u?.username });
    } else if (r.username) {
      const id = await resolveUsername(env, r.username);
      resolved.push({ ...r, id: id ?? undefined, displayName: `@${r.username}` });
    }
  }
  return resolved;
}

async function buildResult(
  env: Env,
  senderId: number,
  senderName: string,
  recipientsIn: Recipient[],
  message: string,
  type: WhisperType,
  ms?: number | null
) {
  const recipients = assignMentionEmojis(recipientsIn);
  const id = newId("wh");
  const isLong = message.length > POPUP_CHAR_LIMIT;

  const w: WhisperRecord = {
    id,
    type,
    senderId,
    senderName,
    recipients,
    message,
    createdAt: Date.now(),
    expiresAt: ms ? Date.now() + ms : null,
    status: "active",
  };

  await saveWhisper(env, w);
  await trackActive(env, id);
  await logToBackupChannel(env, w);
  if (type === "gift") {
    await bumpGlobal(env, "totalGifts");
    await bumpStat(env, senderId, "gifts");
  } else {
    await bumpGlobal(env, "totalWhispers");
  }
  await bumpStat(env, senderId, "sent");
  for (const r of recipients) {
    if (r.id) await bumpStat(env, r.id, "received");
  }

  const names = recipients.map((r) => r.displayName).join(", ");
  const preview = message.length > 40 ? message.slice(0, 40) + "…" : message;

  if (isLong) {
    return InlineQueryResultBuilder.article(id, `📨 Long whisper to ${names}`, {
      description: preview,
      reply_markup: longMessageKeyboard(env.BOT_USERNAME, id),
    }).text(buildLongMessageFallbackCard(w, "pending"), { parse_mode: "MarkdownV2" });
  }

  const icon = type === "gift" ? "🎁" : "🔒";
  return InlineQueryResultBuilder.article(id, `${icon} Whisper to ${names}`, {
    description: preview,
    reply_markup: activeWhisperKeyboard(w),
  }).text(buildActiveCard(w), { parse_mode: "MarkdownV2" });
}
