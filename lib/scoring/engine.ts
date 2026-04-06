// ============================================
// Petar OS — Lead Scoring Engine
// Deterministic scoring: Engagement + Business + Timing - Negative
// ============================================

import type {
  Lead,
  LeadEnrichment,
  OutreachLog,
  ScoreRecommendation,
} from "@/types";

// ─── Score Result ──────────────────────────────────
export interface ScoreBreakdown {
  total_score: number;
  engagement_score: number;
  business_score: number;
  timing_score: number;
  negative_score: number;
  recommendation: ScoreRecommendation;
  recommendation_reason: string;
  similar_won_leads: Array<{ id: string; business_name: string; niche: string }>;
}

// ─── Keyword lists ─────────────────────────────────

const ENGAGEMENT_REQUEST_KEYWORDS = [
  "tražil",
  "mogu vidjeti",
  "može link",
  "pokažite",
  "can i see",
  "show me",
];

const TIMING_DELAY_KEYWORDS = [
  "later",
  "ne sada",
  "razmislit",
  "will think",
  "not now",
];

const REJECTION_KEYWORDS = [
  "ne treba",
  "ne zanima",
  "ne hvala",
  "not interested",
];

const COMPETITOR_KEYWORDS = [
  "u izradi kod drugog",
  "already working with",
];

const GHOSTED_KEYWORDS = [
  "ghosted",
  "propustio poziv",
  "missed call",
];

// ─── Niche ROI bonuses ─────────────────────────────
const NICHE_ROI_BONUS: Record<string, number> = {
  apartmani: 5,
  dental: 4,
  wellness: 3,
  kozmetika: 3,
};

// ─── Helpers ───────────────────────────────────────

