"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Zap,
  Flame,
  Clock,
  Sprout,
  UserPlus,
  Send,
  Check,
  CheckCheck,
  X,
  Copy,
  ExternalLink,
  RefreshCw,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  OutreachQueueItem,
  OutreachPriority,
  OutreachQueueStatus,
  Lead,
} from "@/types";

// ─── Priority config ──────────────────────────────────
const PRIORITY_CONFIG: Record<
  OutreachPriority,
  {
    label: string;
    color: string;
    bgColor: string;
    icon: React.ComponentType<{ className?: string }>;
    order: number;
  }
> = {
  hot: {
    label: "Hot",
    color: "#EF4444",
    bgColor: "rgba(239, 68, 68, 0.12)",
    icon: Flame,
    order: 0,
  },
  follow_up: {
    label: "Follow-up",
    color: "#F59E0B",
    bgColor: "rgba(245, 158, 11, 0.12)",
    icon: Clock,
    order: 1,
  },
  nurture: {
    label: "Nurture",
    color: "#0EA5E9",
    bgColor: "rgba(14, 165, 233, 0.12)",
    icon: Sprout,
    order: 2,
  },
  first_contact: {
    label: "First Contact",
    color: "#22C55E",
    bgColor: "rgba(34, 197, 94, 0.12)",
    icon: UserPlus,
    order: 3,
  },
};

// ─── Channel config ───────────────────────────────────
const CHANNEL_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  whatsapp: { label: "WhatsApp", icon: MessageSquare },
  email: { label: "Email", icon: Mail },
  instagram_dm: { label: "Instagram", icon: MessageSquare },
  telefon: { label: "Phone", icon: Phone },
  linkedin: { label: "LinkedIn", icon: MessageSquare },
  osobno: { label: "In Person", icon: UserPlus },
};

// ─── Niche labels ─────────────────────────────────────
const NICHE_LABELS: Record<string, string> = {
  dental: "Dental",
  frizer: "Frizer",
  restoran: "Restoran",
  autoservis: "Autoservis",
  fizioterapija: "Fizioterapija",
  wellness: "Wellness",
  fitness: "Fitness",
  apartmani: "Apartmani",
  kozmetika: "Kozmetika",
  pekara: "Pekara",
  ostalo: "Ostalo",
};

// ─── Helpers ──────────────────────────────────────────
function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    toast.success("Copied to clipboard");
  }).catch(() => {
    toast.error("Failed to copy");
  });
}

// ─── Types ────────────────────────────────────────────
interface QueueItemWithEdits extends OutreachQueueItem {
  editedMessage?: string;
}

