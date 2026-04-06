import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { OutreachQueueStatus } from "@/types";

type RouteParams = { params: Promise<{ id: string }> };

const VALID_STATUSES: OutreachQueueStatus[] = [
  "pending",
  "approved",
  "sent",
  "skipped",
];

// PATCH /api/outreach/queue/[id] — Update queue item (approve, edit message, skip)
export async function PATCH(
  request: NextRequest,
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

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    // Update status
    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json(
          {
            error: `status must be one of: ${VALID_STATUSES.join(", ")}`,
          },
          { status: 400 },
        );
      }
      updateData.status = body.status;
    }

    // Update message
    if (body.message !== undefined) {
      if (typeof body.message !== "string" || body.message.trim() === "") {
        return NextResponse.json(
          { error: "message must be a non-empty string" },
          { status: 400 },
        );
      }
      updateData.message = body.message.trim();
    }

    // Update channel
    if (body.channel !== undefined) {
      updateData.channel = body.channel;
    }

    // Update notes
    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("outreach_queue")
      .update(updateData)
      .eq("id", id)
      .select("*, lead:leads(*)")
      .single();

    if (error) {
      console.error("Supabase error updating queue item:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: "Queue item not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ...data,
      lead: data.lead ?? undefined,
    });
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
