# 🤫 Whisper Bot

A premium, inline-only Telegram bot for sending private, self-destructing messages —
built with **grammY 1.45.1**, deployed on **Cloudflare Workers**, backed by **Workers KV**.

No group membership. No stored chat history. Just `@YourBot` + a message, anywhere in Telegram.

---

## ✨ How it works

Type this in **any chat, any group, any DM** — the bot doesn't need to be added anywhere:

```
@YourBot @username your secret message
```

A clean card appears in the chat. Only the person you mentioned can tap **Reveal Whisper**
and see the message — in a private Telegram popup that nobody else in the chat can see.
Once it's read, the card updates to show it was seen, and the content is gone for good.

## 🔒 Core mechanic (and why it's genuinely private)

Telegram's `answerCallbackQuery` popup is rendered client-side, directly by the Telegram
app — it is **not a chat message**. It never touches chat history, can't be forwarded, and
the bot never posts the secret text into the group. The card you see in the chat only ever
contains metadata (sender, recipient, timer) — the real message lives in Workers KV and is
only ever handed to the one person allowed to see it.

> **Honest limits, not overpromises:**
> - Popups are capped by Telegram at ~200 characters. Longer whispers automatically fall
>   back to a private DM delivery instead (see below).
> - `protect_content: true` disables forwarding/saving of whisper cards, but **no bot can
>   block screenshots** — that's an OS-level restriction only Telegram's own Secret Chats have.
> - Telegram does not tell bots which chat an inline message was posted into (by design, for
>   inline-mode privacy). So "seen" notifications tell the sender *who* opened it, but can't
>   link back to the exact chat/message.

---

## 🚀 Features

| Feature | Details |
|---|---|
| **Inline-only** | Never needs to be added to a group. Just `@BotUsername` anywhere. |
| **Popup reveal** | Secret text shown once, in a native Telegram alert popup. |
| **Auto-expiring cards** | Add `+10m`, `+1h`, `+1d` — or default to one-time view. |
| **Multi-recipient whispers** | ≤3 people → real @mentions. >3 people → each gets a random emoji instead, keeping the card short. |
| **No-username targeting** | Works via numeric Telegram user ID if someone has no @username. |
| **Reply-to-whisper** | In the bot's DM, reply to any message to whisper directly to that person. |
| **Recent contacts** | Type just a message (no recipient) and the bot offers your recent contacts as one-tap targets. |
| **Registered codes** | Compose a whisper once in DM → get a reusable 6-digit code → fire it anywhere with `@BotUsername 123456`. |
| **Long-message fallback** | Messages over ~190 chars automatically switch to a "Open in DM" deep link instead of a popup. |
| **Gifts** | Same delivery pipeline, distinct 🎁 card styling — a fun, text-based "gift" wrapper. |
| **Owner panel** | `/admin` → global stats, ping, runtime info, ban/unban, CSV export of all users. |
| **Backup channel** | Every whisper is mirrored (sender → message → recipient) to a private channel you control. |
| **Rate limiting** | KV-backed, generous defaults — invisible unless someone's abusing it. |
| **History** | DM → 🕐 History shows your last 36 hours of whisper activity. |
| **Stats** | Per-user sent/received/seen/gift counters, shown as a clean card. |

---

## 🎨 Design choices

- **Button "styles" without native support** — Telegram inline buttons have no colour/style
  API (unlike Discord components). We simulate Primary/Danger/Progress using consistent
  circle-emoji prefixes (🔵 🔴 🟢), cycling in sequence across a whisper's lifecycle so it
  still *reads* as a styled state machine.
- **Every card** ends with a small-caps footer: `ˣ ᴮᵒᵗˢ x bots`.
- **MarkdownV2** throughout, with a small escaper (`utils/card.ts`) so user-submitted text
  never breaks formatting.
- **Countdown timers** are event-driven, not polled every 30s. Cards update the instant a
  whisper is seen or expires — plus a 1-minute Cloudflare Cron sweep closes out anything
  that timed out unopened. (Cloudflare Cron Triggers can't go below 1-minute granularity
  anyway, and at this bot's expected volume, event-driven updates are both cheaper and more
  accurate than a ticking timer.)

---

## 📁 Project structure

