import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface LeadToSave {
  business_name: string;
  location: string;
  phone: string | null;
  website_url: string | null;
  email: string | null;
  instagram: string | null;
  market: string;
  niche: string;
  channel: string;
  page_speed: number | null;
  message: string;
  rating: number | null;
  reviews: number | null;
  web_status: string;
  notes: string | null;
}

// POST /api/leadgen/save-leads — Bulk save leads to CRM
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { leads } = (await request.json()) as { leads: LeadToSave[] };
    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json(
        { error: "No leads provided" },
        { status: 400 },
      );
    }

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const lead of leads) {
      // Map niche to match existing LeadNiche type where possible
      const nicheMap: Record<string, string> = {
        salon: "frizer",
        barbershop: "frizer",
        restaurant: "restoran",
        veterinary: "ostalo",
        tattoo: "ostalo",
        photographer: "ostalo",
        realtor: "ostalo",
        lawyer: "ostalo",
        other: "ostalo",
        luxury_villa: "apartmani",
        charter: "ostalo",
        boutique_hotel: "apartmani",
      };

      const mappedNiche = nicheMap[lead.niche] ?? lead.niche;

      const notes = [
        lead.notes,
        lead.rating !== null ? `Google: ${lead.rating}★` : null,
        lead.reviews !== null ? `${lead.reviews} reviews` : null,
        lead.web_status ? `Web: ${lead.web_status}` : null,
      ]
        .filter(Boolean)
        .join(" | ");

      const { error } = await supabase.from("leads").insert({
        user_id: user.id,
        business_name: lead.business_name,
        location: lead.location,
        phone: lead.phone,
        website_url: lead.website_url,
        email: lead.email,
        instagram: lead.instagram,
        niche: mappedNiche,
        market: lead.market === "uk" ? "us" : lead.market,
        channel: lead.channel,
        page_speed: lead.page_speed,
        first_message: lead.message,
        notes,
        status: "new",
        source: "leadgen",
        first_contact: null,
      });

      if (error) {
        failCount++;
        errors.push(`${lead.business_name}: ${error.message}`);
      } else {
        successCount++;
      }
    }

    return NextResponse.json({
      success: successCount,
      failed: failCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Save leads error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
