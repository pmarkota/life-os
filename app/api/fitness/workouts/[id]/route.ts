import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Workout, WorkoutType, Exercise } from "@/types";

const VALID_TYPES: WorkoutType[] = ["push", "pull", "legs"];

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/fitness/workouts/[id] — Get single workout by ID
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("workouts")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Workout not found" },
          { status: 404 },
        );
      }
      console.error("Supabase error fetching workout:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as Workout);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PATCH /api/fitness/workouts/[id] — Update workout fields
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Remove fields that shouldn't be manually updated
    const {
      id: _id,
      user_id: _userId,
      ...updateFields
    } = body as Record<string, unknown>;

    // Validate type if provided
    if (
      updateFields.type !== undefined &&
      !VALID_TYPES.includes(updateFields.type as WorkoutType)
    ) {
      return NextResponse.json(
        { error: "type must be 'push', 'pull', or 'legs'" },
        { status: 400 },
      );
    }

    // Validate exercises if provided
    if (updateFields.exercises !== undefined) {
      if (!Array.isArray(updateFields.exercises)) {
        return NextResponse.json(
          { error: "exercises must be an array" },
          { status: 400 },
        );
      }

      for (const exercise of updateFields.exercises as Exercise[]) {
        if (!exercise.name || typeof exercise.name !== "string") {
          return NextResponse.json(
            { error: "Each exercise must have a name" },
            { status: 400 },
          );
        }
      }
    }

    const { data, error } = await supabase
      .from("workouts")
      .update(updateFields)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Workout not found" },
          { status: 404 },
        );
      }
      console.error("Supabase error updating workout:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as Workout);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/fitness/workouts/[id] — Delete workout
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if the workout exists
    const { data: existing, error: fetchError } = await supabase
      .from("workouts")
      .select("id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "Workout not found" },
        { status: 404 },
      );
    }

    const { error } = await supabase.from("workouts").delete().eq("id", id);

    if (error) {
      console.error("Supabase error deleting workout:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
