import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { LeadEnrichment } from "@/types";

// POST /api/leads/bulk-enrich — Enrich multiple leads by status
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const status = (body.status as string) || "new";
    const limit = Math.min(Math.max(1, body.limit ?? 20), 50);
    const force = body.force === true;

    // Get leads matching criteria
    let query = supabase
      .from("leads")
      .select("id, business_name, website_url")
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(limit);

    // If not forcing, only get leads without enrichment
    if (!force) {
      query = query.is("last_enriched_at", null);
    }

    const { data: leads, error: leadsError } = await query;

    if (leadsError) {
      console.error("Supabase error fetching leads:", leadsError);
      return NextResponse.json(
        { error: leadsError.message },
        { status: 500 },
      );
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({
        message: "No leads to enrich",
        total: 0,
        results: [],
      });
    }

    // Enrich each lead sequentially to avoid rate limits
    const results: Array<{
      lead_id: string;
      business_name: string;
      success: boolean;
      enrichment?: LeadEnrichment;
      error?: string;
    }> = [];

    for (const lead of leads) {
      try {
        // Call the individual enrich endpoint internally
        // We construct the URL from the request to handle different environments
        const baseUrl = request.nextUrl.origin;
        const enrichUrl = `${baseUrl}/api/leads/${lead.id}/enrich`;

        const enrichRes = await fetch(enrichUrl, {
          method: "POST",
          headers: {
            cookie: request.headers.get("cookie") ?? "",
          },
        });

        if (enrichRes.ok) {
          const enrichment: LeadEnrichment = await enrichRes.json();
          results.push({
            lead_id: lead.id,
            business_name: lead.business_name,
            success: true,
            enrichment,
          });
        } else {
          const errorData = await enrichRes.json().catch(() => ({}));
          results.push({
            lead_id: lead.id,
            business_name: lead.business_name,
            success: false,
            error: (errorData as { error?: string }).error ?? "Enrichment failed",
          });
        }
      } catch (err) {
        results.push({
          lead_id: lead.id,
          business_name: lead.business_name,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      message: `Enriched ${successCount} of ${results.length} leads${failCount > 0 ? ` (${failCount} failed)` : ""}`,
      total: results.length,
      success_count: successCount,
      fail_count: failCount,
      results,
    });
  } catch (error) {
    console.error("Bulk enrich route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