function notesContainAny(notes: string | null, keywords: string[]): boolean {
  if (!notes) return false;
  const lower = notes.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ─── Main scoring function ─────────────────────────

export function calculateLeadScore(
  lead: Lead,
  enrichment: LeadEnrichment | null,
  outreachLogs: OutreachLog[],
  allWonLeads: Lead[],
): ScoreBreakdown {
  const reasons: string[] = [];

  // ============================================================
  // ENGAGEMENT (max 40)
  // ============================================================
  let engagement = 0;

  // +15 if status in ('replied', 'call_booked')
  if (lead.status === "replied" || lead.status === "call_booked") {
    engagement += 15;
    reasons.push(
      lead.status === "replied"
        ? "Lead has replied to outreach"
        : "Call booked with lead",
    );
  }

  // +10 if notes contain request keywords
  if (notesContainAny(lead.notes, ENGAGEMENT_REQUEST_KEYWORDS)) {
    engagement += 10;
    reasons.push("Lead has shown explicit interest (requested info/demo)");
  }

  // +8 if outreach_log has type 'call' or 'demo'
  const hasCallOrDemo = outreachLogs.some(
    (log) => log.type === "call" || log.type === "demo",
  );
  if (hasCallOrDemo) {
    engagement += 8;
    reasons.push("Direct call or demo interaction logged");
  }

  // +5 if status = 'demo_built'
  if (lead.status === "demo_built") {
    engagement += 5;
    reasons.push("Demo site has been built for this lead");
  }

  // +2 if multiple outreach entries exist (count > 1)
  if (outreachLogs.length > 1) {
    engagement += 2;
    reasons.push("Multiple outreach touchpoints recorded");
  }

  engagement = clamp(engagement, 0, 40);

  // ============================================================
  // BUSINESS (max 30)
  // ============================================================
  let business = 0;

  // +10 if google_rating >= 4.5
  if (enrichment?.google_rating != null && enrichment.google_rating >= 4.5) {
    business += 10;
    reasons.push(`High Google rating (${enrichment.google_rating})`);
  }

  // +5 if google_reviews >= 50
  if (
    enrichment?.google_reviews_count != null &&
    enrichment.google_reviews_count >= 50
  ) {
    business += 5;
    reasons.push(
      `Strong review presence (${enrichment.google_reviews_count} reviews)`,
    );
  }

  // +5 if page_speed < 30 OR no website
  if (lead.page_speed != null && lead.page_speed < 30) {
    business += 5;
    reasons.push(`Poor page speed (${lead.page_speed}) — strong upgrade case`);
  } else if (!lead.website_url) {
    // handled below separately
  }

  // +5 if no website_url at all
  if (!lead.website_url) {
    business += 5;
    reasons.push("No website — greenfield opportunity");
  }

  // +5 if high-ROI niche
  const nicheBonus = lead.niche ? (NICHE_ROI_BONUS[lead.niche] ?? 0) : 0;
  if (nicheBonus > 0) {
    business += nicheBonus;
    reasons.push(`High-ROI niche: ${lead.niche} (+${nicheBonus})`);
  }

  business = clamp(business, 0, 30);

  // ============================================================
  // TIMING (max 20)
  // ============================================================
  let timing = 0;

  // +10 if seasonal (apartmani niche AND current month is 3-6 inclusive)
  const currentMonth = new Date().getMonth() + 1; // 1-indexed
  if (lead.niche === "apartmani" && currentMonth >= 3 && currentMonth <= 6) {
    timing += 10;
    reasons.push(
      "Peak season timing — apartmani leads convert best before summer",
    );
  }

  // +5 if notes contain timing delay words
  if (notesContainAny(lead.notes, TIMING_DELAY_KEYWORDS)) {
    timing += 5;
    reasons.push("Lead indicated timing hesitation (may need nurturing)");
  }

  // +5 if follow_up_count < 3
  if (lead.follow_up_count < 3) {
    timing += 5;
    reasons.push("Still early in follow-up cycle — room to engage");
  }

  timing = clamp(timing, 0, 20);

  // ============================================================
  // NEGATIVE (subtracted from total)
  // ============================================================
  let negative = 0;

  // -20 if notes contain rejection
  if (notesContainAny(lead.notes, REJECTION_KEYWORDS)) {
    negative += 20;
    reasons.push("Lead explicitly rejected the offer");
  }

  // -15 if notes contain competitor
  if (notesContainAny(lead.notes, COMPETITOR_KEYWORDS)) {
    negative += 15;
    reasons.push("Lead is already working with a competitor");
  }

  // -5 per unanswered follow-up after 2nd
  if (lead.follow_up_count > 2) {
    const penalty = 5 * (lead.follow_up_count - 2);
    negative += penalty;
    reasons.push(
      `${lead.follow_up_count - 2} unanswered follow-up(s) after 2nd attempt (-${penalty})`,
    );
  }

  // -10 for 4+ contacts with zero response
  const nonResponseStatuses = ["replied", "call_booked", "won"];
  if (
    lead.follow_up_count >= 4 &&
    !nonResponseStatuses.includes(lead.status)
  ) {
    negative += 10;
    reasons.push("4+ contact attempts with no response");
  }

  // -5 if notes contain ghosted / missed call
  if (notesContainAny(lead.notes, GHOSTED_KEYWORDS)) {
    negative += 5;
    reasons.push("Lead appears to have ghosted or missed calls");
  }

  // ============================================================
  // TOTAL & RECOMMENDATION
  // ============================================================
  const rawTotal = engagement + business + timing - negative;
  const total = Math.max(0, rawTotal);

  let recommendation: ScoreRecommendation;
  if (total >= 70) {
    recommendation = "close_now";
  } else if (total >= 50) {
    recommendation = "pursue";
  } else if (total >= 30) {
    recommendation = "nurture";
  } else {
    recommendation = "drop";
  }

  // ============================================================
  // SIMILAR WON LEADS
  // ============================================================
  const similarWonLeads = lead.niche
    ? allWonLeads
        .filter((won) => won.niche === lead.niche && won.id !== lead.id)
        .map((won) => ({
          id: won.id,
          business_name: won.business_name,
          niche: won.niche ?? "ostalo",
        }))
    : [];

  // ============================================================
  // BUILD RECOMMENDATION REASON
  // ============================================================
  const recommendationLabels: Record<ScoreRecommendation, string> = {
    close_now: "High-priority close opportunity",
    pursue: "Active pursuit recommended",
    nurture: "Keep warm, nurture over time",
    drop: "Low probability — consider deprioritizing",
  };

  const topReasons = reasons.slice(0, 4).join(". ");
  const recommendation_reason = `${recommendationLabels[recommendation]}. ${topReasons}.`;

  return {
    total_score: total,
    engagement_score: engagement,
    business_score: business,
    timing_score: timing,
    negative_score: negative,
    recommendation,
    recommendation_reason,
    similar_won_leads: similarWonLeads,
  };
}
