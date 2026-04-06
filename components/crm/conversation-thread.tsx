"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type FormEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Mail,
  AtSign,
  Phone,
  Globe,
  User,
  Send,
  Loader2,
  ChevronDown,
  ThumbsUp,
  Minus,
  ThumbsDown,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  ConversationEntry,
  ConversationChannel,
  ConversationDirection,
  ConversationSentiment,
} from "@/types";

// ============================================================
// Channel config
// ============================================================

interface ChannelConfig {
  label: string;
  icon: typeof Mail;
  color: string;
  bgColor: string;
}

const CHANNEL_MAP: Record<ConversationChannel, ChannelConfig> = {
  whatsapp: {
    label: "WhatsApp",
    icon: MessageCircle,
    color: "text-green-400",
    bgColor: "bg-green-400/10",
  },
  email: {
    label: "Email",
    icon: Mail,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
  },
  instagram_dm: {
    label: "Instagram DM",
    icon: AtSign,
    color: "text-pink-400",
    bgColor: "bg-pink-400/10",
  },
  telefon: {
    label: "Telefon",
    icon: Phone,
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
  },
  linkedin: {
    label: "LinkedIn",
    icon: Globe,
    color: "text-sky-400",
    bgColor: "bg-sky-400/10",
  },
  osobno: {
    label: "Osobno",
    icon: User,
    color: "text-violet-400",
    bgColor: "bg-violet-400/10",
  },
};

const SENTIMENT_CONFIG: Record<
  ConversationSentiment,
  { color: string; label: string }
> = {
  positive: { color: "bg-green-500", label: "Positive" },
  neutral: { color: "bg-[#71717A]", label: "Neutral" },
  negative: { color: "bg-red-500", label: "Negative" },
  no_response: { color: "bg-[#3F3F46]", label: "No response" },
};

// ============================================================
// Props
// ============================================================

interface ConversationThreadProps {
  leadId: string;
  onConversationUpdate?: () => void;
}

// ============================================================
// Component
// ============================================================

