import { EMOJI_MENTION_THRESHOLD, MENTION_EMOJIS } from "../config";
import type { Recipient } from "../types";

/**
 * ≤3 recipients: show real names/usernames on the card.
 * >3 recipients: assign each a random unique emoji so the card stays short.
 * The mapping is stored on the recipient object itself (in KV), so the
 * reveal handler can match `viewer -> emoji` without re-deriving anything.
 */
export function assignMentionEmojis(recipients: Recipient[]): Recipient[] {
  if (recipients.length <= EMOJI_MENTION_THRESHOLD) return recipients;

  const pool = [...MENTION_EMOJIS];
  return recipients.map((r) => {
    const idx = Math.floor(Math.random() * pool.length);
    const emoji = pool.splice(idx, 1)[0] ?? "❓";
    return { ...r, emoji };
  });
}

export function formatRecipientLine(recipients: Recipient[]): string {
  if (recipients.length <= EMOJI_MENTION_THRESHOLD) {
    return recipients
      .map((r) => (r.username ? `@${r.username}` : r.displayName))
      .join(", ");
  }
  return recipients.map((r) => r.emoji).join(" ");
}
