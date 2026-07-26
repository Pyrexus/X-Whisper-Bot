import { Bot } from "grammy";
import type { Context } from "grammy";
import { handleInlineQuery } from "./handlers/inlineQuery";
import { handleReveal, handleNoop } from "./handlers/callbackQuery";
import { handleStart } from "./handlers/start";
import { handleMenuCallback } from "./handlers/menu";
import { tryHandleComposeReply } from "./handlers/compose";
import {
  handleAdminCommand,
  handleAdminCallback,
  handleBanCommand,
} from "./handlers/admin";
import { isOwner } from "./config";
import { getWhisper, saveWhisper } from "./kv/whispers";
import type { Env } from "./types";

export function createBot(env: Env): Bot {
  const bot = new Bot(env.BOT_TOKEN);

  bot.command("start", (ctx) => handleStart(ctx, env));
  bot.command("admin", (ctx) => handleAdminCommand(ctx, env));
  bot.command("ban", (ctx) => handleBanCommand(ctx, env, true));
  bot.command("unban", (ctx) => handleBanCommand(ctx, env, false));

  bot.on("inline_query", (ctx) => handleInlineQuery(ctx, env));

  // Captures inline_message_id so the cron sweep can edit the card later.
  // Note: Telegram only sends this update reliably if "Inline Feedback" is
  // enabled for the bot via @BotFather (/setinlinefeedback -> 100%).
  bot.on("chosen_inline_result", async (ctx) => {
    const id = ctx.chosenInlineResult.result_id;
    const inlineMessageId = ctx.chosenInlineResult.inline_message_id;
    if (!inlineMessageId) return;
    const w = await getWhisper(env, id);
    if (w) {
      w.inlineMessageId = inlineMessageId;
      await saveWhisper(env, w);
    }
  });

  bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;
    if (data.startsWith("reveal:")) {
      await handleReveal(ctx, env, data.slice("reveal:".length));
    } else if (data.startsWith("menu:")) {
      await handleMenuCallback(ctx, env, data.slice("menu:".length));
    } else if (data.startsWith("owner:")) {
      await handleAdminCallback(ctx, env, data.slice("owner:".length));
    } else if (data === "noop") {
      await handleNoop(ctx);
    }
  });

  // Plain DM text — only consumed if the user has a pending compose flow.
  bot.on("message:text", async (ctx) => {
    if (ctx.chat.type !== "private") return;
    await tryHandleComposeReply(ctx, env);
  });

  bot.catch((err) => {
    console.error("Bot error:", err.message, err.error);
  });

  return bot;
}
