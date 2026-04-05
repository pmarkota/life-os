import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Finance, FinanceType } from "@/types";

const VALID_TYPES: FinanceType[] = ["income", "expense"];

// GET /api/finance — List transactions with filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = request.nextUrl;

    let query = supabase.from("finances").select("*");

    // Filter by type (income or expense)
    const type = searchParams.get("type");
    if (type && VALID_TYPES.includes(type as FinanceType)) {
      query = query.eq("type", type);
    }

    // Filter by source (comma-separated)
    const source = searchParams.get("source");
    if (source) {
      const sources = source.split(",").map((s) => s.trim());
      query = query.in("source", sources);
    }

    // Filter by category (comma-separated)
    const category = searchParams.get("category");
    if (category) {
      const categories = category.split(",").map((c) => c.trim());
      query = query.in("category", categories);
    }

    // Filter by date range
    const from = searchParams.get("from");
    if (from) {
      query = query.gte("date", from);
    }

    const to = searchParams.get("to");
    if (to) {
      query = query.lte("date", to);
    }

    // Filter recurring only
    const recurring = searchParams.get("recurring");
    if (recurring === "true") {
      query = query.eq("recurring", true);
    } else if (recurring === "false") {
      query = query.eq("recurring", false);
    }

    // Sort
    const sort = searchParams.get("sort") || "date";
    const order = searchParams.get("order") || "desc";
    query = query.order(sort, { ascending: order === "asc" });

    const { data, error } = await query;

    if (error) {
      console.error("Supabase error listing finances:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as Finance[]);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/finance — Create a new transaction
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

    // Validate required fields
    if (!body.type || !VALID_TYPES.includes(body.type)) {
      return NextResponse.json(
        { error: "type is required and must be 'income' or 'expense'" },
        { status: 400 },
      );
    }

    if (body.amount === undefined || body.amount === null || typeof body.amount !== "number" || body.amount <= 0) {
      return NextResponse.json(
        { error: "amount is required and must be a positive number" },
        { status: 400 },
      );
    }

    if (!body.date || typeof body.date !== "string") {
      return NextResponse.json(
        { error: "date is required (YYYY-MM-DD format)" },
        { status: 400 },
      );
    }

    const insertData: Record<string, unknown> = {
      user_id: user.id,
      type: body.type,
      amount: body.amount,
      date: body.date,
      recurring: body.recurring ?? false,
    };

    // Optional fields
    const optionalFields = ["source", "category", "description"] as const;

    for (const field of optionalFields) {
      if (body[field] !== undefined) {
        insertData[field] = body[field];
      }
    }

    const { data, error } = await supabase
      .from("finances")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Supabase error creating finance record:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as Finance, { status: 201 });
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
