import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Client } from "@/types";

// GET /api/clients — List clients with optional filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = request.nextUrl;

    let query = supabase.from("clients").select("*");

    // Filter by status
    const status = searchParams.get("status");
    if (status) {
      const statuses = status.split(",").map((s) => s.trim());
      query = query.in("status", statuses);
    }

    // Filter by plan
    const plan = searchParams.get("plan");
    if (plan) {
      const plans = plan.split(",").map((p) => p.trim());
      query = query.in("plan", plans);
    }

    // Search by business_name (partial match, case insensitive)
    const search = searchParams.get("search");
    if (search) {
      query = query.ilike("business_name", `%${search}%`);
    }

    // Sort — default: business_name ascending
    const sort = searchParams.get("sort") || "business_name";
    const order = searchParams.get("order") || "asc";
    query = query.order(sort, { ascending: order === "asc" });

    const { data, error } = await query;

    if (error) {
      console.error("Supabase error listing clients:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as Client[]);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/clients — Create a new client
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

    if (
      !body.business_name ||
      typeof body.business_name !== "string" ||
      body.business_name.trim() === ""
    ) {
      return NextResponse.json(
        { error: "business_name is required" },
        { status: 400 },
      );
    }

    const insertData: Record<string, unknown> = {
      user_id: user.id,
      business_name: body.business_name.trim(),
      status: body.status || "active",
      mrr: body.mrr ?? 0,
    };

    // Optional fields
    const optionalFields = [
      "site_url",
      "plan",
      "started_at",
      "lead_id",
      "notes",
    ] as const;

    for (const field of optionalFields) {
      if (body[field] !== undefined) {
        insertData[field] = body[field];
      }
    }

    const { data, error } = await supabase
      .from("clients")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Supabase error creating client:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as Client, { status: 201 });
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
