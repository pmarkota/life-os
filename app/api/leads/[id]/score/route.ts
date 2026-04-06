import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateLeadScore } from "@/lib/scoring/engine";
import type { Lead, LeadEnrichment, OutreachLog } from "@/types";

type RouteParams = { params: Promise<{ id: string }> };

// ─── GET /api/leads/[id]/score — Get existing score ───
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("lead_scores")
      .select("*")
      .eq("lead_id", id)
      .order("scored_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "No score found for this lead" },
          { status: 404 },
        );
      }
      console.error("Supabase error fetching lead score:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── POST /api/leads/[id]/score — Score a single lead ─
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch lead
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // 2. Fetch enrichment (may not exist)
    const { data: enrichment } = await supabase
      .from("lead_enrichment")
      .select("*")
      .eq("lead_id", id)
      .order("enriched_at", { ascending: false })
      .limit(1)
      .single();

    // 3. Fetch outreach logs
    const { data: outreachLogs } = await supabase
      .from("outreach_log")
      .select("*")
      .eq("lead_id", id)
      .order("sent_at", { ascending: false });

    // 4. Fetch all won leads for similarity matching
    const { data: wonLeads } = await supabase
      .from("leads")
      .select("*")
      .eq("status", "won");

    // 5. Calculate score
    const scoreResult = calculateLeadScore(
      lead as Lead,
      (enrichment as LeadEnrichment) ?? null,
      (outreachLogs as OutreachLog[]) ?? [],
      (wonLeads as Lead[]) ?? [],
    );

    // 6. Upsert into lead_scores
    const { data: scoreRow, error: upsertError } = await supabase
      .from("lead_scores")
      .upsert(
        {
          lead_id: id,
          total_score: scoreResult.total_score,
          engagement_score: scoreResult.engagement_score,
          business_score: scoreResult.business_score,
          timing_score: scoreResult.timing_score,
          negative_score: scoreResult.negative_score,
          recommendation: scoreResult.recommendation,
          recommendation_reason: scoreResult.recommendation_reason,
          similar_won_leads: scoreResult.similar_won_leads,
          scored_at: new Date().toISOString(),
        },
        { onConflict: "lead_id" },
      )
      .select()
      .single();

    if (upsertError) {
      console.error("Supabase error upserting lead score:", upsertError);
      return NextResponse.json(
        { error: upsertError.message },
        { status: 500 },
      );
    }

    // 7. Update leads.lead_score
    const { error: leadUpdateError } = await supabase
      .from("leads")
      .update({
        lead_score: scoreResult.total_score,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (leadUpdateError) {
      console.error(
        "Warning: failed to update lead.lead_score:",
        leadUpdateError,
      );
    }

    return NextResponse.json(scoreRow);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
