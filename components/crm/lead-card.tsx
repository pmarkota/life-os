"use client";

import { MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Lead, LeadNiche, LeadStatus } from "@/types";

// ─── Status border colors ────────────────────────────
const STATUS_BORDER_COLOR: Record<LeadStatus, string> = {
  new: "border-l-[#0EA5E9]",
  demo_built: "border-l-[#8B5CF6]",
  contacted: "border-l-[#3B82F6]",
  replied: "border-l-[#F59E0B]",
  call_booked: "border-l-[#06B6D4]",
  follow_up: "border-l-[#F97316]",
  won: "border-l-[#22C55E]",
  lost: "border-l-[#EF4444]",
};

// ─── Niche badge styles ──────────────────────────────
const NICHE_STYLES: Record<LeadNiche, { bg: string; text: string }> = {
  dental: { bg: "bg-[#A855F7]/10", text: "text-[#A855F7]" },
  frizer: { bg: "bg-[#EC4899]/10", text: "text-[#EC4899]" },
  restoran: { bg: "bg-[#F97316]/10", text: "text-[#F97316]" },
  autoservis: { bg: "bg-[#71717A]/10", text: "text-[#71717A]" },
  fizioterapija: { bg: "bg-[#22C55E]/10", text: "text-[#22C55E]" },
  wellness: { bg: "bg-[#0EA5E9]/10", text: "text-[#0EA5E9]" },
  fitness: { bg: "bg-[#EF4444]/10", text: "text-[#EF4444]" },
  apartmani: { bg: "bg-[#D97706]/10", text: "text-[#D97706]" },
  kozmetika: { bg: "bg-[#EAB308]/10", text: "text-[#EAB308]" },
  pekara: { bg: "bg-[#A1A1AA]/10", text: "text-[#A1A1AA]" },
  ostalo: { bg: "bg-[#52525B]/10", text: "text-[#52525B]" },
};

// ─── Helpers ─────────────────────────────────────────
function getDaysSinceContact(lastContactedAt: string | null): string {
  if (!lastContactedAt) return "New";
  const now = new Date();
  const last = new Date(lastContactedAt);
  const diffMs = now.getTime() - last.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1d ago";
  return `${diffDays}d ago`;
}

function capitalizeNiche(niche: LeadNiche): string {
  return niche.charAt(0).toUpperCase() + niche.slice(1);
}

// ─── Props ───────────────────────────────────────────
interface LeadCardProps {
  lead: Lead;
  isDragging?: boolean;
  onClick?: () => void;
}

export function LeadCard({ lead, isDragging = false, onClick }: LeadCardProps) {
  const nicheStyle = lead.niche ? NICHE_STYLES[lead.niche] : null;
  const contactLabel = getDaysSinceContact(lead.last_contacted_at);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: isDragging ? 0.6 : 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      onClick={onClick}
      className={cn(
        "group relative rounded-lg border border-[#27272A] bg-[#18181B] p-3",
        "border-l-[3px] cursor-grab active:cursor-grabbing",
        "transition-[border-color,box-shadow] duration-150",
        "hover:border-[#3F3F46] hover:shadow-[0_4px_16px_rgba(0,0,0,0.25)]",
        STATUS_BORDER_COLOR[lead.status],
        isDragging && "shadow-[0_12px_40px_rgba(0,0,0,0.45)] border-[#3F3F46]",
      )}
    >
      {/* Business name + score badge */}
      <div className="flex items-center justify-between gap-1">
        <p className="text-sm font-semibold text-[#FAFAFA] truncate leading-tight">
          {lead.business_name}
        </p>
        {lead.lead_score !== null && lead.lead_score > 0 && (
          <span
            className={cn(
              "shrink-0 rounded-full px-1.5 py-0 text-[10px] font-bold tabular-nums",
              lead.lead_score >= 70
                ? "bg-[#22C55E]/15 text-[#22C55E]"
                : lead.lead_score >= 50
                  ? "bg-[#0EA5E9]/15 text-[#0EA5E9]"
                  : lead.lead_score >= 30
                    ? "bg-[#F59E0B]/15 text-[#F59E0B]"
                    : "bg-[#EF4444]/15 text-[#EF4444]",
            )}
          >
            {lead.lead_score}
          </span>
        )}
      </div>

      {/* Location row */}
      {lead.location && (
        <div className="mt-1.5 flex items-center gap-1 text-[#71717A]">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="text-xs truncate">{lead.location}</span>
        </div>
      )}

      {/* Bottom row: niche badge + days since contact */}
      <div className="mt-2 flex items-center justify-between gap-2">
        {nicheStyle ? (
          <Badge
            className={cn(
              "border-0 px-1.5 py-0 text-[10px] font-medium",
              nicheStyle.bg,
              nicheStyle.text,
            )}
          >
            {capitalizeNiche(lead.niche!)}
          </Badge>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-1.5">
          {lead.last_enriched_at && (
            <span
              className={cn(
                "h-2 w-2 rounded-full shrink-0",
                lead.page_speed !== null && lead.page_speed >= 70
                  ? "bg-[#22C55E]"
                  : lead.page_speed !== null && lead.page_speed >= 40
                    ? "bg-[#F59E0B]"
                    : lead.page_speed !== null
                      ? "bg-[#EF4444]"
                      : "bg-[#71717A]",
              )}
              title={`Enriched • PageSpeed: ${lead.page_speed ?? "N/A"}`}
            />
          )}
          <span
            className={cn(
              "text-[10px] font-medium tabular-nums",
              contactLabel === "New" ? "text-[#0EA5E9]" : "text-[#A1A1AA]",
            )}
          >
            {contactLabel}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
