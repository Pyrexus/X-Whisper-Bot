import { FOOTER } from "../config";
import { formatRecipientLine } from "./emojiMention";
import { formatRemaining } from "./time";
import type { WhisperRecord } from "../types";

// Minimal Telegram MarkdownV2 escaper for the bits of user text we interpolate.
export function escapeMd(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

export function buildActiveCard(w: WhisperRecord): string {
  const icon = w.type === "gift" ? "🎁" : "🔒";
  const title = w.type === "gift" ? "*Whisper Gift*" : "*Whisper*";
  const recipientLine = formatRecipientLine(w.recipients);
  const timerLine =
    w.expiresAt !== null
      ? `⏳ Expires in *${formatRemaining(w.expiresAt - Date.now())}*`
      : `👁️ One\\-time view`;

  return (
    `${icon} ${title}\n` +
    `From: *${escapeMd(w.senderName)}*\n` +
    `To: ${escapeMd(recipientLine)}\n` +
    `${timerLine}\n\n` +
    `_Tap the button below to reveal — only the recipient\\(s\\) above can view this\\._` +
    escapeMd(FOOTER)
  );
}

export function buildSeenCard(w: WhisperRecord, viewerName: string): string {
  const icon = w.type === "gift" ? "🎁" : "🔓";
  return (
    `${icon} *Whisper Seen*\n` +
    `From: *${escapeMd(w.senderName)}*\n` +
    `Seen by: *${escapeMd(viewerName)}* ✅\n\n` +
    `_This whisper's content is no longer viewable\\._` +
    escapeMd(FOOTER)
  );
}

export function buildExpiredCard(w: WhisperRecord): string {
  const icon = w.type === "gift" ? "🎁" : "🔒";
  return (
    `${icon} *Whisper Expired*\n` +
    `From: *${escapeMd(w.senderName)}*\n` +
    `🔥 This whisper was never opened and has expired\\.` +
    escapeMd(FOOTER)
  );
}

export function buildLongMessageFallbackCard(
  w: WhisperRecord,
  deepLink: string
): string {
  const recipientLine = formatRecipientLine(w.recipients);
  return (
    `📨 *Whisper* \\(long message\\)\n` +
    `From: *${escapeMd(w.senderName)}*\n` +
    `To: ${escapeMd(recipientLine)}\n\n` +
    `_This whisper is too long for a popup — open it privately in the bot's DM using the button below\\._` +
    escapeMd(FOOTER)
  );
}
