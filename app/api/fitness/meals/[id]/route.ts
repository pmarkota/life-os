import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Meal, MealType } from "@/types";

const VALID_MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/fitness/meals/[id] — Get single meal by ID
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("meals")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Meal not found" },
          { status: 404 },
        );
      }
      console.error("Supabase error fetching meal:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as Meal);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PATCH /api/fitness/meals/[id] — Update meal fields
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

    // Validate meal_type if provided
    if (
      updateFields.meal_type !== undefined &&
      !VALID_MEAL_TYPES.includes(updateFields.meal_type as MealType)
    ) {
      return NextResponse.json(
        {
          error:
            "meal_type must be 'breakfast', 'lunch', 'dinner', or 'snack'",
        },
        { status: 400 },
      );
    }

    // Validate description if provided
    if (
      updateFields.description !== undefined &&
      (typeof updateFields.description !== "string" ||
        (updateFields.description as string).trim() === "")
    ) {
      return NextResponse.json(
        { error: "description cannot be empty" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("meals")
      .update(updateFields)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Meal not found" },
          { status: 404 },
        );
      }
      console.error("Supabase error updating meal:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as Meal);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/fitness/meals/[id] — Delete meal
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

    // Check if the meal exists
    const { data: existing, error: fetchError } = await supabase
      .from("meals")
      .select("id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "Meal not found" },
        { status: 404 },
      );
    }

    const { error } = await supabase.from("meals").delete().eq("id", id);

    if (error) {
      console.error("Supabase error deleting meal:", error);
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
