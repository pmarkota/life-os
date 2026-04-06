import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteParams = { params: Promise<{ id: string }> };

// ─── Calculate next follow-up date ────────────────────
function calculateNextFollowUp(
  newFollowUpCount: number,
): string | null {
  const now = new Date();

  if (newFollowUpCount < 2) {
    // +3 days
    now.setDate(now.getDate() + 3);
    return now.toISOString().slice(0, 10);
  }
  if (newFollowUpCount < 3) {
    // +7 days
    now.setDate(now.getDate() + 7);
    return now.toISOString().slice(0, 10);
  }
  if (newFollowUpCount < 4) {
    // +14 days
    now.setDate(now.getDate() + 14);
    return now.toISOString().slice(0, 10);
  }
  // >= 4: null (suggest marking as lost)
  return null;
}

// POST /api/outreach/queue/[id]/send — Mark as sent, log outreach, update lead
export async function POST(
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

    // Fetch the queue item with joined lead data
    const { data: queueItem, error: fetchError } = await supabase
      .from("outreach_queue")
      .select("*, lead:leads(*)")
      .eq("id", id)
      .single();

    if (fetchError || !queueItem) {
      console.error("Error fetching queue item:", fetchError);
      return NextResponse.json(
        { error: "Queue item not found" },
        { status: 404 },
      );
    }

    // Cannot send items that are already sent or skipped
    if (queueItem.status === "sent") {
      return NextResponse.json(
        { error: "Item already sent" },
        { status: 400 },
      );
    }

    if (queueItem.status === "skipped") {
      return NextResponse.json(
        { error: "Item was skipped" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const lead = queueItem.lead as Record<string, unknown> | null;
    const currentFollowUpCount =
      (lead?.follow_up_count as number | null) ?? 0;
    const newFollowUpCount = currentFollowUpCount + 1;
    const nextFollowUp = calculateNextFollowUp(newFollowUpCount);

    // 1. Update queue item: mark as sent
    const { error: updateQueueError } = await supabase
      .from("outreach_queue")
      .update({
        status: "sent",
        sent_at: now,
      })
      .eq("id", id);

    if (updateQueueError) {
      console.error("Error marking queue item as sent:", updateQueueError);
      return NextResponse.json(
        { error: updateQueueError.message },
        { status: 500 },
      );
    }

    // 2. Create outreach_log entry
    const { error: logError } = await supabase
      .from("outreach_log")
      .insert({
        user_id: user.id,
        lead_id: queueItem.lead_id,
        type: "follow_up" as const,
        content: queueItem.message,
        sent_at: now,
        response_received: false,
        channel: queueItem.channel ?? null,
        direction: "outbound",
      });

    if (logError) {
      console.error("Error creating outreach log:", logError);
      // Don't fail — queue item already marked as sent
    }

    // 3. Update lead: last_contacted_at, follow_up_count, next_follow_up
    const leadUpdate: Record<string, unknown> = {
      last_contacted_at: now,
      follow_up_count: newFollowUpCount,
      updated_at: now,
    };

    if (nextFollowUp) {
      leadUpdate.next_follow_up = nextFollowUp;
    } else {
      leadUpdate.next_follow_up = null;
    }

    const { error: leadError } = await supabase
      .from("leads")
      .update(leadUpdate)
      .eq("id", queueItem.lead_id);

    if (leadError) {
      console.error("Error updating lead:", leadError);
      // Don't fail — queue item already marked as sent
    }

    // Fetch updated queue item with lead
    const { data: updatedItem } = await supabase
      .from("outreach_queue")
      .select("*, lead:leads(*)")
      .eq("id", id)
      .single();

    return NextResponse.json({
      ...(updatedItem ?? queueItem),
      lead: updatedItem?.lead ?? undefined,
      next_follow_up: nextFollowUp,
      suggest_lost: nextFollowUp === null,
    });
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
