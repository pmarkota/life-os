// Discord webhook helper — sends rich embeds to a channel
// Only sends if DISCORD_WEBHOOK_URL is set, otherwise silently skips.

interface DiscordField {
  name: string;
  value: string;
  inline?: boolean;
}

interface DiscordEmbed {
  title: string;
  description?: string;
  color?: number;
  fields?: DiscordField[];
  footer?: { text: string };
  timestamp?: string;
}

export async function sendDiscordMessage(
  content: string,
  embeds?: DiscordEmbed[],
): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Petar OS",
        avatar_url: "https://cdn.discordapp.com/embed/avatars/0.png",
        content,
        embeds: embeds ?? [],
      }),
    });
  } catch {
    // Best effort — don't break the cron job if Discord fails
  }
}

// Color constants (Discord uses decimal, not hex)
export const COLORS = {
  blue: 0x0ea5e9,
  green: 0x22c55e,
  amber: 0xf59e0b,
  red: 0xef4444,
  purple: 0x8b5cf6,
} as const;