// ─── Page Component ───────────────────────────────────
export default function OutreachPage() {
  const [items, setItems] = useState<QueueItemWithEdits[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [bulkSending, setBulkSending] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);

  // ── Fetch queue ─────────────────────────────────────
  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch(`/api/outreach/queue?date=${todayStr}`);
      if (!res.ok) throw new Error("Failed to fetch queue");
      const data: OutreachQueueItem[] = await res.json();
      setItems(data.map((item) => ({ ...item, editedMessage: undefined })));
    } catch {
      toast.error("Failed to load outreach queue");
    } finally {
      setLoading(false);
    }
  }, [todayStr]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // ── Generate today's queue ──────────────────────────
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/outreach/queue", { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate queue");
      }
      const data = await res.json();
      toast.success(data.message || `Generated ${data.generated} items`);
      await fetchQueue();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to generate queue",
      );
    } finally {
      setGenerating(false);
    }
  }, [fetchQueue]);

  // ── Update item (approve, skip, edit message) ──────
  const handleUpdateItem = useCallback(
    async (
      id: string,
      updates: { status?: OutreachQueueStatus; message?: string },
    ) => {
      // Optimistic update
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                ...(updates.status ? { status: updates.status } : {}),
                ...(updates.message ? { message: updates.message, editedMessage: undefined } : {}),
              }
            : item,
        ),
      );

      try {
        const res = await fetch(`/api/outreach/queue/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        if (!res.ok) throw new Error("Failed to update");

        const updated: OutreachQueueItem = await res.json();
        setItems((prev) =>
          prev.map((item) =>
            item.id === id ? { ...updated, editedMessage: undefined } : item,
          ),
        );

        if (updates.status === "approved") {
          toast.success("Approved");
        } else if (updates.status === "skipped") {
          toast.success("Skipped");
        } else if (updates.message) {
          toast.success("Message updated");
        }
      } catch {
        // Revert
        fetchQueue();
        toast.error("Failed to update item");
      }
    },
    [fetchQueue],
  );

  // ── Send single item ───────────────────────────────
  const handleSend = useCallback(
    async (id: string) => {
      setSendingIds((prev) => new Set(prev).add(id));

      // Check if message was edited but not saved
      const item = items.find((i) => i.id === id);
      if (item?.editedMessage !== undefined) {
        // Save edited message first
        await handleUpdateItem(id, { message: item.editedMessage });
      }

      try {
        const res = await fetch(`/api/outreach/queue/${id}/send`, {
          method: "POST",
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to send");
        }

        const data = await res.json();
        setItems((prev) =>
          prev.map((item) =>
            item.id === id
              ? { ...item, status: "sent" as OutreachQueueStatus, sent_at: data.sent_at, editedMessage: undefined }
              : item,
          ),
        );

        if (data.suggest_lost) {
          toast.success("Sent & logged. Max follow-ups reached — consider marking as lost.");
        } else {
          toast.success("Sent & logged");
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to send",
        );
      } finally {
        setSendingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [items, handleUpdateItem],
  );

  // ── Approve all pending ────────────────────────────
  const handleApproveAll = useCallback(async () => {
    const pendingItems = items.filter((i) => i.status === "pending");
    if (pendingItems.length === 0) return;

    // Optimistic
    setItems((prev) =>
      prev.map((item) =>
        item.status === "pending" ? { ...item, status: "approved" as OutreachQueueStatus } : item,
      ),
    );

    try {
      const results = await Promise.all(
        pendingItems.map((item) =>
          fetch(`/api/outreach/queue/${item.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "approved" }),
          }),
        ),
      );

      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) {
        throw new Error(`Failed to approve ${failed.length} items`);
      }

      toast.success(`Approved ${pendingItems.length} items`);
    } catch {
      fetchQueue();
      toast.error("Failed to approve some items");
    }
  }, [items, fetchQueue]);

  // ── Bulk send all approved ─────────────────────────
  const handleBulkSend = useCallback(async () => {
    const approvedIds = items
      .filter((i) => i.status === "approved")
      .map((i) => i.id);

    if (approvedIds.length === 0) {
      toast.error("No approved items to send");
      return;
    }

    setBulkSending(true);
    try {
      const res = await fetch("/api/outreach/queue/bulk-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: approvedIds }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Bulk send failed");
      }

      const data = await res.json();
      toast.success(data.message || `Sent ${data.sent} items`);
      await fetchQueue();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Bulk send failed",
      );
    } finally {
      setBulkSending(false);
    }
  }, [items, fetchQueue]);

  // ── Edit message locally ───────────────────────────
  const handleEditMessage = useCallback(
    (id: string, newMessage: string) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, editedMessage: newMessage } : item,
        ),
      );
    },
    [],
  );

  // ── Save edited message ────────────────────────────
  const handleSaveMessage = useCallback(
    (id: string) => {
      const item = items.find((i) => i.id === id);
      if (item?.editedMessage !== undefined && item.editedMessage !== item.message) {
        handleUpdateItem(id, { message: item.editedMessage });
      }
    },
    [items, handleUpdateItem],
  );

  // ── Stats ───────────────────────────────────────────
  const stats = {
    hot: items.filter((i) => i.priority === "hot" && i.status !== "skipped").length,
    follow_up: items.filter((i) => i.priority === "follow_up" && i.status !== "skipped").length,
    nurture: items.filter((i) => i.priority === "nurture" && i.status !== "skipped").length,
    first_contact: items.filter((i) => i.priority === "first_contact" && i.status !== "skipped").length,
    pending: items.filter((i) => i.status === "pending" || i.status === "approved").length,
    sent: items.filter((i) => i.status === "sent").length,
  };

  // ── Group items by priority ─────────────────────────
  const grouped: Record<OutreachPriority, QueueItemWithEdits[]> = {
    hot: [],
    follow_up: [],
    nurture: [],
    first_contact: [],
  };

  for (const item of items) {
    grouped[item.priority].push(item);
  }

  const priorityOrder: OutreachPriority[] = [
    "hot",
    "follow_up",
    "nurture",
    "first_contact",
  ];

  const hasApproved = items.some((i) => i.status === "approved");
  const hasPending = items.some((i) => i.status === "pending");

  // ─── Render ─────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-[calc(100vh-5rem)] space-y-6 pb-24">
      {/* ── Header ────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0EA5E9]/10">
              <Zap className="h-5 w-5 text-[#0EA5E9]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Outreach Agent
              </h1>
              <p className="text-sm text-[#71717A]">
                AI-powered daily outreach queue
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-[#27272A] bg-[#18181B]/50 px-3 py-2">
            <Calendar className="h-4 w-4 text-[#71717A]" />
            <span className="text-sm text-[#A1A1AA]">
              {formatDate(todayStr)}
            </span>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="gap-2 shrink-0"
          >
            {generating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            {generating ? "Generating..." : "Generate Today's Queue"}
          </Button>
        </div>
      </motion.div>

      {/* ── Stats Bar ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
      >
        {[
          {
            label: "Hot",
            value: stats.hot,
            color: "#EF4444",
            icon: Flame,
          },
          {
            label: "Follow-ups",
            value: stats.follow_up,
            color: "#F59E0B",
            icon: Clock,
          },
          {
            label: "Nurture",
            value: stats.nurture,
            color: "#0EA5E9",
            icon: Sprout,
          },
          {
            label: "First Contact",
            value: stats.first_contact,
            color: "#22C55E",
            icon: UserPlus,
          },
          {
            label: "Total Pending",
            value: stats.pending,
            color: "#A1A1AA",
            icon: Clock,
          },
          {
            label: "Sent Today",
            value: stats.sent,
            color: "#22C55E",
            icon: CheckCheck,
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className="hover:border-[#3F3F46] transition-colors"
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[#71717A] mb-1">{stat.label}</p>
                    <p
                      className="text-xl font-bold"
                      style={{ color: stat.color }}
                    >
                      {stat.value}
                    </p>
                  </div>
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${stat.color}15` }}
                  >
                    <Icon
                      className="h-4 w-4"
                      style={{ color: stat.color }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </motion.div>

      {/* ── Queue Content ─────────────────────────────── */}
      {loading ? (
        <QueueSkeleton />
      ) : items.length === 0 ? (
        <EmptyState onGenerate={handleGenerate} generating={generating} />
      ) : (
        <div className="space-y-8">
          {priorityOrder.map((priority) => {
            const group = grouped[priority];
            if (group.length === 0) return null;
            const config = PRIORITY_CONFIG[priority];
            const PriorityIcon = config.icon;

            return (
              <motion.div
                key={priority}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: config.order * 0.08 }}
              >
                {/* Section header */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-lg"
                    style={{ backgroundColor: config.bgColor }}
                  >
                    <span style={{ color: config.color }}>
                      <PriorityIcon className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <h2 className="text-base font-semibold" style={{ color: config.color }}>
                    {config.label}
                  </h2>
                  <Badge
                    className="text-xs border-0"
                    style={{
                      backgroundColor: config.bgColor,
                      color: config.color,
                    }}
                  >
                    {group.length}
                  </Badge>
                  <div className="flex-1 h-px bg-[#27272A]" />
                </div>

                {/* Queue cards */}
                <div className="space-y-3">
                  {group.map((item, index) => (
                    <QueueCard
                      key={item.id}
                      item={item}
                      index={index}
                      priorityConfig={config}
                      isSending={sendingIds.has(item.id)}
                      onApprove={() =>
                        handleUpdateItem(item.id, { status: "approved" })
                      }
                      onSkip={() =>
                        handleUpdateItem(item.id, { status: "skipped" })
                      }
                      onSend={() => handleSend(item.id)}
                      onEditMessage={(msg) =>
                        handleEditMessage(item.id, msg)
                      }
                      onSaveMessage={() => handleSaveMessage(item.id)}
                    />
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Bulk Action Bar (sticky bottom) ───────────── */}
      {items.length > 0 && (hasPending || hasApproved) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#27272A] bg-[#09090B]/95 backdrop-blur-sm"
        >
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4 md:px-12">
            <div className="flex items-center gap-4">
              <span className="text-sm text-[#71717A]">
                {stats.pending} pending
                {hasApproved && (
                  <span className="text-[#22C55E]">
                    {" "}({items.filter((i) => i.status === "approved").length} approved)
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {hasPending && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleApproveAll}
                  className="gap-2"
                >
                  <Check className="h-3.5 w-3.5" />
                  Approve All
                </Button>
              )}
              {hasApproved && (
                <Button
                  size="sm"
                  onClick={handleBulkSend}
                  disabled={bulkSending}
                  className="gap-2"
                >
                  {bulkSending ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  {bulkSending ? "Sending..." : "Send All Approved"}
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Queue Card Component ─────────────────────────────
function QueueCard({
  item,
  index,
  priorityConfig,
  isSending,
  onApprove,
  onSkip,
  onSend,
  onEditMessage,
  onSaveMessage,
}: {
  item: QueueItemWithEdits;
  index: number;
  priorityConfig: {
    label: string;
    color: string;
    bgColor: string;
  };
  isSending: boolean;
  onApprove: () => void;
  onSkip: () => void;
  onSend: () => void;
  onEditMessage: (msg: string) => void;
  onSaveMessage: () => void;
}) {
  const lead = item.lead as Lead | undefined;
  const isSent = item.status === "sent";
  const isSkipped = item.status === "skipped";
  const isApproved = item.status === "approved";
  const isDone = isSent || isSkipped;

  const daysSinceContact = daysSince(lead?.last_contacted_at ?? null);
  const followUpCount = lead?.follow_up_count ?? 0;
  const maxFollowUps = lead?.max_follow_ups ?? 4;

  const currentMessage =
    item.editedMessage !== undefined ? item.editedMessage : item.message;
  const hasUnsavedEdit =
    item.editedMessage !== undefined && item.editedMessage !== item.message;

  const channelInfo = CHANNEL_CONFIG[item.channel] ?? {
    label: item.channel,
    icon: MessageSquare,
  };
  const ChannelIcon = channelInfo.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Card
        className={`transition-all duration-200 ${
          isDone
            ? "opacity-50"
            : isApproved
              ? "border-[#22C55E]/30 bg-[#22C55E]/[0.03]"
              : "hover:border-[#3F3F46]"
        }`}
      >
        <CardContent className="py-4 px-5">
          <div className="flex flex-col gap-4">
            {/* ── Top row: lead info + status ─────────── */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                {/* Priority badge */}
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5"
                  style={{ backgroundColor: priorityConfig.bgColor }}
                >
                  {isSent ? (
                    <CheckCheck className="h-4 w-4 text-[#22C55E]" />
                  ) : isSkipped ? (
                    <X className="h-4 w-4 text-[#71717A]" />
                  ) : (
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: priorityConfig.color }}
                    />
                  )}
                </div>

                {/* Lead details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3
                      className={`font-semibold text-sm ${
                        isSkipped ? "line-through text-[#71717A]" : ""
                      }`}
                    >
                      {lead?.business_name ?? "Unknown Lead"}
                    </h3>
                    {lead?.location && (
                      <span className="text-xs text-[#71717A]">
                        {lead.location}
                      </span>
                    )}
                    {lead?.niche && (
                      <Badge
                        className="text-[10px] px-1.5 py-0 border-[#27272A] bg-transparent text-[#A1A1AA]"
                      >
                        {NICHE_LABELS[lead.niche] ?? lead.niche}
                      </Badge>
                    )}
                  </div>

                  {/* Contact info + channel */}
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <Badge
                      className="text-[10px] px-1.5 py-0 gap-1 border-0"
                      style={{
                        backgroundColor: `${priorityConfig.color}15`,
                        color: priorityConfig.color,
                      }}
                    >
                      <ChannelIcon className="h-3 w-3" />
                      {channelInfo.label}
                    </Badge>

                    {lead?.phone && (
                      <button
                        onClick={() => copyToClipboard(lead.phone!)}
                        className="flex items-center gap-1 text-xs text-[#71717A] hover:text-[#A1A1AA] transition-colors"
                      >
                        <Phone className="h-3 w-3" />
                        {lead.phone}
                        <Copy className="h-2.5 w-2.5 opacity-50" />
                      </button>
                    )}

                    {lead?.email && (
                      <button
                        onClick={() => copyToClipboard(lead.email!)}
                        className="flex items-center gap-1 text-xs text-[#71717A] hover:text-[#A1A1AA] transition-colors"
                      >
                        <Mail className="h-3 w-3" />
                        {lead.email}
                        <Copy className="h-2.5 w-2.5 opacity-50" />
                      </button>
                    )}
                  </div>

                  {/* Context line */}
                  <div className="flex items-center gap-3 mt-1.5">
                    {daysSinceContact !== null && (
                      <span className="text-xs text-[#71717A]">
                        {daysSinceContact === 0
                          ? "Contacted today"
                          : `${daysSinceContact}d since last contact`}
                      </span>
                    )}
                    {daysSinceContact === null && (
                      <span className="text-xs text-[#71717A]">
                        Never contacted
                      </span>
                    )}
                    <span className="text-xs text-[#3F3F46]">&middot;</span>
                    <span className="text-xs text-[#71717A]">
                      Follow-up {followUpCount}/{maxFollowUps}
                    </span>
                    {lead?.lead_score !== null && lead?.lead_score !== undefined && (
                      <>
                        <span className="text-xs text-[#3F3F46]">&middot;</span>
                        <span className="text-xs text-[#71717A]">
                          Score: {lead.lead_score}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Status badge for sent/skipped */}
              {isSent && (
                <Badge variant="success" className="shrink-0 text-xs">
                  Sent
                </Badge>
              )}
              {isSkipped && (
                <Badge className="shrink-0 text-xs border-[#27272A] bg-transparent text-[#71717A]">
                  Skipped
                </Badge>
              )}
              {isApproved && (
                <Badge variant="success" className="shrink-0 text-xs">
                  Approved
                </Badge>
              )}
            </div>

            {/* ── Message textarea ────────────────────── */}
            {!isDone && (
              <div className="relative">
                <textarea
                  value={currentMessage}
                  onChange={(e) => onEditMessage(e.target.value)}
                  onBlur={() => {
                    if (hasUnsavedEdit) onSaveMessage();
                  }}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2.5 text-sm text-[#FAFAFA] placeholder-[#71717A] focus:border-[#0EA5E9]/50 focus:outline-none focus:ring-1 focus:ring-[#0EA5E9]/30 transition-colors"
                />
                {hasUnsavedEdit && (
                  <div className="absolute top-2 right-2">
                    <Badge className="text-[10px] px-1.5 py-0 border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#F59E0B]">
                      Unsaved
                    </Badge>
                  </div>
                )}
                <div className="flex items-center justify-between mt-2">
                  <button
                    onClick={() => copyToClipboard(currentMessage)}
                    className="flex items-center gap-1 text-xs text-[#71717A] hover:text-[#A1A1AA] transition-colors"
                  >
                    <Copy className="h-3 w-3" />
                    Copy message
                  </button>
                  <span className="text-xs text-[#3F3F46]">
                    {currentMessage.length} chars
                  </span>
                </div>
              </div>
            )}

            {/* Sent message (read-only) */}
            {isSent && (
              <div className="rounded-lg border border-[#27272A]/50 bg-[#09090B]/50 px-3 py-2.5">
                <p className="text-sm text-[#71717A]">{item.message}</p>
              </div>
            )}

            {/* ── Action buttons ──────────────────────── */}
            {!isDone && (
              <div className="flex items-center gap-2 flex-wrap">
                {!isApproved && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onApprove}
                    className="gap-1.5 border-[#22C55E]/30 text-[#22C55E] hover:bg-[#22C55E]/10 hover:text-[#22C55E]"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Approve
                  </Button>
                )}

                <Button
                  size="sm"
                  onClick={onSend}
                  disabled={isSending}
                  className="gap-1.5"
                >
                  {isSending ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  {isSending ? "Sending..." : "Send & Log"}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSkip}
                  className="gap-1.5 text-[#71717A] hover:text-[#A1A1AA]"
                >
                  <X className="h-3.5 w-3.5" />
                  Skip
                </Button>

                <a
                  href={`/crm`}
                  className="ml-auto flex items-center gap-1 text-xs text-[#71717A] hover:text-[#0EA5E9] transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  View Lead
                </a>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────
function QueueSkeleton() {
  return (
    <div className="space-y-8">
      {[0, 1, 2].map((group) => (
        <div key={group} className="space-y-3">
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="h-7 w-7 rounded-lg" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-8 rounded-md" />
            <div className="flex-1 h-px bg-[#27272A]" />
          </div>
          {[0, 1].map((card) => (
            <Card key={card}>
              <CardContent className="py-4 px-5">
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-64" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                  </div>
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-24 rounded-md" />
                    <Skeleton className="h-8 w-28 rounded-md" />
                    <Skeleton className="h-8 w-16 rounded-md" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────
function EmptyState({
  onGenerate,
  generating,
}: {
  onGenerate: () => void;
  generating: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-24"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0EA5E9]/10 mb-6">
        <Zap className="h-8 w-8 text-[#0EA5E9]" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No outreach queued</h3>
      <p className="text-sm text-[#71717A] mb-6 text-center max-w-md">
        Generate today&apos;s outreach queue to see AI-prioritized messages
        for your leads, ready to review and send.
      </p>
      <Button onClick={onGenerate} disabled={generating} className="gap-2">
        {generating ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <Zap className="h-4 w-4" />
        )}
        {generating ? "Generating..." : "Generate Today's Queue"}
      </Button>
    </motion.div>
  );
}
