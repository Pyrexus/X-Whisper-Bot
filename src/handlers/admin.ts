import { InputFile } from "grammy";
import type { Context } from "grammy";
import { isOwner } from "../config";
import { ownerPanelKeyboard } from "../keyboards";
import { getGlobalStats } from "../kv/stats";
import { listAllUserIds, getUser, setBanned } from "../kv/users";
import { escapeMd } from "../utils/card";
import type { Env } from "../types";

export async function handleAdminCommand(ctx: Context, env: Env): Promise<void> {
  const from = ctx.from;
  if (!from || !isOwner(from.id, env.OWNER_IDS)) return;
  await ctx.reply("🛠️ *Owner Panel*", {
    parse_mode: "MarkdownV2",
    reply_markup: ownerPanelKeyboard(),
  });
}

export async function handleBanCommand(ctx: Context, env: Env, ban: boolean): Promise<void> {
  const from = ctx.from;
  if (!from || !isOwner(from.id, env.OWNER_IDS)) return;
  const targetId = Number((ctx.match as string)?.trim());
  if (!targetId) {
    await ctx.reply("Usage: `/ban 123456789` or `/unban 123456789`", { parse_mode: "Markdown" });
    return;
  }
  await setBanned(env, targetId, ban);
  await ctx.reply(`${ban ? "🚫 Banned" : "✅ Unbanned"} user \`${targetId}\`.`, {
    parse_mode: "Markdown",
  });
}

export async function handleAdminCallback(ctx: Context, env: Env, action: string): Promise<void> {
  const from = ctx.from;
  if (!from || !isOwner(from.id, env.OWNER_IDS)) {
    await ctx.answerCallbackQuery({ text: "🚫 Owner only.", show_alert: true });
    return;
  }
  await ctx.answerCallbackQuery();

  if (action === "stats") {
    const s = await getGlobalStats(env);
    await ctx.editMessageText(
      `📊 *Global Stats*\n\n` +
        `👥 Users: *${s.totalUsers}*\n` +
        `🔒 Whispers: *${s.totalWhispers}*\n` +
        `🎁 Gifts: *${s.totalGifts}*\n` +
        `👁️ Seen: *${s.totalSeen}*\n` +
        `🔥 Expired: *${s.totalExpired}*`,
      { parse_mode: "MarkdownV2", reply_markup: ownerPanelKeyboard() }
    );
    return;
  }

  if (action === "ping") {
    const start = Date.now();
    await ctx.api.getMe();
    await ctx.editMessageText(`🏓 Pong\\! \`${Date.now() - start}ms\``, {
      parse_mode: "MarkdownV2",
      reply_markup: ownerPanelKeyboard(),
    });
    return;
  }

  if (action === "runinfo") {
    await ctx.editMessageText(
      `⚙️ *Runtime Info*\n\n` +
        `Runtime: Cloudflare Workers\n` +
        `Bot: grammY \`1\\.45\\.1\`\n` +
        `Storage: Workers KV\n` +
        `Time: \`${escapeMd(new Date().toISOString())}\``,
      { parse_mode: "MarkdownV2", reply_markup: ownerPanelKeyboard() }
    );
    return;
  }

  if (action === "export") {
    const ids = await listAllUserIds(env);
    const rows = ["id,username,displayName,banned,createdAt,sent,received,seen,gifts"];
    for (const id of ids) {
      const u = await getUser(env, id);
      if (!u) continue;
      rows.push(
        [
          u.id,
          u.username ?? "",
          u.displayName.replace(/,/g, " "),
          u.banned,
          new Date(u.createdAt).toISOString(),
          u.stats.sent,
          u.stats.received,
          u.stats.seen,
          u.stats.gifts,
        ].join(",")
      );
    }
    const csv = rows.join("\n");
    await ctx.replyWithDocument(
      new InputFile(new TextEncoder().encode(csv), `whisper-users-${Date.now()}.csv`)
    );
    return;
  }
}
