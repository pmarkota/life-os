import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Finance } from "@/types";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/finance/[id] — Get single transaction by ID
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("finances")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Transaction not found" },
          { status: 404 },
        );
      }
      console.error("Supabase error fetching transaction:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as Finance);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PATCH /api/finance/[id] — Update transaction fields
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
      updateFields.type !== "income" &&
      updateFields.type !== "expense"
    ) {
      return NextResponse.json(
        { error: "type must be 'income' or 'expense'" },
        { status: 400 },
      );
    }

    // Validate amount if provided
    if (
      updateFields.amount !== undefined &&
      (typeof updateFields.amount !== "number" ||
        (updateFields.amount as number) <= 0)
    ) {
      return NextResponse.json(
        { error: "amount must be a positive number" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("finances")
      .update(updateFields)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Transaction not found" },
          { status: 404 },
        );
      }
      console.error("Supabase error updating transaction:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as Finance);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/finance/[id] — Delete transaction
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

    // Check if the transaction exists
    const { data: existing, error: fetchError } = await supabase
      .from("finances")
      .select("id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    const { error } = await supabase.from("finances").delete().eq("id", id);

    if (error) {
      console.error("Supabase error deleting transaction:", error);
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
