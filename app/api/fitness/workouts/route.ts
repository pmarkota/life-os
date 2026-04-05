import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Workout, WorkoutType, Exercise } from "@/types";

const VALID_TYPES: WorkoutType[] = ["push", "pull", "legs"];

// GET /api/fitness/workouts — List workouts with optional filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = request.nextUrl;

    let query = supabase.from("workouts").select("*");

    // Filter by workout type
    const type = searchParams.get("type");
    if (type && VALID_TYPES.includes(type as WorkoutType)) {
      query = query.eq("type", type);
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
      console.error("Supabase error listing workouts:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as Workout[]);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/fitness/workouts — Log a new workout
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
        { error: "type is required and must be 'push', 'pull', or 'legs'" },
        { status: 400 },
      );
    }

    if (!body.date || typeof body.date !== "string") {
      return NextResponse.json(
        { error: "date is required (YYYY-MM-DD format)" },
        { status: 400 },
      );
    }

    // Validate exercises array if provided
    if (body.exercises !== undefined) {
      if (!Array.isArray(body.exercises)) {
        return NextResponse.json(
          { error: "exercises must be an array" },
          { status: 400 },
        );
      }

      for (const exercise of body.exercises as Exercise[]) {
        if (!exercise.name || typeof exercise.name !== "string") {
          return NextResponse.json(
            { error: "Each exercise must have a name" },
            { status: 400 },
          );
        }
      }
    }

    const insertData: Record<string, unknown> = {
      user_id: user.id,
      type: body.type,
      date: body.date,
      exercises: body.exercises ?? [],
    };

    // Optional fields
    if (body.duration_minutes !== undefined) {
      insertData.duration_minutes = body.duration_minutes;
    }

    if (body.notes !== undefined) {
      insertData.notes = body.notes;
    }

    const { data, error } = await supabase
      .from("workouts")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Supabase error creating workout:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as Workout, { status: 201 });
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
