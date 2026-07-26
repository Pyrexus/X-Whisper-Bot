/**
 * Telegram /start deep-link payloads only allow [A-Za-z0-9_-], max 64 chars.
 * Standard base64 uses + / = which aren't allowed, so we use base64url.
 */
export function toBase64Url(input: string): string {
  const b64 = btoa(unescape(encodeURIComponent(input)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(input: string): string {
  let b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  return decodeURIComponent(escape(atob(b64)));
}

export function newId(prefix: string): string {
  const rand = crypto.getRandomValues(new Uint8Array(9));
  const str = Array.from(rand, (b) => b.toString(36).padStart(2, "0")).join("");
  return `${prefix}_${Date.now().toString(36)}${str}`;
}

export function newSixDigitCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return n.toString().padStart(6, "0");
}
