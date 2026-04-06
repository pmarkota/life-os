"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, TrendingDown, Zap, Building2, Clock, AlertTriangle, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { LeadScore, ScoreRecommendation } from "@/types";

// ─── Props ─────────────────────────────────────────
interface LeadScoreDisplayProps {
  leadId: string;
  onScoreUpdate?: (score: LeadScore) => void;
}

// ─── Color config ──────────────────────────────────
function getScoreColor(score: number): string {
  if (score >= 70) return "#22C55E";
  if (score >= 50) return "#0EA5E9";
  if (score >= 30) return "#F59E0B";
  return "#EF4444";
}

const RECOMMENDATION_CONFIG: Record<
  ScoreRecommendation,
  { label: string; color: string; bgClass: string; pulse: boolean }
> = {
  close_now: {
    label: "Close Now!",
    color: "#22C55E",
    bgClass: "bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30",
    pulse: true,
  },
  pursue: {
    label: "Pursue",
    color: "#0EA5E9",
    bgClass: "bg-[#0EA5E9]/15 text-[#0EA5E9] border-[#0EA5E9]/30",
    pulse: false,
  },
  nurture: {
    label: "Nurture",
    color: "#F59E0B",
    bgClass: "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30",
    pulse: false,
  },
  drop: {
    label: "Drop",
    color: "#EF4444",
    bgClass: "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30",
    pulse: false,
  },
};

