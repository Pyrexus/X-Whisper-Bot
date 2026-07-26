import { parseTimerSuffix } from "../config";
import type { Recipient } from "../types";

export interface ParsedInline {
  recipients: Recipient[]; // may be empty -> caller should fall back to contacts list
  message: string;
  ms: number | null;
  isGift: boolean;
  registeredCode: string | null;
}

const TOKEN_RE = /^(@[a-zA-Z0-9_]{3,32}|\d{6,})$/;

export function parseInlineInput(rawText: string): ParsedInline {
  let text = rawText.trim();
  let isGift = false;

  if (/^gift\s+/i.test(text)) {
    isGift = true;
    text = text.replace(/^gift\s+/i, "");
  }

  const tokens = text.split(/\s+/);

  // A lone 6-digit token with nothing else = registered whisper code.
  if (tokens.length === 1 && /^\d{6}$/.test(tokens[0])) {
    return { recipients: [], message: "", ms: null, isGift, registeredCode: tokens[0] };
  }

  const recipients: Recipient[] = [];
  let i = 0;
  while (i < tokens.length && TOKEN_RE.test(tokens[i])) {
    const tok = tokens[i];
    if (tok.startsWith("@")) {
      recipients.push({ username: tok.slice(1), displayName: tok });
    } else {
      recipients.push({ id: parseInt(tok, 10), displayName: tok });
    }
    i++;
  }

  const rest = tokens.slice(i).join(" ");
  const { clean, ms } = parseTimerSuffix(rest);

  return { recipients, message: clean, ms, isGift, registeredCode: null };
}
