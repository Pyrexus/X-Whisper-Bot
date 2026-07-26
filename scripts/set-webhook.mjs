// Usage: BOT_TOKEN=xxx BOT_SECRET=yyy WORKER_URL=https://your-worker.workers.dev node scripts/set-webhook.mjs
const token = process.env.BOT_TOKEN;
const secret = process.env.BOT_SECRET;
const url = process.env.WORKER_URL;

if (!token || !secret || !url) {
  console.error("Set BOT_TOKEN, BOT_SECRET, and WORKER_URL env vars first.");
  process.exit(1);
}

const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    url,
    secret_token: secret,
    allowed_updates: ["message", "inline_query", "chosen_inline_result", "callback_query"],
  }),
});

console.log(await res.json());
