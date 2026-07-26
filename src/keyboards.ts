import { InlineKeyboard } from "grammy";
import { ButtonStyle } from "./config";
import type { WhisperRecord } from "./types";

/** Card shown while a whisper is active and unopened. */
export function activeWhisperKeyboard(w: WhisperRecord): InlineKeyboard {
  return new InlineKeyboard().text(
    `${ButtonStyle.Progress} Reveal Whisper`,
    `reveal:${w.id}`
  );
}

/** Long-message fallback: deep link into the bot's DM instead of a popup. */
export function longMessageKeyboard(botUsername: string, whisperId: string): InlineKeyboard {
  return new InlineKeyboard().url(
    `${ButtonStyle.Primary} Open in DM`,
    `https://t.me/${botUsername}?start=w_${whisperId}`
  );
}

/** After the whisper is seen or expired: no functional button, link struck through in card text. */
export function closedKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text(`${ButtonStyle.Danger} Whisper Closed`, "noop");
}

export function startMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text(`${ButtonStyle.Progress} New Whisper`, "menu:new")
    .text(`${ButtonStyle.Primary} Send Gift`, "menu:gift")
    .row()
    .text(`${ButtonStyle.Primary} Stats`, "menu:stats")
    .text(`${ButtonStyle.Primary} History`, "menu:history")
    .row()
    .text(`${ButtonStyle.Danger} Help`, "menu:help");
}

export function backToMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text(`${ButtonStyle.Primary} Back to Menu`, "menu:home");
}

export function contactsKeyboard(
  contacts: { id?: number; username?: string; displayName: string }[]
): InlineKeyboard {
  const kb = new InlineKeyboard();
  contacts.slice(0, 8).forEach((c, i) => {
    kb.text(`${ButtonStyle.Progress} ${c.displayName}`, `contact:${c.id ?? c.username}`);
    if (i % 2 === 1) kb.row();
  });
  return kb;
}

export function ownerPanelKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text(`${ButtonStyle.Primary} Global Stats`, "owner:stats")
    .text(`${ButtonStyle.Progress} Ping`, "owner:ping")
    .row()
    .text(`${ButtonStyle.Primary} Run Info`, "owner:runinfo")
    .text(`${ButtonStyle.Danger} Export CSV`, "owner:export");
}
