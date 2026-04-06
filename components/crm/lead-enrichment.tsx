"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Shield,
  ShieldAlert,
  Smartphone,
  SmartphoneNfc,
  Star,
  RefreshCw,
  Zap,
  Globe,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Lead, LeadEnrichment } from "@/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LeadEnrichmentPanelProps {
  leadId: string;
  lead: Lead;
  onEnrichmentComplete?: (enrichment: LeadEnrichment) => void;
}

// ---------------------------------------------------------------------------
// Score color helpers
// ---------------------------------------------------------------------------

function scoreColor(score: number): string {
  if (score >= 70) return "#22C55E";
  if (score >= 40) return "#F59E0B";
  return "#EF4444";
}

function scoreLabel(score: number): string {
  if (score >= 70) return "Good";
  if (score >= 40) return "Average";
  return "Poor";
}

// ---------------------------------------------------------------------------
// Circular Progress
// ---------------------------------------------------------------------------

function CircularScore({
  score,
  label,
  size = 80,
}: {
  score: number | null;
  label: string;
  size?: number;
}) {
  if (score === null) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <div
          className="rounded-full border-2 border-[#27272A] flex items-center justify-center"
          style={{ width: size, height: size }}
        >
          <span className="text-xs text-[#52525B]">N/A</span>
        </div>
        <span className="text-xs text-[#71717A]">{label}</span>
      </div>
    );
  }

  const color = scoreColor(score);
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const center = size / 2;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#27272A"
            strokeWidth={4}
          />
          {/* Progress circle */}
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold" style={{ color }}>
            {score}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-xs text-[#71717A]">{label}</span>
        <span className="text-[10px] font-medium" style={{ color }}>
          {scoreLabel(score)}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tech stack badge colors
// ---------------------------------------------------------------------------

const TECH_COLORS: Record<string, { bg: string; text: string }> = {
  WordPress: { bg: "rgba(33, 150, 243, 0.15)", text: "#21A0F3" },
  Wix: { bg: "rgba(251, 191, 36, 0.15)", text: "#FBBF24" },
  Squarespace: { bg: "rgba(244, 244, 245, 0.15)", text: "#E4E4E7" },
  Shopify: { bg: "rgba(149, 191, 71, 0.15)", text: "#95BF47" },
  "Google Sites": { bg: "rgba(234, 67, 53, 0.15)", text: "#EA4335" },
  GoDaddy: { bg: "rgba(0, 169, 137, 0.15)", text: "#00A989" },
  Webflow: { bg: "rgba(67, 83, 255, 0.15)", text: "#4353FF" },
  "Next.js": { bg: "rgba(250, 250, 250, 0.12)", text: "#FAFAFA" },
  Gatsby: { bg: "rgba(102, 51, 153, 0.15)", text: "#663399" },
  Custom: { bg: "rgba(113, 113, 122, 0.15)", text: "#A1A1AA" },
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function LeadEnrichmentPanel({
  leadId,
  lead,
  onEnrichmentComplete,
}: LeadEnrichmentPanelProps) {
  const [enrichment, setEnrichment] = useState<LeadEnrichment | null>(null);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);

  // Fetch existing enrichment data on mount
  const fetchEnrichment = useCallback(async () => {
    try {
      const res = await fetch(`/api/leads/${leadId}/enrichment`);
      if (res.ok) {
        const data = await res.json();
        setEnrichment(data as LeadEnrichment | null);
      }
    } catch {
      // Silently fail — we just show the empty state
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchEnrichment();
  }, [fetchEnrichment]);

  // Trigger enrichment
  async function handleEnrich() {
    setEnriching(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/enrich`, {
        method: "POST",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error ?? "Enrichment failed");
      }

      const data: LeadEnrichment = await res.json();
      setEnrichment(data);
      onEnrichmentComplete?.(data);
      toast.success("Lead enriched successfully");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to enrich lead",
      );
    } finally {
      setEnriching(false);
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-[#71717A]">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading enrichment data...</span>
        </div>
      </div>
    );
  }

  // Empty state
  if (!enrichment) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-dashed border-[#27272A] bg-[#09090B]/50 p-6 text-center"
      >
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#0EA5E9]/10">
          <Zap className="h-5 w-5 text-[#0EA5E9]" />
        </div>
        <p className="text-sm text-[#A1A1AA] mb-1">No enrichment data yet.</p>
        <p className="text-xs text-[#52525B] mb-4">
          Click below to analyze this lead&apos;s website, tech stack, and
          online presence.
        </p>
        <Button
          onClick={handleEnrich}
          disabled={enriching}
          size="sm"
          className="gap-2"
        >
          {enriching ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enriching... (5-15s)
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              Enrich Lead
            </>
          )}
        </Button>
      </motion.div>
    );
  }

  // Enriched state
  const techColor = enrichment.tech_stack
    ? TECH_COLORS[enrichment.tech_stack] ?? TECH_COLORS.Custom
    : TECH_COLORS.Custom;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="enriched"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5"
      >
        {/* PageSpeed Scores */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-3.5 w-3.5 text-[#71717A]" />
            <span className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
              PageSpeed
            </span>
          </div>
          <div className="flex items-center justify-center gap-8">
            <CircularScore
              score={enrichment.page_speed_mobile}
              label="Mobile"
            />
            <CircularScore
              score={enrichment.page_speed_desktop}
              label="Desktop"
            />
          </div>
        </div>

        {/* Security & Responsiveness Row */}
        <div className="grid grid-cols-2 gap-3">
          {/* SSL */}
          <div className="rounded-lg border border-[#27272A] bg-[#09090B]/50 px-3 py-2.5">
            <div className="flex items-center gap-2">
              {enrichment.has_ssl === true ? (
                <Shield className="h-4 w-4 text-[#22C55E]" />
              ) : enrichment.has_ssl === false ? (
                <ShieldAlert className="h-4 w-4 text-[#EF4444]" />
              ) : (
                <Shield className="h-4 w-4 text-[#52525B]" />
              )}
              <div>
                <p className="text-xs text-[#71717A]">SSL Certificate</p>
                <p
                  className="text-sm font-medium"
                  style={{
                    color:
                      enrichment.has_ssl === true
                        ? "#22C55E"
                        : enrichment.has_ssl === false
                          ? "#EF4444"
                          : "#52525B",
                  }}
                >
                  {enrichment.has_ssl === true
                    ? "Secure"
                    : enrichment.has_ssl === false
                      ? "Not Secure"
                      : "Unknown"}
                </p>
              </div>
            </div>
          </div>

          {/* Mobile Responsive */}
          <div className="rounded-lg border border-[#27272A] bg-[#09090B]/50 px-3 py-2.5">
            <div className="flex items-center gap-2">
              {enrichment.is_mobile_responsive === true ? (
                <SmartphoneNfc className="h-4 w-4 text-[#22C55E]" />
              ) : enrichment.is_mobile_responsive === false ? (
                <Smartphone className="h-4 w-4 text-[#EF4444]" />
              ) : (
                <Smartphone className="h-4 w-4 text-[#52525B]" />
              )}
              <div>
                <p className="text-xs text-[#71717A]">Mobile Responsive</p>
                <p
                  className="text-sm font-medium"
                  style={{
                    color:
                      enrichment.is_mobile_responsive === true
                        ? "#22C55E"
                        : enrichment.is_mobile_responsive === false
                          ? "#EF4444"
                          : "#52525B",
                  }}
                >
                  {enrichment.is_mobile_responsive === true
                    ? "Yes"
                    : enrichment.is_mobile_responsive === false
                      ? "No"
                      : "Unknown"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tech Stack + Google Rating Row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Tech Stack */}
          <div className="rounded-lg border border-[#27272A] bg-[#09090B]/50 px-3 py-2.5">
            <p className="text-xs text-[#71717A] mb-1.5">Tech Stack</p>
            {enrichment.tech_stack ? (
              <Badge
                className="border-0 text-xs font-medium"
                style={{
                  backgroundColor: techColor.bg,
                  color: techColor.text,
                }}
              >
                {enrichment.tech_stack}
              </Badge>
            ) : (
              <span className="text-sm text-[#52525B]">Unknown</span>
            )}
          </div>

          {/* Google Rating */}
          <div className="rounded-lg border border-[#27272A] bg-[#09090B]/50 px-3 py-2.5">
            <p className="text-xs text-[#71717A] mb-1.5">Google Rating</p>
            {enrichment.google_rating !== null ? (
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className="h-3.5 w-3.5"
                      style={{
                        color:
                          star <= Math.round(enrichment.google_rating ?? 0)
                            ? "#F59E0B"
                            : "#27272A",
                        fill:
                          star <= Math.round(enrichment.google_rating ?? 0)
                            ? "#F59E0B"
                            : "none",
                      }}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium text-[#FAFAFA]">
                  {enrichment.google_rating}
                </span>
                {enrichment.google_reviews_count !== null && (
                  <span className="text-xs text-[#71717A]">
                    ({enrichment.google_reviews_count})
                  </span>
                )}
              </div>
            ) : (
              <span className="text-sm text-[#52525B]">No data</span>
            )}
          </div>
        </div>

        {/* Enrichment Summary */}
        {enrichment.enrichment_summary && (
          <div className="rounded-lg border border-[#27272A] bg-[#09090B]/50 px-3 py-2.5">
            <p className="text-xs text-[#71717A] mb-1.5">Summary</p>
            <p className="text-sm text-[#A1A1AA] leading-relaxed">
              {enrichment.enrichment_summary}
            </p>
          </div>
        )}

        {/* Candidate Signal */}
        {enrichment.enrichment_summary && (
          <div className="flex items-start gap-2">
            {enrichment.enrichment_summary.includes("Strong candidate") ? (
              <CheckCircle2 className="h-4 w-4 text-[#22C55E] mt-0.5 shrink-0" />
            ) : enrichment.enrichment_summary.includes("harder sell") ? (
              <XCircle className="h-4 w-4 text-[#EF4444] mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-[#F59E0B] mt-0.5 shrink-0" />
            )}
            <span
              className="text-xs font-medium"
              style={{
                color: enrichment.enrichment_summary.includes(
                  "Strong candidate",
                )
                  ? "#22C55E"
                  : enrichment.enrichment_summary.includes("harder sell")
                    ? "#EF4444"
                    : "#F59E0B",
              }}
            >
              {enrichment.enrichment_summary.includes("Strong candidate")
                ? "Strong candidate for Elevera services"
                : enrichment.enrichment_summary.includes("harder sell")
                  ? "Website is decent — may be a harder sell"
                  : "Moderate candidate — review before outreach"}
            </span>
          </div>
        )}

        {/* Footer: Re-enrich + Last enriched */}
        <div className="flex items-center justify-between pt-1 border-t border-[#27272A]">
          <div className="flex items-center gap-1.5 text-[#52525B]">
            <Clock className="h-3 w-3" />
            <span className="text-[11px]">
              Last enriched:{" "}
              {new Date(enrichment.enriched_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEnrich}
            disabled={enriching}
            className="h-7 text-xs gap-1.5 text-[#71717A] hover:text-[#FAFAFA]"
          >
            {enriching ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Re-enriching...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3" />
                Re-enrich
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
