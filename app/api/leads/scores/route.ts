import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ─── GET /api/leads/scores — List lead scores with joined lead data ─
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = request.nextUrl;

    // Build query — join lead_scores with leads
    let query = supabase
      .from("lead_scores")
      .select("*, leads!inner(*)");

    // Filter by recommendation
    const recommendation = searchParams.get("recommendation");
    if (recommendation) {
      query = query.eq("recommendation", recommendation);
    }

    // Filter by minimum score
    const minScore = searchParams.get("min_score");
    if (minScore) {
      const minVal = parseInt(minScore, 10);
      if (!isNaN(minVal)) {
        query = query.gte("total_score", minVal);
      }
    }

    // Order by total_score descending
    query = query.order("total_score", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("Supabase error fetching scores:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Reshape data to flatten the join
    const shaped = (data ?? []).map((row: Record<string, unknown>) => {
      const { leads, ...score } = row;
      return {
        ...score,
        lead: leads,
      };
    });

    return NextResponse.json(shaped);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
