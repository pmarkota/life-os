"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Trophy,
  TrendingUp,
  Clock,
  XCircle,
  RefreshCw,
  MapPin,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Lead, LeadScore, ScoreRecommendation } from "@/types";

// ─── Props ─────────────────────────────────────────
interface ScoredViewProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
}

// ─── Score color ───────────────────────────────────
function getScoreColor(score: number): string {
  if (score >= 70) return "#22C55E";
  if (score >= 50) return "#0EA5E9";
  if (score >= 30) return "#F59E0B";
  return "#EF4444";
}

function getScoreBg(score: number): string {
  if (score >= 70) return "bg-[#22C55E]/15";
  if (score >= 50) return "bg-[#0EA5E9]/15";
  if (score >= 30) return "bg-[#F59E0B]/15";
  return "bg-[#EF4444]/15";
}

// ─── Group config ──────────────────────────────────
const GROUP_CONFIG: Record<
  ScoreRecommendation,
  { label: string; color: string; bgColor: string; icon: typeof Trophy }
> = {
  close_now: {
    label: "Close Now",
    color: "#22C55E",
    bgColor: "bg-[#22C55E]/8",
    icon: Trophy,
  },
  pursue: {
    label: "Pursue",
    color: "#0EA5E9",
    bgColor: "bg-[#0EA5E9]/8",
    icon: TrendingUp,
  },
  nurture: {
    label: "Nurture",
    color: "#F59E0B",
    bgColor: "bg-[#F59E0B]/8",
    icon: Clock,
  },
  drop: {
    label: "Drop",
    color: "#EF4444",
    bgColor: "bg-[#EF4444]/8",
    icon: XCircle,
  },
};

const GROUP_ORDER: ScoreRecommendation[] = [
  "close_now",
  "pursue",
  "nurture",
  "drop",
];

// ─── Niche labels ──────────────────────────────────
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

// ─── Helpers ───────────────────────────────────────
function daysSince(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "1 day ago";
  return `${diff} days ago`;
}

// ─── Types for scored data ─────────────────────────
interface ScoredLead {
  lead: Lead;
  score: LeadScore;
}

