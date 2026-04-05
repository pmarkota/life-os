import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Deadline, DeadlineType, Priority } from "@/types";

const VALID_TYPES: DeadlineType[] = ["exam", "project", "assignment"];
const VALID_PRIORITIES: Priority[] = ["low", "medium", "high", "critical"];

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/university/deadlines/[id] — Get single deadline by ID
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("deadlines")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Deadline not found" },
          { status: 404 },
        );
      }
      console.error("Supabase error fetching deadline:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as Deadline);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PATCH /api/university/deadlines/[id] — Update deadline fields
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
      updateFields.type !== null &&
      !VALID_TYPES.includes(updateFields.type as DeadlineType)
    ) {
      return NextResponse.json(
        { error: "type must be 'exam', 'project', or 'assignment'" },
        { status: 400 },
      );
    }

    // Validate priority if provided
    if (
      updateFields.priority !== undefined &&
      !VALID_PRIORITIES.includes(updateFields.priority as Priority)
    ) {
      return NextResponse.json(
        { error: "priority must be 'low', 'medium', 'high', or 'critical'" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("deadlines")
      .update(updateFields)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Deadline not found" },
          { status: 404 },
        );
      }
      console.error("Supabase error updating deadline:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as Deadline);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/university/deadlines/[id] — Delete deadline
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

    // Check if the deadline exists
    const { data: existing, error: fetchError } = await supabase
      .from("deadlines")
      .select("id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "Deadline not found" },
        { status: 404 },
      );
    }

    const { error } = await supabase.from("deadlines").delete().eq("id", id);

    if (error) {
      console.error("Supabase error deleting deadline:", error);
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
