import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Lead } from "@/types";

// GET /api/leads — List leads with optional filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = request.nextUrl;

    let query = supabase.from("leads").select("*");

    // Filter by status (comma-separated)
    const status = searchParams.get("status");
    if (status) {
      const statuses = status.split(",").map((s) => s.trim());
      query = query.in("status", statuses);
    }

    // Filter by niche (comma-separated)
    const niche = searchParams.get("niche");
    if (niche) {
      const niches = niche.split(",").map((n) => n.trim());
      query = query.in("niche", niches);
    }

    // Filter by channel (comma-separated)
    const channel = searchParams.get("channel");
    if (channel) {
      const channels = channel.split(",").map((c) => c.trim());
      query = query.in("channel", channels);
    }

    // Filter by market (comma-separated)
    const market = searchParams.get("market");
    if (market) {
      const markets = market.split(",").map((m) => m.trim());
      query = query.in("market", markets);
    }

    // Filter by location (partial match, case insensitive)
    const location = searchParams.get("location");
    if (location) {
      query = query.ilike("location", `%${location}%`);
    }

    // Search by business_name (partial match, case insensitive)
    const search = searchParams.get("search");
    if (search) {
      query = query.ilike("business_name", `%${search}%`);
    }

    // Sort
    const sort = searchParams.get("sort") || "created_at";
    const order = searchParams.get("order") || "desc";
    query = query.order(sort, { ascending: order === "asc" });

    const { data, error } = await query;

    if (error) {
      console.error("Supabase error listing leads:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as Lead[]);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/leads — Create a new lead
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

    if (!body.business_name || typeof body.business_name !== "string" || body.business_name.trim() === "") {
      return NextResponse.json(
        { error: "business_name is required" },
        { status: 400 },
      );
    }

    const insertData: Record<string, unknown> = {
      user_id: user.id,
      business_name: body.business_name.trim(),
      status: body.status || "new",
    };

    // Optional fields
    const optionalFields = [
      "contact_name",
      "email",
      "phone",
      "website_url",
      "location",
      "niche",
      "notes",
      "demo_site_url",
      "source",
      "subscription_tier",
      "next_follow_up",
      "instagram",
      "channel",
      "market",
      "first_message",
      "first_contact",
      "page_speed",
    ] as const;

    for (const field of optionalFields) {
      if (body[field] !== undefined) {
        insertData[field] = body[field];
      }
    }

    const { data, error } = await supabase
      .from("leads")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Supabase error creating lead:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as Lead, { status: 201 });
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