// ─── Score Badge ───────────────────────────────────
function ScoreBadge({ score }: { score: number }) {
  const color = getScoreColor(score);
  const bg = getScoreBg(score);

  return (
    <div
      className={`${bg} flex h-10 w-10 items-center justify-center rounded-lg shrink-0`}
    >
      <span
        className="text-sm font-bold tabular-nums"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
}

// ─── Lead Row ──────────────────────────────────────
function ScoredLeadRow({
  item,
  index,
  onSelect,
}: {
  item: ScoredLead;
  index: number;
  onSelect: () => void;
}) {
  const { lead, score } = item;

  return (
    <motion.button
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      onClick={onSelect}
      className="group flex w-full items-center gap-3 rounded-lg border border-[#27272A] bg-[#18181B]/60 px-3 py-2.5 text-left transition-all duration-150 hover:border-[#3F3F46] hover:bg-[#1E1E22]"
    >
      {/* Score badge */}
      <ScoreBadge score={score.total_score} />

      {/* Lead info */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#FAFAFA] truncate">
            {lead.business_name}
          </span>
          {lead.niche && (
            <Badge
              className="shrink-0 border-0 text-[10px] px-1.5 py-0 bg-[#27272A] text-[#A1A1AA]"
            >
              {NICHE_LABELS[lead.niche] ?? lead.niche}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px] text-[#52525B]">
          {lead.location && (
            <span className="flex items-center gap-0.5">
              <MapPin className="h-2.5 w-2.5" />
              {lead.location}
            </span>
          )}
          <span>
            Contacted: {daysSince(lead.last_contacted_at)}
          </span>
        </div>

        {/* Truncated recommendation reason */}
        {score.recommendation_reason && (
          <p className="text-[11px] text-[#71717A] truncate max-w-md">
            {score.recommendation_reason}
          </p>
        )}
      </div>

      {/* Arrow */}
      <ChevronRight className="h-4 w-4 text-[#3F3F46] shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-[#71717A]" />
    </motion.button>
  );
}

// ─── Group Section ─────────────────────────────────
function ScoreGroup({
  recommendation,
  items,
  onSelect,
}: {
  recommendation: ScoreRecommendation;
  items: ScoredLead[];
  onSelect: (lead: Lead) => void;
}) {
  const config = GROUP_CONFIG[recommendation];
  const Icon = config.icon;

  if (items.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2"
    >
      {/* Group header */}
      <div
        className={`flex items-center gap-2 rounded-lg px-3 py-2 ${config.bgColor}`}
      >
        <Icon className="h-4 w-4" style={{ color: config.color }} />
        <span
          className="text-sm font-semibold"
          style={{ color: config.color }}
        >
          {config.label}
        </span>
        <span
          className="ml-auto text-xs font-medium tabular-nums"
          style={{ color: config.color }}
        >
          {items.length} lead{items.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Lead rows */}
      <div className="space-y-1.5 pl-1">
        {items.map((item, i) => (
          <ScoredLeadRow
            key={item.lead.id}
            item={item}
            index={i}
            onSelect={() => onSelect(item.lead)}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Loading skeleton ──────────────────────────────
function ScoredViewSkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1, 2].map((g) => (
        <div key={g} className="space-y-2">
          <Skeleton className="h-10 w-full rounded-lg" />
          {[0, 1, 2].map((r) => (
            <Skeleton key={r} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────
export function ScoredView({ leads, onSelectLead }: ScoredViewProps) {
  const [scoredData, setScoredData] = useState<Record<ScoreRecommendation, ScoredLead[]> | null>(null);
  const [loading, setLoading] = useState(false);
  const [scoringAll, setScoringAll] = useState(false);
  const [totalScored, setTotalScored] = useState(0);

  // Fetch existing scores on mount
  const fetchScores = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leads/scores");
      if (!res.ok) throw new Error("Failed to fetch scores");

      const data: Array<LeadScore & { lead: Lead }> = await res.json();

      // Group by recommendation
      const grouped: Record<ScoreRecommendation, ScoredLead[]> = {
        close_now: [],
        pursue: [],
        nurture: [],
        drop: [],
      };

      for (const item of data) {
        const rec = item.recommendation ?? "drop";
        grouped[rec].push({
          lead: item.lead,
          score: {
            id: item.id,
            lead_id: item.lead_id,
            total_score: item.total_score,
            engagement_score: item.engagement_score,
            business_score: item.business_score,
            timing_score: item.timing_score,
            negative_score: item.negative_score,
            recommendation: item.recommendation,
            recommendation_reason: item.recommendation_reason,
            similar_won_leads: item.similar_won_leads,
            scored_at: item.scored_at,
          },
        });
      }

      setScoredData(grouped);
      setTotalScored(data.length);
    } catch {
      toast.error("Failed to load scores");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  // Score all leads
  const handleScoreAll = useCallback(async () => {
    setScoringAll(true);
    try {
      const res = await fetch("/api/leads/score-all", {
        method: "POST",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errData.error || "Scoring failed");
      }

      const data = await res.json();

      // Reshape into our ScoredLead format
      const grouped: Record<ScoreRecommendation, ScoredLead[]> = {
        close_now: [],
        pursue: [],
        nurture: [],
        drop: [],
      };

      for (const rec of GROUP_ORDER) {
        const items = data.results[rec] ?? [];
        for (const item of items as Array<{ lead: Lead } & LeadScore>) {
          grouped[rec].push({
            lead: item.lead,
            score: {
              id: item.id ?? "",
              lead_id: item.lead_id,
              total_score: item.total_score,
              engagement_score: item.engagement_score,
              business_score: item.business_score,
              timing_score: item.timing_score,
              negative_score: item.negative_score,
              recommendation: item.recommendation,
              recommendation_reason: item.recommendation_reason,
              similar_won_leads: item.similar_won_leads,
              scored_at: item.scored_at,
            },
          });
        }
      }

      setScoredData(grouped);
      setTotalScored(data.scored);
      toast.success(`Scored ${data.scored} leads`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to score leads",
      );
    } finally {
      setScoringAll(false);
    }
  }, []);

  // Total count across groups
  const groupCounts = useMemo(() => {
    if (!scoredData) return null;
    return GROUP_ORDER.reduce(
      (acc, rec) => {
        acc[rec] = scoredData[rec].length;
        return acc;
      },
      {} as Record<ScoreRecommendation, number>,
    );
  }, [scoredData]);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* ── Header ────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="h-4 w-4 text-[#F59E0B]" />
          <div>
            <h3 className="text-sm font-semibold text-[#FAFAFA]">
              Lead Scoring
            </h3>
            {totalScored > 0 && (
              <p className="text-[11px] text-[#52525B]">
                {totalScored} leads scored
              </p>
            )}
          </div>

          {/* Mini summary badges */}
          {groupCounts && (
            <div className="hidden sm:flex items-center gap-1 ml-2">
              {GROUP_ORDER.map((rec) => {
                const count = groupCounts[rec];
                if (count === 0) return null;
                const cfg = GROUP_CONFIG[rec];
                return (
                  <span
                    key={rec}
                    className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{
                      backgroundColor: `${cfg.color}15`,
                      color: cfg.color,
                    }}
                  >
                    {count}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchScores}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={handleScoreAll}
            disabled={scoringAll}
            className="gap-1.5"
          >
            {scoringAll ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}
            {scoringAll ? "Scoring..." : "Score All"}
          </Button>
        </div>
      </div>

      {/* ── Content ───────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-5 pb-4 pr-1">
        <AnimatePresence mode="wait">
          {loading && !scoredData ? (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ScoredViewSkeleton />
            </motion.div>
          ) : scoredData ? (
            <motion.div
              key="data"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              {GROUP_ORDER.map((rec) => (
                <ScoreGroup
                  key={rec}
                  recommendation={rec}
                  items={scoredData[rec]}
                  onSelect={onSelectLead}
                />
              ))}

              {/* Empty state */}
              {totalScored === 0 && (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <div className="h-12 w-12 rounded-full bg-[#27272A] flex items-center justify-center">
                    <Zap className="h-5 w-5 text-[#52525B]" />
                  </div>
                  <p className="text-sm text-[#71717A]">
                    No leads have been scored yet.
                  </p>
                  <p className="text-xs text-[#52525B]">
                    Click &ldquo;Score All&rdquo; to analyze your pipeline.
                  </p>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="h-12 w-12 rounded-full bg-[#27272A] flex items-center justify-center">
                <Zap className="h-5 w-5 text-[#52525B]" />
              </div>
              <p className="text-sm text-[#71717A]">
                Score your leads to prioritize outreach.
              </p>
              <Button
                onClick={handleScoreAll}
                disabled={scoringAll}
                className="gap-2"
              >
                {scoringAll ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                {scoringAll ? "Scoring..." : "Score All Leads"}
              </Button>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
