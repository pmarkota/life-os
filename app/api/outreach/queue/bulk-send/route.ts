import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ─── Calculate next follow-up date ────────────────────
function calculateNextFollowUp(
  newFollowUpCount: number,
): string | null {
  const now = new Date();

  if (newFollowUpCount < 2) {
    now.setDate(now.getDate() + 3);
    return now.toISOString().slice(0, 10);
  }
  if (newFollowUpCount < 3) {
    now.setDate(now.getDate() + 7);
    return now.toISOString().slice(0, 10);
  }
  if (newFollowUpCount < 4) {
    now.setDate(now.getDate() + 14);
    return now.toISOString().slice(0, 10);
  }
  return null;
}

// POST /api/outreach/queue/bulk-send — Send multiple approved items
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
    const ids: string[] = body.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "ids must be a non-empty array" },
        { status: 400 },
      );
    }

    // Fetch all queue items with their leads
    const { data: queueItems, error: fetchError } = await supabase
      .from("outreach_queue")
      .select("*, lead:leads(*)")
      .in("id", ids)
      .in("status", ["approved", "pending"]);

    if (fetchError) {
      console.error("Error fetching queue items:", fetchError);
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 },
      );
    }

    if (!queueItems || queueItems.length === 0) {
      return NextResponse.json(
        { error: "No sendable items found with the given IDs" },
        { status: 404 },
      );
    }

    const now = new Date().toISOString();
    let sentCount = 0;
    let failedCount = 0;
    const results: Array<{ id: string; success: boolean; suggest_lost?: boolean }> = [];

    for (const item of queueItems) {
      try {
        const lead = item.lead as Record<string, unknown> | null;
        const currentFollowUpCount =
          (lead?.follow_up_count as number | null) ?? 0;
        const newFollowUpCount = currentFollowUpCount + 1;
        const nextFollowUp = calculateNextFollowUp(newFollowUpCount);

        // 1. Mark queue item as sent
        const { error: updateError } = await supabase
          .from("outreach_queue")
          .update({ status: "sent", sent_at: now })
          .eq("id", item.id);

        if (updateError) {
          failedCount++;
          results.push({ id: item.id, success: false });
          continue;
        }

        // 2. Create outreach_log entry
        await supabase.from("outreach_log").insert({
          user_id: user.id,
          lead_id: item.lead_id,
          type: "follow_up",
          content: item.message,
          sent_at: now,
          response_received: false,
          channel: item.channel ?? null,
          direction: "outbound",
        });

        // 3. Update lead
        const leadUpdate: Record<string, unknown> = {
          last_contacted_at: now,
          follow_up_count: newFollowUpCount,
          updated_at: now,
          next_follow_up: nextFollowUp,
        };

        await supabase
          .from("leads")
          .update(leadUpdate)
          .eq("id", item.lead_id);

        sentCount++;
        results.push({
          id: item.id,
          success: true,
          suggest_lost: nextFollowUp === null,
        });
      } catch {
        failedCount++;
        results.push({ id: item.id, success: false });
      }
    }

    return NextResponse.json({
      message: `Sent ${sentCount} items${failedCount > 0 ? `, ${failedCount} failed` : ""}`,
      sent: sentCount,
      failed: failedCount,
      results,
    });
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
