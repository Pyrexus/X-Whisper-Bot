/**
 * Telegram inline buttons have no native colour/style support (unlike Discord
 * components). We simulate a "style" system using consistent circle emojis
 * as a prefix so buttons still visually read as Primary / Danger / Progress.
 */
export enum ButtonStyle {
  Primary = "🔵",
  Danger = "🔴",
  Progress = "🟢",
}

/** Cycles through styles in order, wrapping back to the start. */
export function nextStyle(current: ButtonStyle): ButtonStyle {
  const order = [ButtonStyle.Progress, ButtonStyle.Danger, ButtonStyle.Primary];
  const i = order.indexOf(current);
  return order[(i + 1) % order.length];
}

/** Small-caps footer stamped on every card. */
export const FOOTER = "\n\nˣ ᴮᵒᵗˢ x bots";

/** Alert popups are capped by Telegram at 200 chars — reserve a small margin. */
export const POPUP_CHAR_LIMIT = 190;

/** Recipient list beyond this size gets emoji-coded instead of named. */
export const EMOJI_MENTION_THRESHOLD = 3;

export const MENTION_EMOJIS = [
  "😎", "🦊", "🐼", "🐧", "🐸", "🦁", "🐯", "🐻", "🐨", "🐵",
  "🦄", "🐙", "🦋", "🐢", "🦅", "🦉", "🐺", "🐬", "🐳", "🦈",
  "🌵", "🍀", "🌙", "⭐", "☄️", "🔥", "❄️", "🌈", "🍉", "🍇",
];

export const TIMER_SUFFIX_REGEX = /\+(\d+)(m|h|d)\s*$/i;

export function parseTimerSuffix(text: string): { clean: string; ms: number | null } {
  const match = text.match(TIMER_SUFFIX_REGEX);
  if (!match) return { clean: text.trim(), ms: null };

  const amount = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const unitMs = unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : 86_400_000;
  const clean = text.slice(0, match.index).trim();
  return { clean, ms: amount * unitMs };
}

export function isOwner(userId: number, ownerIdsCsv: string): boolean {
  return ownerIdsCsv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(String(userId));
}
