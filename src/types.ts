export interface Env {
  WHISPER_KV: KVNamespace;
  BOT_TOKEN: string;
  BOT_SECRET: string;
  OWNER_IDS: string;
  BACKUP_CHANNEL_ID: string;
  BOT_USERNAME: string;
}

export type WhisperType = "whisper" | "gift";
export type WhisperStatus = "active" | "seen" | "expired" | "burned";

export interface Recipient {
  id?: number;
  username?: string;
  displayName: string;
  /** Assigned only when a whisper has more than 3 recipients. */
  emoji?: string;
  viewed?: boolean;
  viewedAt?: number;
}

export interface WhisperRecord {
  id: string;
  type: WhisperType;
  senderId: number;
  senderName: string;
  recipients: Recipient[];
  message: string;
  createdAt: number;
  /** epoch ms this whisper stops being viewable. null = no timer, one-time-view only. */
  expiresAt: number | null;
  status: WhisperStatus;
  inlineMessageId?: string;
  themeEmoji?: string;
  chatTitle?: string;
}

export interface RegisteredCode {
  code: string;
  senderId: number;
  senderName: string;
  recipients: Recipient[];
  message: string;
  type: WhisperType;
  createdAt: number;
}

export interface UserRecord {
  id: number;
  username?: string;
  displayName: string;
  banned: boolean;
  createdAt: number;
  lastActive: number;
  contacts: Recipient[]; // people this user has whispered to before
  stats: {
    sent: number;
    received: number;
    seen: number;
    gifts: number;
  };
}

export interface GlobalStats {
  totalUsers: number;
  totalWhispers: number;
  totalGifts: number;
  totalSeen: number;
  totalExpired: number;
}
