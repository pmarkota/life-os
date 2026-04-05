import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Client } from "@/types";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/clients/[id] — Get single client by ID
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Client not found" },
          { status: 404 },
        );
      }
      console.error("Supabase error fetching client:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as Client);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PATCH /api/clients/[id] — Update client fields
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

    // Validate mrr if provided
    if (
      updateFields.mrr !== undefined &&
      (typeof updateFields.mrr !== "number" ||
        (updateFields.mrr as number) < 0)
    ) {
      return NextResponse.json(
        { error: "mrr must be a non-negative number" },
        { status: 400 },
      );
    }

    // Validate status if provided
    const validStatuses = ["active", "paused", "churned"];
    if (
      updateFields.status !== undefined &&
      !validStatuses.includes(updateFields.status as string)
    ) {
      return NextResponse.json(
        { error: "status must be 'active', 'paused', or 'churned'" },
        { status: 400 },
      );
    }

    // Validate plan if provided
    const validPlans = ["basic_79", "standard_99", "custom"];
    if (
      updateFields.plan !== undefined &&
      updateFields.plan !== null &&
      !validPlans.includes(updateFields.plan as string)
    ) {
      return NextResponse.json(
        { error: "plan must be 'basic_79', 'standard_99', or 'custom'" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("clients")
      .update(updateFields)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Client not found" },
          { status: 404 },
        );
      }
      console.error("Supabase error updating client:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as Client);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/clients/[id] — Delete client
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

    // Check if the client exists
    const { data: existing, error: fetchError } = await supabase
      .from("clients")
      .select("id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 },
      );
    }

    const { error } = await supabase.from("clients").delete().eq("id", id);

    if (error) {
      console.error("Supabase error deleting client:", error);
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
