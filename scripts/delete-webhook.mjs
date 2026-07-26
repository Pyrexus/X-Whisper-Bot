// Usage: BOT_TOKEN=xxx node scripts/delete-webhook.mjs
const token = process.env.BOT_TOKEN;
if (!token) {
  console.error("Set BOT_TOKEN env var first.");
  process.exit(1);
}
const res = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`, { method: "POST" });
console.log(await res.json());