```
whisper-bot/
├── src/
│   ├── index.ts              # Cloudflare Worker entry point (webhook + cron)
│   ├── bot.ts                 # grammY bot wiring — commands, inline query, callbacks
│   ├── scheduled.ts            # Cron sweep: closes out expired whispers
│   ├── config.ts               # Enums, emoji maps, timer parsing, owner check
│   ├── keyboards.ts             # ALL inline keyboards, kept in one file as requested
│   ├── types.ts                 # Shared TypeScript interfaces
│   ├── handlers/
│   │   ├── inlineQuery.ts        # Core whisper composition (the ⭐ of the bot)
│   │   ├── callbackQuery.ts       # Reveal logic — the "burn after reading" flow
│   │   ├── start.ts                # /start, welcome card, long-message DM delivery
│   │   ├── menu.ts                  # DM menu buttons: stats, history, help
│   │   ├── compose.ts                # DM compose flow → registers 6-digit codes
│   │   └── admin.ts                   # Owner panel: stats, ping, ban, CSV export
│   ├── kv/
│   │   ├── whispers.ts                 # Whisper CRUD + active-id tracking for cron
│   │   ├── users.ts                     # User records, contacts, username→id cache
│   │   ├── codes.ts                      # 6-digit registered whisper codes
│   │   └── stats.ts                       # Global stats + 36h per-user history
│   └── utils/
│       ├── encode.ts                       # base64url + id generators
│       ├── emojiMention.ts                  # Multi-recipient emoji assignment
│       ├── time.ts                           # Countdown formatting
│       ├── card.ts                            # MarkdownV2 card builders + escaper
│       ├── parseInline.ts                      # Inline query text parser
│       ├── rateLimit.ts                         # KV-backed rate limiter
│       └── backup.ts                             # Mirrors whispers to backup channel
├── scripts/
│   ├── set-webhook.mjs
│   └── delete-webhook.mjs
├── wrangler.toml
├── package.json
├── tsconfig.json
└── .dev.vars.example
```

---

## 🛠️ Setup

### 1. Create the bot
Talk to [@BotFather](https://t.me/BotFather):
```
/newbot                  → get your BOT_TOKEN
/setinline               → enable inline mode
/setinlinefeedback       → set to 100% (lets the bot capture inline_message_id for the cron sweep)
```

### 2. Install dependencies
```bash
npm install
```

### 3. Create the KV namespace
```bash
npx wrangler kv namespace create WHISPER_KV
npx wrangler kv namespace create WHISPER_KV --preview
```
Paste the returned `id` and `preview_id` into `wrangler.toml`.

### 4. Set your secrets
```bash
npx wrangler secret put BOT_TOKEN
npx wrangler secret put BOT_SECRET        # any long random string you make up
npx wrangler secret put OWNER_IDS         # comma-separated Telegram numeric user ids
npx wrangler secret put BACKUP_CHANNEL_ID # e.g. -1001234567890
```
Also update `BOT_USERNAME` in `wrangler.toml` under `[vars]` to your bot's @username
(without the @).

### 5. Deploy
```bash
npx wrangler deploy
```
Copy the `*.workers.dev` URL it prints.

### 6. Register the webhook
```bash
BOT_TOKEN=xxx BOT_SECRET=yyy WORKER_URL=https://whisper-bot.yoursubdomain.workers.dev \
  node scripts/set-webhook.mjs
```

### 7. Add the bot to your backup channel
Add the bot as an admin of the channel you set as `BACKUP_CHANNEL_ID` so it can post there.

That's it — try `@YourBot @yourfriend hello` in any chat.

---

## 🧪 Local development
```bash
cp .dev.vars.example .dev.vars   # fill in real values
npx wrangler dev
```
Note: Telegram needs a public HTTPS URL for webhooks, so local testing usually means either
tunneling (e.g. `cloudflared tunnel`) or just iterating with `wrangler deploy` directly —
both are cheap and fast on Workers.

---

## 👑 Owner commands
- `/admin` — opens the owner panel (Global Stats, Ping, Run Info, Export CSV)
- `/ban <user_id>` / `/unban <user_id>` — block/unblock a user from using the bot

---

## 📌 Notes on scale
This is intentionally built for **light, personal-scale usage** — a handful of whispers a
day, as described. Workers KV, the 1-minute cron sweep, and fixed-window rate limiting are
all more than sufficient here. If usage ever grows dramatically (thousands of concurrent
active whispers), the sweep loop and rate limiter are the first two things worth revisiting
— but there's no need to over-engineer for that today.
