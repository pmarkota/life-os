import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Meal, MealType } from "@/types";

const VALID_MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

// GET /api/fitness/meals — List meals with optional filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = request.nextUrl;

    let query = supabase.from("meals").select("*");

    // Filter by exact date
    const date = searchParams.get("date");
    if (date) {
      query = query.eq("date", date);
    }

    // Filter by meal type
    const mealType = searchParams.get("meal_type");
    if (mealType && VALID_MEAL_TYPES.includes(mealType as MealType)) {
      query = query.eq("meal_type", mealType);
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

    // Sort
    const sort = searchParams.get("sort") || "date";
    const order = searchParams.get("order") || "desc";
    query = query.order(sort, { ascending: order === "asc" });

    const { data, error } = await query;

    if (error) {
      console.error("Supabase error listing meals:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as Meal[]);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/fitness/meals — Log a new meal
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
    if (
      !body.description ||
      typeof body.description !== "string" ||
      body.description.trim() === ""
    ) {
      return NextResponse.json(
        { error: "description is required" },
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
      description: body.description.trim(),
      date: body.date,
    };

    // Optional fields
    if (
      body.meal_type !== undefined &&
      VALID_MEAL_TYPES.includes(body.meal_type)
    ) {
      insertData.meal_type = body.meal_type;
    }

    if (body.calories_approx !== undefined) {
      insertData.calories_approx = body.calories_approx;
    }

    if (body.protein_g !== undefined) {
      insertData.protein_g = body.protein_g;
    }

    if (body.source !== undefined) {
      insertData.source = body.source;
    }

    const { data, error } = await supabase
      .from("meals")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Supabase error creating meal:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as Meal, { status: 201 });
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