// ─── Score Circle SVG ──────────────────────────────
function ScoreCircle({ score, maxScore = 100 }: { score: number; maxScore?: number }) {
  const color = getScoreColor(score);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(score / maxScore, 1);
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="relative w-[140px] h-[140px] flex items-center justify-center">
      <svg
        viewBox="0 0 120 120"
        className="w-full h-full -rotate-90"
      >
        {/* Background track */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#27272A"
          strokeWidth="8"
        />
        {/* Score arc */}
        <motion.circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
        />
      </svg>
      {/* Score number */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <span
          className="text-3xl font-bold tabular-nums"
          style={{ color }}
        >
          {score}
        </span>
        <span className="text-[10px] text-[#71717A] font-medium uppercase tracking-wider">
          / {maxScore}
        </span>
      </motion.div>
    </div>
  );
}

// ─── Breakdown bar ─────────────────────────────────
function BreakdownBar({
  label,
  value,
  max,
  color,
  icon: Icon,
  isNegative,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  icon: typeof Zap;
  isNegative?: boolean;
}) {
  const percentage = isNegative
    ? Math.min(value / 30, 1) * 100 // scale negative out of 30 for visual
    : Math.min(value / max, 1) * 100;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5" style={{ color }} />
          <span className="text-xs font-medium text-[#A1A1AA]">{label}</span>
        </div>
        <span
          className="text-xs font-bold tabular-nums"
          style={{ color }}
        >
          {isNegative ? `-${value}` : value}
          <span className="text-[#52525B] font-normal">
            /{isNegative ? "pen" : max}
          </span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-[#27272A] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
        />
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────
export function LeadScoreDisplay({ leadId, onScoreUpdate }: LeadScoreDisplayProps) {
  const [score, setScore] = useState<LeadScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);

  // Fetch existing score
  const fetchScore = useCallback(async () => {
    try {
      const res = await fetch(`/api/leads/${leadId}/score`);
      if (res.ok) {
        const data: LeadScore = await res.json();
        setScore(data);
      } else if (res.status === 404) {
        setScore(null);
      }
    } catch {
      // Silently handle — score may not exist yet
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchScore();
  }, [fetchScore]);

  // Re-score lead
  const handleRescore = useCallback(async () => {
    setScoring(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/score`, {
        method: "POST",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errData.error || "Scoring failed");
      }

      const data: LeadScore = await res.json();
      setScore(data);
      onScoreUpdate?.(data);
      toast.success("Lead scored successfully");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to score lead",
      );
    } finally {
      setScoring(false);
    }
  }, [leadId, onScoreUpdate]);

  // Move to lost
  const handleMoveLost = useCallback(async () => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "lost" }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      toast.success("Lead moved to Lost");
    } catch {
      toast.error("Failed to move lead to Lost");
    }
  }, [leadId]);

  // ── Loading skeleton ─────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex justify-center">
          <Skeleton className="w-[140px] h-[140px] rounded-full" />
        </div>
        <Skeleton className="h-6 w-24 mx-auto rounded-full" />
        <div className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  // ── No score yet ─────────────────────────────────
  if (!score) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 px-4">
        <div className="w-[140px] h-[140px] rounded-full border-2 border-dashed border-[#27272A] flex items-center justify-center">
          <span className="text-[#52525B] text-sm font-medium">No score</span>
        </div>
        <p className="text-sm text-[#71717A] text-center">
          Score this lead to get a recommendation and detailed breakdown.
        </p>
        <Button
          onClick={handleRescore}
          disabled={scoring}
          className="gap-2"
        >
          {scoring ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          {scoring ? "Scoring..." : "Score Lead"}
        </Button>
      </div>
    );
  }

  // ── Score display ────────────────────────────────
  const rec = score.recommendation
    ? RECOMMENDATION_CONFIG[score.recommendation]
    : null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={score.scored_at}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="space-y-5 py-2"
      >
        {/* ── Score circle + recommendation ────────── */}
        <div className="flex flex-col items-center gap-3">
          <ScoreCircle score={score.total_score} />

          {rec && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className={`
                inline-flex items-center rounded-full px-3 py-1 text-xs font-bold border
                ${rec.bgClass}
                ${rec.pulse ? "animate-pulse" : ""}
              `}
            >
              {score.recommendation === "close_now" && (
                <Trophy className="h-3 w-3 mr-1" />
              )}
              {rec.label}
            </motion.span>
          )}
        </div>

        {/* ── Score breakdown bars ──────────────────── */}
        <div className="space-y-3 px-1">
          <BreakdownBar
            label="Engagement"
            value={score.engagement_score}
            max={40}
            color="#0EA5E9"
            icon={Zap}
          />
          <BreakdownBar
            label="Business Fit"
            value={score.business_score}
            max={30}
            color="#8B5CF6"
            icon={Building2}
          />
          <BreakdownBar
            label="Timing"
            value={score.timing_score}
            max={20}
            color="#06B6D4"
            icon={Clock}
          />
          {score.negative_score > 0 && (
            <BreakdownBar
              label="Penalty"
              value={score.negative_score}
              max={30}
              color="#EF4444"
              icon={TrendingDown}
              isNegative
            />
          )}
        </div>

        {/* ── Recommendation reason ─────────────────── */}
        {score.recommendation_reason && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-xs text-[#71717A] leading-relaxed px-1"
          >
            {score.recommendation_reason}
          </motion.p>
        )}

        {/* ── Similar won leads ─────────────────────── */}
        {score.similar_won_leads && score.similar_won_leads.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="space-y-2 px-1"
          >
            <p className="text-[10px] uppercase tracking-wider text-[#52525B] font-semibold">
              Similar Won Leads
            </p>
            <div className="flex flex-wrap gap-1.5">
              {score.similar_won_leads.map((won) => (
                <span
                  key={won.id}
                  className="inline-flex items-center gap-1 rounded-md border border-[#22C55E]/20 bg-[#22C55E]/5 px-2 py-0.5 text-[11px] text-[#22C55E]"
                >
                  <Trophy className="h-2.5 w-2.5" />
                  {won.business_name}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Actions ───────────────────────────────── */}
        <div className="flex gap-2 pt-1 px-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRescore}
            disabled={scoring}
            className="flex-1 gap-1.5"
          >
            {scoring ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {scoring ? "Scoring..." : "Re-score"}
          </Button>

          {score.recommendation === "drop" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMoveLost}
              className="flex-1 gap-1.5 border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444]/10 hover:text-[#EF4444]"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Move to Lost
            </Button>
          )}
        </div>

        {/* ── Scored timestamp ──────────────────────── */}
        <p className="text-[10px] text-[#3F3F46] text-center">
          Scored{" "}
          {new Date(score.scored_at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </motion.div>
    </AnimatePresence>
  );
}
