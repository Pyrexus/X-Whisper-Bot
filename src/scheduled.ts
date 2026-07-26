import { Api } from "grammy";
import { closedKeyboard } from "./keyboards";
import { buildExpiredCard } from "./utils/card";
import { listActiveIds, getWhisper, saveWhisper, untrackActive } from "./kv/whispers";
import { bumpGlobal } from "./kv/stats";
import type { Env } from "./types";

/**
 * Runs every minute (see wrangler.toml). At this bot's expected volume this
 * is a handful of KV reads/writes at most — nowhere near Workers limits.
 */
export async function sweepExpiredWhispers(env: Env): Promise<void> {
  const api = new Api(env.BOT_TOKEN);
  const ids = await listActiveIds(env);

  for (const id of ids) {
    const w = await getWhisper(env, id);
    if (!w) {
      await untrackActive(env, id);
      continue;
    }
    if (w.status !== "active") {
      await untrackActive(env, id);
      continue;
    }
    if (w.expiresAt === null || Date.now() < w.expiresAt) continue;

    w.status = "expired";
    await saveWhisper(env, w);
    await untrackActive(env, id);
    await bumpGlobal(env, "totalExpired");

    if (w.inlineMessageId) {
      try {
        await api.raw.editMessageText({
          inline_message_id: w.inlineMessageId,
          text: buildExpiredCard(w),
          parse_mode: "MarkdownV2",
          reply_markup: closedKeyboard(),
        });
      } catch {
        // Message may already be edited/gone — safe to ignore.
      }
    }
  }
}
