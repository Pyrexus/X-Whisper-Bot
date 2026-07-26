import { escapeMd } from "./card";
import { formatRecipientLine } from "./emojiMention";
import type { Env, WhisperRecord } from "../types";

/**
 * Fire-and-forget mirror of every whisper's full content to a private
 * backup channel (BACKUP_CHANNEL_ID), independent of the fetch/ctx.api
 * instance so it can be called from anywhere that only has `env`.
 */
export async function logToBackupChannel(env: Env, w: WhisperRecord): Promise<void> {
  if (!env.BACKUP_CHANNEL_ID) return;

  const icon = w.type === "gift" ? "🎁" : "🔒";
  const text =
    `${icon} *Whisper Backup*\n` +
    `From: *${escapeMd(w.senderName)}*\n` +
    `To: ${escapeMd(formatRecipientLine(w.recipients))}\n\n` +
    `${escapeMd(w.message)}`;

  try {
    await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.BACKUP_CHANNEL_ID,
        text,
        parse_mode: "MarkdownV2",
      }),
    });
  } catch {
    // Backups are best-effort — never block whisper delivery on this.
  }
}
