import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { LeadEnrichment } from "@/types";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/leads/[id]/enrichment — Get enrichment data for a lead
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("lead_enrichment")
      .select("*")
      .eq("lead_id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No enrichment data found — return null, not an error
        return NextResponse.json(null);
      }
      console.error("Supabase error fetching enrichment:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as LeadEnrichment);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
