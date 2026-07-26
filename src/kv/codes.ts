import { newSixDigitCode } from "../utils/encode";
import type { Env, RegisteredCode } from "../types";

const key = (code: string) => `code:${code}`;

export async function registerCode(
  env: Env,
  data: Omit<RegisteredCode, "code" | "createdAt">
): Promise<string> {
  let code = newSixDigitCode();
  // Avoid the rare collision.
  for (let i = 0; i < 5 && (await env.WHISPER_KV.get(key(code))); i++) {
    code = newSixDigitCode();
  }
  const record: RegisteredCode = { ...data, code, createdAt: Date.now() };
  // Registered draft whispers live for 30 days if unused.
  await env.WHISPER_KV.put(key(code), JSON.stringify(record), {
    expirationTtl: 60 * 60 * 24 * 30,
  });
  return code;
}

export async function getCode(env: Env, code: string): Promise<RegisteredCode | null> {
  const raw = await env.WHISPER_KV.get(key(code));
  return raw ? (JSON.parse(raw) as RegisteredCode) : null;
}
