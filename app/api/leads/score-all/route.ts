import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateLeadScore } from "@/lib/scoring/engine";
import type {
  Lead,
  LeadEnrichment,
  LeadScore,
  OutreachLog,
  ScoreRecommendation,
} from "@/types";

// ─── POST /api/leads/score-all — Score all leads (optionally filtered by status) ─
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse optional status filter
    let statusFilter: string | null = null;
    try {
      const body = await request.json();
      if (body?.status && typeof body.status === "string") {
        statusFilter = body.status;
      }
    } catch {
      // No body or invalid JSON — score all leads
    }

    // 1. Fetch leads
    let leadsQuery = supabase.from("leads").select("*");
    if (statusFilter) {
      leadsQuery = leadsQuery.eq("status", statusFilter);
    }
    // Exclude already-won and lost leads from bulk scoring (unless explicitly filtered)
    if (!statusFilter) {
      leadsQuery = leadsQuery.not("status", "in", '("won","lost")');
    }

    const { data: leads, error: leadsError } = await leadsQuery;

    if (leadsError) {
      console.error("Supabase error fetching leads:", leadsError);
      return NextResponse.json(
        { error: leadsError.message },
        { status: 500 },
      );
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({
        scored: 0,
        results: { close_now: [], pursue: [], nurture: [], drop: [] },
      });
    }

    // 2. Fetch all enrichments
    const leadIds = leads.map((l: Lead) => l.id);
    const { data: enrichments } = await supabase
      .from("lead_enrichment")
      .select("*")
      .in("lead_id", leadIds);

    const enrichmentMap = new Map<string, LeadEnrichment>();
    if (enrichments) {
      for (const e of enrichments as LeadEnrichment[]) {
        // Keep the most recent enrichment per lead
        if (
          !enrichmentMap.has(e.lead_id) ||
          e.enriched_at > enrichmentMap.get(e.lead_id)!.enriched_at
        ) {
          enrichmentMap.set(e.lead_id, e);
        }
      }
    }

    // 3. Fetch all outreach logs for these leads
    const { data: allOutreach } = await supabase
      .from("outreach_log")
      .select("*")
      .in("lead_id", leadIds);

    const outreachMap = new Map<string, OutreachLog[]>();
    if (allOutreach) {
      for (const o of allOutreach as OutreachLog[]) {
        const existing = outreachMap.get(o.lead_id) ?? [];
        existing.push(o);
        outreachMap.set(o.lead_id, existing);
      }
    }

    // 4. Fetch won leads for similarity
    const { data: wonLeads } = await supabase
      .from("leads")
      .select("*")
      .eq("status", "won");

    // 5. Score each lead
    const results: Record<ScoreRecommendation, Array<LeadScore & { lead: Lead }>> = {
      close_now: [],
      pursue: [],
      nurture: [],
      drop: [],
    };

    const upsertRows: Array<Record<string, unknown>> = [];
    const leadScoreUpdates: Array<{ id: string; score: number }> = [];

    for (const lead of leads as Lead[]) {
      const enrichment = enrichmentMap.get(lead.id) ?? null;
      const outreach = outreachMap.get(lead.id) ?? [];

      const scoreResult = calculateLeadScore(
        lead,
        enrichment,
        outreach,
        (wonLeads as Lead[]) ?? [],
      );

      const row = {
        lead_id: lead.id,
        total_score: scoreResult.total_score,
        engagement_score: scoreResult.engagement_score,
        business_score: scoreResult.business_score,
        timing_score: scoreResult.timing_score,
        negative_score: scoreResult.negative_score,
        recommendation: scoreResult.recommendation,
        recommendation_reason: scoreResult.recommendation_reason,
        similar_won_leads: scoreResult.similar_won_leads,
        scored_at: new Date().toISOString(),
      };

      upsertRows.push(row);
      leadScoreUpdates.push({ id: lead.id, score: scoreResult.total_score });

      results[scoreResult.recommendation].push({
        ...row,
        id: "", // Will be filled by upsert response
        lead,
      } as LeadScore & { lead: Lead });
    }

    // 6. Bulk upsert scores
    const { error: upsertError } = await supabase
      .from("lead_scores")
      .upsert(upsertRows, { onConflict: "lead_id" });

    if (upsertError) {
      console.error("Supabase error bulk upserting scores:", upsertError);
      return NextResponse.json(
        { error: upsertError.message },
        { status: 500 },
      );
    }

    // 7. Update lead_score on each lead
    for (const update of leadScoreUpdates) {
      await supabase
        .from("leads")
        .update({
          lead_score: update.score,
          updated_at: new Date().toISOString(),
        })
        .eq("id", update.id);
    }

    // Sort each group by score descending
    for (const key of Object.keys(results) as ScoreRecommendation[]) {
      results[key].sort((a, b) => b.total_score - a.total_score);
    }

    return NextResponse.json({
      scored: leads.length,
      results,
    });
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
