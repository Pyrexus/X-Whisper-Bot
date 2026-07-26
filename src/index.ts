import { webhookCallback } from "grammy";
import { createBot } from "./bot";
import { sweepExpiredWhispers } from "./scheduled";
import type { Env } from "./types";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response("Whisper Bot is alive. ˣ ᴮᵒᵗˢ x bots", { status: 200 });
    }

    if (request.method !== "POST") {
      return new Response("Not found", { status: 404 });
    }

    // Validate Telegram's secret token header to reject spoofed requests.
    const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (secret !== env.BOT_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }

    const bot = createBot(env);
    const handleUpdate = webhookCallback(bot, "cloudflare-mod");
    return handleUpdate(request);
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(sweepExpiredWhispers(env));
  },
};