export function ConversationThread({
  leadId,
  onConversationUpdate,
}: ConversationThreadProps) {
  const [entries, setEntries] = useState<ConversationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [channel, setChannel] = useState<ConversationChannel>("whatsapp");
  const [direction, setDirection] = useState<ConversationDirection>("outbound");
  const [content, setContent] = useState("");
  const [sentiment, setSentiment] = useState<ConversationSentiment | null>(
    null,
  );
  const [channelDropdownOpen, setChannelDropdownOpen] = useState(false);

  const scrollEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const channelDropdownRef = useRef<HTMLDivElement>(null);

  // --------------------------------------------------------
  // Fetch conversation
  // --------------------------------------------------------

  const fetchConversation = useCallback(async () => {
    try {
      const res = await fetch(`/api/leads/${leadId}/conversation`);
      if (!res.ok) throw new Error("Failed to fetch conversation");
      const data: ConversationEntry[] = await res.json();
      setEntries(data);
    } catch {
      toast.error("Failed to load conversation");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchConversation();
  }, [fetchConversation]);

  // --------------------------------------------------------
  // Auto-scroll to bottom
  // --------------------------------------------------------

  useEffect(() => {
    if (scrollEndRef.current) {
      scrollEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [entries]);

  // --------------------------------------------------------
  // Close dropdown on outside click
  // --------------------------------------------------------

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        channelDropdownRef.current &&
        !channelDropdownRef.current.contains(e.target as Node)
      ) {
        setChannelDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // --------------------------------------------------------
  // Auto-resize textarea
  // --------------------------------------------------------

  const handleTextareaChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setContent(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  // --------------------------------------------------------
  // Submit
  // --------------------------------------------------------

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error("Message content is required");
      return;
    }

    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        channel,
        direction,
        content: content.trim(),
      };

      if (direction === "inbound" && sentiment) {
        payload.sentiment = sentiment;
      }

      const res = await fetch(`/api/leads/${leadId}/conversation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to log message");
      }

      const data = await res.json();

      // Check suggest_upgrade flag
      if (data.suggest_upgrade) {
        toast.success("Positive inbound response! Consider upgrading lead stage.");
      } else {
        toast.success("Message logged");
      }

      // Reset form
      setContent("");
      setSentiment(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      // Refresh thread
      await fetchConversation();
      onConversationUpdate?.();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to log message",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // Render helpers
  // ============================================================

  const renderChannelBadge = (ch: ConversationChannel | null) => {
    if (!ch) return null;
    const config = CHANNEL_MAP[ch];
    const Icon = config.icon;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
          config.bgColor,
          config.color,
        )}
      >
        <Icon className="h-2.5 w-2.5" />
        {config.label}
      </span>
    );
  };

  const renderSentimentDot = (s: ConversationSentiment | null) => {
    if (!s) return null;
    const config = SENTIMENT_CONFIG[s];
    return (
      <span
        className={cn("inline-block h-2 w-2 rounded-full", config.color)}
        title={config.label}
      />
    );
  };

  const renderCallEntry = (entry: ConversationEntry) => (
    <motion.div
      key={entry.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex justify-center py-2"
    >
      <div className="flex items-center gap-2 rounded-lg bg-[#18181B]/60 px-4 py-2 text-[13px] italic text-[#71717A]">
        <Phone className="h-3.5 w-3.5" />
        <span>{entry.content || "Phone call"}</span>
        <span className="text-[10px]">
          {formatDistanceToNow(new Date(entry.sent_at), { addSuffix: true })}
        </span>
        {entry.sentiment && renderSentimentDot(entry.sentiment)}
      </div>
    </motion.div>
  );

  const renderOutboundBubble = (entry: ConversationEntry) => (
    <motion.div
      key={entry.id}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex flex-col items-end gap-1 pl-12"
    >
      <div className="max-w-[85%] rounded-xl rounded-br-md border border-[#0EA5E9]/30 bg-[#0EA5E9]/15 px-4 py-3">
        {entry.subject && (
          <p className="mb-1 text-[11px] font-semibold text-[#0EA5E9]/80">
            {entry.subject}
          </p>
        )}
        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#FAFAFA]">
          {entry.content}
        </p>
      </div>
      <div className="flex items-center gap-2 pr-1">
        {renderChannelBadge(entry.channel)}
        {entry.follow_up_number && (
          <span className="text-[10px] text-[#71717A]">
            #{entry.follow_up_number}
          </span>
        )}
        <span className="text-[10px] text-[#71717A]">
          {formatDistanceToNow(new Date(entry.sent_at), { addSuffix: true })}
        </span>
      </div>
    </motion.div>
  );

  const renderInboundBubble = (entry: ConversationEntry) => (
    <motion.div
      key={entry.id}
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex flex-col items-start gap-1 pr-12"
    >
      <div className="max-w-[85%] rounded-xl rounded-bl-md border border-[#3F3F46] bg-[#27272A] px-4 py-3">
        {entry.subject && (
          <p className="mb-1 text-[11px] font-semibold text-[#A1A1AA]">
            {entry.subject}
          </p>
        )}
        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#FAFAFA]">
          {entry.content}
        </p>
      </div>
      <div className="flex items-center gap-2 pl-1">
        {renderChannelBadge(entry.channel)}
        {renderSentimentDot(entry.sentiment)}
        <span className="text-[10px] text-[#71717A]">
          {formatDistanceToNow(new Date(entry.sent_at), { addSuffix: true })}
        </span>
      </div>
    </motion.div>
  );

  const renderEntry = (entry: ConversationEntry) => {
    // Calls are centered
    if (entry.channel === "telefon") {
      return renderCallEntry(entry);
    }
    if (entry.direction === "outbound") {
      return renderOutboundBubble(entry);
    }
    return renderInboundBubble(entry);
  };

  // ============================================================
  // Main render
  // ============================================================

  return (
    <div className="flex h-full flex-col">
      {/* ------- Thread area ------- */}
      <div className="relative flex-1 overflow-y-auto" style={{ maxHeight: 400 }}>
        <div className="flex flex-col gap-3 px-2 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-[#71717A]" />
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <MessageCircle className="h-8 w-8 text-[#3F3F46]" />
              <p className="text-[13px] text-[#71717A]">
                No conversations yet. Start logging messages below.
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {entries.map((entry) => renderEntry(entry))}
            </AnimatePresence>
          )}
          <div ref={scrollEndRef} />
        </div>
      </div>

      {/* ------- Divider ------- */}
      <div className="h-px bg-[#27272A]" />

      {/* ------- Quick reply bar ------- */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-2 py-3">
        {/* Top row: channel + direction */}
        <div className="flex items-center gap-2">
          {/* Channel selector */}
          <div className="relative" ref={channelDropdownRef}>
            <button
              type="button"
              onClick={() => setChannelDropdownOpen((o) => !o)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border border-[#27272A] bg-[#18181B] px-3 py-1.5 text-[12px] font-medium transition-colors hover:border-[#3F3F46]",
                CHANNEL_MAP[channel].color,
              )}
            >
              {(() => {
                const Icon = CHANNEL_MAP[channel].icon;
                return <Icon className="h-3.5 w-3.5" />;
              })()}
              {CHANNEL_MAP[channel].label}
              <ChevronDown className="h-3 w-3 text-[#71717A]" />
            </button>

            {channelDropdownOpen && (
              <div className="absolute bottom-full left-0 z-50 mb-1 w-44 rounded-lg border border-[#27272A] bg-[#18181B] py-1 shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
                {(Object.keys(CHANNEL_MAP) as ConversationChannel[]).map(
                  (ch) => {
                    const config = CHANNEL_MAP[ch];
                    const Icon = config.icon;
                    return (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => {
                          setChannel(ch);
                          setChannelDropdownOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] transition-colors hover:bg-[#27272A]",
                          ch === channel
                            ? config.color
                            : "text-[#A1A1AA]",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {config.label}
                      </button>
                    );
                  },
                )}
              </div>
            )}
          </div>

          {/* Direction toggle */}
          <div className="flex overflow-hidden rounded-lg border border-[#27272A]">
            <button
              type="button"
              onClick={() => {
                setDirection("outbound");
                setSentiment(null);
              }}
              className={cn(
                "px-3 py-1.5 text-[12px] font-medium transition-colors",
                direction === "outbound"
                  ? "bg-[#0EA5E9]/15 text-[#0EA5E9]"
                  : "bg-[#18181B] text-[#71717A] hover:text-[#A1A1AA]",
              )}
            >
              Sent
            </button>
            <button
              type="button"
              onClick={() => setDirection("inbound")}
              className={cn(
                "border-l border-[#27272A] px-3 py-1.5 text-[12px] font-medium transition-colors",
                direction === "inbound"
                  ? "bg-[#27272A] text-[#FAFAFA]"
                  : "bg-[#18181B] text-[#71717A] hover:text-[#A1A1AA]",
              )}
            >
              Received
            </button>
          </div>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleTextareaChange}
          placeholder="Log a message..."
          rows={2}
          className="w-full resize-none rounded-lg border border-[#27272A] bg-[#18181B] px-3 py-2.5 text-[13px] text-[#FAFAFA] placeholder-[#52525B] transition-colors focus:border-[#3F3F46] focus:outline-none"
        />

        {/* Sentiment buttons (only for inbound) */}
        <AnimatePresence>
          {direction === "inbound" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-1.5 overflow-hidden"
            >
              <span className="text-[11px] text-[#71717A]">Sentiment:</span>
              <button
                type="button"
                onClick={() =>
                  setSentiment((s) =>
                    s === "positive" ? null : "positive",
                  )
                }
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                  sentiment === "positive"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-[#18181B] text-[#52525B] hover:text-[#71717A]",
                )}
              >
                <ThumbsUp className="h-3 w-3" />
                Positive
              </button>
              <button
                type="button"
                onClick={() =>
                  setSentiment((s) =>
                    s === "neutral" ? null : "neutral",
                  )
                }
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                  sentiment === "neutral"
                    ? "bg-[#71717A]/20 text-[#A1A1AA]"
                    : "bg-[#18181B] text-[#52525B] hover:text-[#71717A]",
                )}
              >
                <Minus className="h-3 w-3" />
                Neutral
              </button>
              <button
                type="button"
                onClick={() =>
                  setSentiment((s) =>
                    s === "negative" ? null : "negative",
                  )
                }
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                  sentiment === "negative"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-[#18181B] text-[#52525B] hover:text-[#71717A]",
                )}
              >
                <ThumbsDown className="h-3 w-3" />
                Negative
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={submitting || !content.trim()}
            className="gap-1.5"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Log Message
          </Button>
        </div>
      </form>
    </div>
  );
}
